import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createHash, randomBytes } from 'node:crypto'
import { diff3Merge } from 'node-diff3'
import { atomicWrite, nowIso, walk } from './util.mjs'
import { resolveSpace } from './spaces.mjs'

/**
 * Live coordination layer.
 *
 * Everything here is expressed as files under `<space>/.live/` so it travels
 * across devices with Syncthing. The directory is dot-prefixed (hidden from
 * the page tree) and every coordination record is written by exactly one
 * writer, which makes these files conflict-free by construction.
 *
 *   .live/versions/<docId>/<sha>.md   content-addressed snapshots
 *   .live/heads/<docId>/<writer>.json last version seen by one writer
 *   .live/base/<docId>.json           shared merge base pointer
 *   .live/locks/<docId>/<lease>.json  edit-right leases
 *   .live/presence/<device>.json      heartbeat
 *   .live/proposals/<docId>/*.json    proposed edits awaiting a human
 */

const LIVE_DIR = '.live'

export function docId(rel) {
  return createHash('sha1').update(String(rel)).digest('hex').slice(0, 16)
}

const livePaths = (root, rel) => {
  const id = docId(rel)
  return {
    id,
    versions: path.join(root, LIVE_DIR, 'versions', id),
    heads: path.join(root, LIVE_DIR, 'heads', id),
    base: path.join(root, LIVE_DIR, 'base', `${id}.json`),
    locks: path.join(root, LIVE_DIR, 'locks', id),
    proposals: path.join(root, LIVE_DIR, 'proposals', id),
  }
}

async function readJson(file, fallback = null) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')) } catch (error) {
    if (error.code === 'ENOENT') return fallback
    return fallback
  }
}

async function writeJson(file, value) {
  await atomicWrite(file, JSON.stringify(value, null, 2) + '\n')
}

const sha256 = (text) => createHash('sha256').update(text).digest('hex')

// ---------------------------------------------------------------------------
// Device identity
// ---------------------------------------------------------------------------

let cachedDevice
export async function localDeviceId(client) {
  if (cachedDevice) return cachedDevice
  try {
    const status = await client.status()
    if (status?.myID) cachedDevice = String(status.myID).slice(0, 7).toUpperCase()
  } catch { /* daemon unavailable; fall through to a process-local id */ }
  if (!cachedDevice) cachedDevice = `local-${randomBytes(3).toString('hex')}`
  return cachedDevice
}

// ---------------------------------------------------------------------------
// Version store + shared merge base
// ---------------------------------------------------------------------------

/**
 * Snapshot the content under its sha256 and advance this writer's head plus
 * the shared base pointer.
 *
 * @returns {Promise<{sha: string, prev: string|null}>}
 */
export async function recordVersion(root, rel, text, { writer = 'local', by = 'human' } = {}) {
  const paths = livePaths(root, rel)
  const sha = sha256(text)
  const versionFile = path.join(paths.versions, `${sha}.md`)
  await fs.mkdir(paths.versions, { recursive: true })
  await fs.writeFile(versionFile, text, { mode: 0o600 }).catch(async (error) => {
    if (error.code === 'EEXIST') return
    throw error
  })

  const headFile = path.join(paths.heads, `${writer}.json`)
  const previous = await readJson(headFile, null)
  const head = { schema: 2, writer, doc: rel, sha, prev: previous?.sha ?? null, by, at: nowIso() }
  await writeJson(headFile, head)
  await writeJson(paths.base, { schema: 2, sha, at: head.at, by })
  return { sha, prev: previous?.sha ?? null }
}

export async function readBase(root, rel) {
  const paths = livePaths(root, rel)
  const pointer = await readJson(paths.base, null)
  if (!pointer?.sha) return null
  const file = path.join(paths.versions, `${pointer.sha}.md`)
  const text = await fs.readFile(file, 'utf8').catch(() => null)
  return text == null ? null : { sha: pointer.sha, text }
}

export async function listVersions(root, rel, { limit = 30 } = {}) {
  const paths = livePaths(root, rel)
  let names
  try { names = await fs.readdir(paths.versions) } catch { return [] }
  const heads = await readHeads(root, rel)
  const byProp = new Map()
  for (const head of heads) byProp.set(`${head.writer}:${head.sha}`, head)
  const rows = []
  for (const name of names) {
    if (!name.endsWith('.md')) continue
    const sha = name.slice(0, -3)
    const full = path.join(paths.versions, name)
    const stat = await fs.stat(full).catch(() => null)
    if (!stat) continue
    rows.push({ sha, size: stat.size, mtimeMs: stat.mtimeMs })
  }
  rows.sort((a, b) => b.mtimeMs - a.mtimeMs)
  const headSha = new Set(heads.map(head => head.sha))
  return rows.slice(0, limit).map(row => ({
    ...row,
    current: headSha.has(row.sha),
    writers: heads.filter(head => head.sha === row.sha).map(head => ({ writer: head.writer, by: head.by, at: head.at })),
  }))
}

export async function readHeads(root, rel) {
  const paths = livePaths(root, rel)
  let names
  try { names = await fs.readdir(paths.heads) } catch { return [] }
  const heads = []
  for (const name of names) {
    if (!name.endsWith('.json')) continue
    const head = await readJson(path.join(paths.heads, name), null)
    if (head?.sha) heads.push(head)
  }
  return heads
}

/**
 * Three-way merge against the shared base. Returns the merged text and the
 * number of conflicts; callers decide whether to write it or hand it to a
 * reviewer.
 */
export function mergeTexts({ base, local, remote }) {
  const merged = diff3Merge(
    String(local ?? '').split(/\r?\n/),
    String(base ?? '').split(/\r?\n/),
    String(remote ?? '').split(/\r?\n/),
    { excludeFalseConflicts: true },
  )
  let conflicts = 0
  const lines = []
  for (const part of merged) {
    if (part.ok) { lines.push(...part.ok); continue }
    conflicts++
    const conflict = part.conflict || part
    lines.push('<<<<<<< local', ...(conflict.a || []), '||||||| base', ...(conflict.o || []), '=======', ...(conflict.b || []), '>>>>>>> remote')
  }
  return { text: lines.join('\n') + '\n', conflicts }
}

// ---------------------------------------------------------------------------
// Edit-right leases
// ---------------------------------------------------------------------------

const DEFAULT_TTL = 90_000

function leaseWinner(leases, now = Date.now()) {
  const live = leases
    .filter(lease => lease && lease.expiresAt && Date.parse(lease.expiresAt) > now)
    .sort((a, b) => (Date.parse(a.acquiredAt) - Date.parse(b.acquiredAt)) || String(a.leaseId).localeCompare(String(b.leaseId)))
  return live[0] ?? null
}

export async function listLeases(root, rel) {
  const paths = livePaths(root, rel)
  let names
  try { names = await fs.readdir(paths.locks) } catch { return [] }
  const leases = []
  for (const name of names) {
    if (!name.endsWith('.json')) continue
    const lease = await readJson(path.join(paths.locks, name), null)
    if (lease?.leaseId) leases.push(lease)
  }
  return leases
}

export async function currentLease(root, rel) {
  return leaseWinner(await listLeases(root, rel))
}

/**
 * Acquire the edit right for one document.
 *
 * Two phases: write our own lease file, give Syncthing a moment to carry it,
 * then read every live lease and apply a total order (`acquiredAt`, then
 * `leaseId`). Losing means deleting our file immediately.
 */
export async function acquireLease(client, config, {
  space, path: rel, holder, label, device, agents = [], ttlMs = DEFAULT_TTL, force = false, settleMs = 1200,
} = {}) {
  const { root } = await resolveSpace(client, space, config)
  const paths = livePaths(root, rel)
  await fs.mkdir(paths.locks, { recursive: true })
  const now = Date.now()
  const leaseId = `${holder}.${randomBytes(4).toString('hex')}`
  const lease = {
    schema: 2,
    leaseId,
    holder,
    device: device || holder,
    label: label || holder,
    doc: rel,
    agents,
    mode: agents.length > 0 ? 'agent' : 'human',
    acquiredAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
    force: Boolean(force),
  }
  const file = path.join(paths.locks, `${leaseId}.json`)
  await writeJson(file, lease)

  // Give the other side a chance to see our intent before deciding.
  if (settleMs > 0) await new Promise(resolve => setTimeout(resolve, settleMs))

  const leases = await listLeases(root, rel)
  const winner = leaseWinner(leases)
  if (!winner || winner.leaseId === leaseId) {
    return { granted: true, lease }
  }
  await fs.rm(file, { force: true })
  return { granted: false, holder: winner.label || winner.holder, expiresAt: winner.expiresAt, lease: winner }
}

export async function renewLease(client, config, { space, path: rel, leaseId, ttlMs = DEFAULT_TTL } = {}) {
  const { root } = await resolveSpace(client, space, config)
  const paths = livePaths(root, rel)
  const file = path.join(paths.locks, `${leaseId}.json`)
  const lease = await readJson(file, null)
  if (!lease) return { renewed: false }
  const next = { ...lease, expiresAt: new Date(Date.now() + ttlMs).toISOString() }
  await writeJson(file, next)
  return { renewed: true, lease: next }
}

export async function releaseLease(client, config, { space, path: rel, leaseId } = {}) {
  const { root } = await resolveSpace(client, space, config)
  const paths = livePaths(root, rel)
  await fs.rm(path.join(paths.locks, `${leaseId}.json`), { force: true })
  return { released: true, leaseId }
}

// ---------------------------------------------------------------------------
// Presence
// ---------------------------------------------------------------------------

export async function writePresence(client, config, { space, device, name, doc, block, mode = 'editing', agent = null, ttlMs = 25_000 } = {}) {
  const { root } = await resolveSpace(client, space, config)
  const dir = path.join(root, LIVE_DIR, 'presence')
  await fs.mkdir(dir, { recursive: true })
  const now = Date.now()
  const value = {
    schema: 2, device, name: name || device, doc: doc || null, block: block || null,
    mode, agent: agent || null, at: new Date(now).toISOString(), expiresAt: new Date(now + ttlMs).toISOString(),
  }
  await writeJson(path.join(dir, `${device}.json`), value)
  return value
}

export async function readPresence(client, config, { space } = {}) {
  const { root } = await resolveSpace(client, space, config)
  const dir = path.join(root, LIVE_DIR, 'presence')
  let names
  try { names = await fs.readdir(dir) } catch { return [] }
  const now = Date.now()
  const rows = []
  for (const name of names) {
    if (!name.endsWith('.json')) continue
    const value = await readJson(path.join(dir, name), null)
    if (!value?.device) continue
    if (value.expiresAt && Date.parse(value.expiresAt) <= now) continue
    rows.push(value)
  }
  return rows.sort((a, b) => String(a.device).localeCompare(String(b.device)))
}

// ---------------------------------------------------------------------------
// Proposals
// ---------------------------------------------------------------------------

export async function createProposal(client, config, { space, path: rel, baseSha, ops, rationale, author }) {
  const { root } = await resolveSpace(client, space, config)
  const paths = livePaths(root, rel)
  await fs.mkdir(paths.proposals, { recursive: true })
  const id = `${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`
  const proposal = {
    schema: 2, id, doc: rel, baseSha: baseSha || null, ops: ops || [],
    rationale: rationale || '', author: author || 'agent',
    status: 'pending', createdAt: nowIso(),
  }
  await writeJson(path.join(paths.proposals, `${id}.json`), proposal)
  return proposal
}

export async function listProposals(client, config, { space, path: rel, status = 'pending' } = {}) {
  const { root } = await resolveSpace(client, space, config)
  const paths = livePaths(root, rel)
  let names
  try { names = await fs.readdir(paths.proposals) } catch { return [] }
  const rows = []
  for (const name of names) {
    if (!name.endsWith('.json')) continue
    const value = await readJson(path.join(paths.proposals, name), null)
    if (!value?.id) continue
    if (status !== 'all' && value.status !== status) continue
    rows.push(value)
  }
  return rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
}

export async function updateProposal(client, config, { space, path: rel, id, status }) {
  const { root } = await resolveSpace(client, space, config)
  const paths = livePaths(root, rel)
  const file = path.join(paths.proposals, `${id}.json`)
  const proposal = await readJson(file, null)
  if (!proposal) return null
  const next = { ...proposal, status, resolvedAt: nowIso() }
  await writeJson(file, next)
  return next
}

// ---------------------------------------------------------------------------
// Watchers + in-process event subscribers
// ---------------------------------------------------------------------------

const spaces = new Map() // spaceId -> { root, subs: Set, stop: () => void }

function ensureSpace(spaceId, root) {
  let entry = spaces.get(spaceId)
  if (entry) return entry
  entry = { root, subs: new Set(), stop: null }
  spaces.set(spaceId, entry)
  return entry
}

/** Broadcast one event to every SSE subscriber of a space. */
export function broadcast(spaceId, event) {
  const entry = spaces.get(spaceId)
  if (!entry) return 0
  let sent = 0
  for (const send of entry.subs) {
    try { send(event); sent++ } catch { /* subscriber went away */ }
  }
  return sent
}

export function subscribe(spaceId, send) {
  const entry = spaces.get(spaceId)
  if (!entry) return () => {}
  entry.subs.add(send)
  return () => { entry.subs.delete(send) }
}

/**
 * Watch a space root so remote (Syncthing-applied) changes reach SSE
 * subscribers. Falls back to periodic stat polling when recursive watching is
 * unavailable on the platform.
 */
export function watchSpace(spaceId, root, { debounceMs = 250 } = {}) {
  const entry = ensureSpace(spaceId, root)
  if (entry.stop) return entry.stop
  let timer = null
  const pending = new Set()

  const flush = () => {
    timer = null
    const paths = [...pending]
    pending.clear()
    if (paths.length > 0) broadcast(spaceId, { type: 'fs-change', paths })
  }
  const onChange = (relPath) => {
    if (typeof relPath === 'string') {
      const normalized = relPath.split(path.sep).join('/')
      if (!normalized || normalized.split('/').some(part => part.startsWith('.') || part.endsWith('.tmp'))) return
      pending.add(normalized)
    }
    if (timer) clearTimeout(timer)
    timer = setTimeout(flush, debounceMs)
  }

  let watcher
  try {
    watcher = fs.watch(root, { recursive: true }, (_event, filename) => onChange(filename))
    watcher.on('error', () => { /* keep polling fallback alive */ })
  } catch {
    watcher = null
  }

  const poll = setInterval(() => {
    // Cheap heartbeat so clients can also detect that the stream is alive.
    broadcast(spaceId, { type: 'tick', at: nowIso() })
  }, 20_000)

  // fs.watch is unreliable across platforms (and silently inert on some mounts),
  // so reconcile the tree by signature every few seconds and broadcast the diff.
  let stopped = false
  let snapshot = null
  const scan = async () => {
    const entries = await walk(root, '', { maxDepth: 6 }).catch(() => [])
    const next = new Map()
    for (const entry of entries) {
      if (entry.type !== 'file') continue
      next.set(entry.path, `${entry.mtimeMs}:${entry.size}`)
    }
    return next
  }
  const reconcile = setInterval(async () => {
    if (stopped) return
    const next = await scan()
    if (snapshot === null) { snapshot = next; return }
    const changed = []
    for (const [relPath, signature] of next) {
      if (snapshot.get(relPath) !== signature) changed.push(relPath)
    }
    for (const relPath of snapshot.keys()) {
      if (!next.has(relPath)) changed.push(relPath)
    }
    snapshot = next
    if (changed.length > 0) broadcast(spaceId, { type: 'fs-change', paths: changed })
  }, 5_000)
  void scan().then((value) => { if (snapshot === null) snapshot = value })

  entry.stop = () => {
    stopped = true
    if (timer) clearTimeout(timer)
    clearInterval(poll)
    clearInterval(reconcile)
    watcher?.close?.()
    entry.stop = null
    if (entry.subs.size === 0) spaces.delete(spaceId)
  }
  return entry.stop
}

export function stopWatching(spaceId) {
  const entry = spaces.get(spaceId)
  if (!entry?.stop) return
  entry.stop()
}

/** Test hook: number of live subscribers (0 means the space can be watched lazily). */
export function subscriberCount(spaceId) {
  return spaces.get(spaceId)?.subs.size ?? 0
}
