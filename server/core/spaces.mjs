import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import {
  atomicWrite, fileExists, httpError, nowIso, resolveInside, spaceId as makeSpaceId,
  titleFromPath, walk, fileKind, conflictBaseName,
} from './util.mjs'

const STIGNORE = ['.stfolder', '.stversions', '.space/', '*.tmp', '~$*', '.DS_Store', 'Thumbs.db'].join('\n') + '\n'

function encodeToken(value) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')
}

export function decodeInvite(token) {
  const raw = String(token || '').trim()
  if (!raw.startsWith('dshspace:v1:')) throw httpError('INVALID_INVITE', 'invalid invite token')
  try {
    const value = JSON.parse(Buffer.from(raw.slice('dshspace:v1:'.length), 'base64url').toString('utf8'))
    if (!value?.spaceId || !value?.deviceId) throw new Error('missing fields')
    return value
  } catch {
    throw httpError('INVALID_INVITE', 'invalid invite token')
  }
}

async function readJson(file, fallback = null) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')) } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
}

async function writeJson(file, value) {
  await atomicWrite(file, JSON.stringify(value, null, 2) + '\n')
}

export async function readSpaceMeta(root) {
  return readJson(path.join(root, '.space.json'), null)
}

/** Create only the space root; content directories are created on first write. */
export async function ensureSpaceLayout(root) {
  await fs.mkdir(root, { recursive: true })
}

export async function listFolders(client) {
  return client.configFolders()
}

export async function resolveSpace(client, spaceRef, config) {
  const folders = await client.configFolders()
  const ref = String(spaceRef || '').trim()
  if (!ref) throw httpError('SPACE_NOT_FOUND', 'space is required')
  let folder = folders.find(item => item.id === ref)
  if (!folder) folder = folders.find(item => item.id.toLowerCase() === ref.toLowerCase())
  if (!folder) {
    const matches = folders.filter(item => String(item.label || '').toLowerCase() === ref.toLowerCase())
    if (matches.length > 1) throw httpError('SPACE_AMBIGUOUS', `space name matches ${matches.length} spaces; use the id`, { candidates: matches.map(item => ({ id: item.id, name: item.label })) })
    folder = matches[0]
  }
  if (!folder) throw httpError('SPACE_NOT_FOUND', `space not found: ${ref}`)
  const root = folder.path
  const meta = await readSpaceMeta(root) || {
    schema: 1,
    id: folder.id,
    name: folder.label || folder.id,
    description: '',
    createdAt: null,
    createdBy: null,
    homePage: null,
    format: 'open-text',
  }
  return { folder, root, meta }
}

async function folderStats(root) {
  const entries = await walk(root, '', { readHead: true, maxDepth: 8 })
  const counts = { pages: 0, sheets: 0, slides: 0, assets: 0, files: 0 }
  let bytes = 0
  for (const entry of entries) {
    if (entry.type !== 'file') continue
    if (entry.name.startsWith('.') || entry.path === 'README.md') continue
    bytes += entry.size || 0
    if (entry.kind === 'document') counts.pages++
    else if (entry.kind === 'table') counts.sheets++
    else if (entry.kind === 'slides') counts.slides++
    else if (entry.kind === 'image') counts.assets++
    else counts.files++
  }
  return { counts, bytes, totalFiles: entries.filter(entry => entry.type === 'file').length }
}

async function syncSummary(client, folderId) {
  try {
    const status = await client.dbStatus(folderId)
    return { state: status.state, needFiles: status.needFiles, needBytes: status.needBytes }
  } catch {
    return { state: 'unknown', needFiles: 0, needBytes: 0 }
  }
}

export async function listSpaces(client, config, { filter = 'all' } = {}) {
  const folders = await listFolders(client)
  const local = await getLocalDeviceId(client)
  const out = []
  for (const folder of folders) {
    if (!folder.path) continue
    const meta = await readSpaceMeta(folder.path) || { id: folder.id, name: folder.label || folder.id, description: '', createdBy: null }
    if (filter === 'owned' && meta.createdBy !== local) continue
    if (filter === 'shared' && meta.createdBy === local) continue
    const stats = await folderStats(folder.path).catch(() => ({ counts: { pages: 0, sheets: 0, slides: 0, assets: 0, files: 0 }, bytes: 0, totalFiles: 0 }))
    const sync = await syncSummary(client, folder.id)
    out.push({
      id: folder.id,
      name: meta.name || folder.label || folder.id,
      description: meta.description || '',
      path: folder.path,
      createdBy: meta.createdBy || null,
      counts: stats.counts,
      bytes: stats.bytes,
      totalFiles: stats.totalFiles,
      sync,
      members: Array.isArray(folder.devices) ? folder.devices.length : 1,
      updatedAt: meta.updatedAt || meta.createdAt || null,
    })
  }
  out.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
  return out
}

export async function createSpace(client, config, { name, description = '' }) {
  const clean = String(name || '').trim()
  if (!clean) throw httpError('INVALID_INPUT', 'space name is required')
  if (clean.length > 80) throw httpError('INVALID_INPUT', 'space name is too long')
  const id = makeSpaceId(clean)
  const root = path.join(config.spacesRoot, id)
  if (await fileExists(root)) throw httpError('FILE_EXISTS', `space directory already exists: ${id}`)
  const local = await getLocalDeviceId(client)
  const meta = {
    schema: 1,
    id,
    name: clean,
    description: String(description || '').trim(),
    createdAt: nowIso(),
    createdBy: local,
    homePage: null,
    format: 'open-text',
  }
  await ensureSpaceLayout(root)
  await writeJson(path.join(root, '.space.json'), meta)
  await atomicWrite(path.join(root, '.stignore'), STIGNORE)
  await client.postFolder({
    id,
    label: clean,
    path: root,
    type: 'sendreceive',
    devices: [{ deviceID: local }],
    fsWatcherEnabled: true,
    rescanIntervalS: 3600,
    versioning: { type: 'staggered', params: { cleanupIntervalS: '3600', maxAgeS: '2592000' } },
  })
  await client.scan(id).catch(() => {})
  return { ...meta, path: root, sync: { state: 'scanning', needFiles: 0, needBytes: 0 } }
}

export async function updateSpace(client, config, { space, name, description }) {
  const { folder, root, meta } = await resolveSpace(client, space, config)
  const next = { ...meta }
  if (name !== undefined) {
    const clean = String(name).trim()
    if (!clean) throw httpError('INVALID_INPUT', 'space name cannot be empty')
    next.name = clean
  }
  if (description !== undefined) next.description = String(description)
  next.updatedAt = nowIso()
  await writeJson(path.join(root, '.space.json'), next)
  if (name !== undefined) await client.putFolder({ ...folder, label: next.name })
  return { ...next, path: root }
}

export async function getSpace(client, config, space) {
  const { folder, root, meta } = await resolveSpace(client, space, config)
  const stats = await folderStats(root).catch(() => ({ counts: {}, bytes: 0, totalFiles: 0 }))
  return { ...meta, path: root, folder: { id: folder.id, label: folder.label, devices: folder.devices }, stats, sync: await syncSummary(client, folder.id) }
}

function buildTree(flat) {
  const root = []
  const nodes = new Map()
  const ensureDir = (rel) => {
    if (!rel || rel === '.') return root
    if (nodes.has(rel)) return nodes.get(rel).children
    const parentRel = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : ''
    const parentChildren = ensureDir(parentRel)
    const node = { path: rel, name: rel.split('/').pop(), type: 'directory', children: [] }
    parentChildren.push(node)
    nodes.set(rel, node)
    return node.children
  }
  for (const entry of flat) {
    if (entry.type === 'directory') {
      ensureDir(entry.path)
      continue
    }
    const parentRel = entry.path.includes('/') ? entry.path.slice(0, entry.path.lastIndexOf('/')) : ''
    const children = ensureDir(parentRel)
    let title = entry.name
    if (entry.kind === 'document' || entry.kind === 'slides') title = titleFromPath(entry.path)
    children.push({ ...entry, title, children: [] })
  }
  const order = { 'README.md': 0, pages: 1, sheets: 2, assets: 3, files: 4 }
  const sort = list => {
    list.sort((a, b) => (order[a.name] ?? 9) - (order[b.name] ?? 9) || a.name.localeCompare(b.name))
    for (const node of list) if (node.children?.length) sort(node.children)
    return list
  }
  return sort(root)
}

export async function treeSpace(client, config, { space, parent = '', depth = 8 }) {
  const { root } = await resolveSpace(client, space, config)
  const flat = await walk(root, parent, { readHead: true, maxDepth: depth })
  const visible = flat.filter(entry => !entry.name.startsWith('.'))
  return { space: path.basename(root), parent, tree: buildTree(visible), flat: visible }
}

async function findConflicts(root, rel = '') {
  const dir = path.join(root, rel)
  let entries
  try { entries = await fs.readdir(dir, { withFileTypes: true }) } catch { return [] }
  const conflicts = []
  for (const entry of entries) {
    if (entry.name === '.space' || entry.name === '.stfolder' || entry.name === '.stversions') continue
    const nextRel = rel ? `${rel}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      conflicts.push(...await findConflicts(root, nextRel))
    } else if (entry.isFile() && entry.name.includes('.sync-conflict-')) {
      const original = conflictBaseName(nextRel)
      if (!original) continue
      const stat = await fs.stat(path.join(root, nextRel))
      conflicts.push({ path: original, conflictPath: nextRel, mtimeMs: stat.mtimeMs })
    }
  }
  return conflicts
}

export async function spaceContext(client, config, { space, maxChars = 8000 }) {
  const { root, meta } = await resolveSpace(client, space, config)
  const tree = await treeSpace(client, config, { space, depth: 6 })
  const flat = tree.flat.filter(entry => entry.type === 'file')
  let home = ''
  const homePath = meta.homePage || null
  if (homePath) {
    try { home = (await fs.readFile(path.join(root, homePath), 'utf8')).slice(0, Math.max(1000, Math.min(6000, maxChars / 2))) } catch {}
  }
  const recent = flat
    .filter(entry => entry.kind === 'document' || entry.kind === 'slides' || entry.kind === 'table')
    .sort((a, b) => (b.mtimeMs || 0) - (a.mtimeMs || 0))
    .slice(0, 10)
    .map(entry => ({ path: entry.path, kind: entry.kind, title: entry.title, mtimeMs: entry.mtimeMs }))
  const conflicts = await findConflicts(root)
  const payload = {
    space: { id: meta.id, name: meta.name, description: meta.description },
    home: { path: homePath, excerpt: home },
    tree: tree.tree,
    recent,
    conflicts,
    truncated: false,
  }
  const text = JSON.stringify(payload)
  if (text.length <= maxChars) return payload
  payload.tree = payload.tree.slice(0, 20)
  payload.truncated = true
  payload.home.excerpt = payload.home.excerpt.slice(0, Math.max(500, maxChars / 3))
  return payload
}

export async function deleteSpace(client, config, { space, confirm }) {
  const { folder, root, meta } = await resolveSpace(client, space, config)
  if (confirm !== true && String(confirm) !== meta.id && String(confirm) !== meta.name) {
    throw httpError('INVALID_INPUT', 'space_delete requires confirm=true or the space id/name')
  }
  const target = path.join(config.spacesRoot, '..', 'trash', `${meta.id}-${Date.now()}`)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.rename(root, target)
  await client.deleteFolder(folder.id).catch(() => {})
  return { deleted: true, id: meta.id, trashedTo: target }
}

export async function getLocalDeviceId(client) {
  const status = await client.status()
  return status.myID
}

export async function memberInfo(client, config, space) {
  const { folder } = await resolveSpace(client, space, config)
  const devices = await client.configDevices()
  const byId = new Map(devices.map(device => [device.deviceID, device]))
  const members = (folder.devices || []).map(entry => {
    const device = byId.get(entry.deviceID)
    return { deviceId: entry.deviceID, name: device?.name || entry.deviceID.slice(0, 7), connected: false }
  })
  const connections = await client.connections().catch(() => ({ connections: {} }))
  for (const member of members) member.connected = Boolean(connections.connections?.[member.deviceId]?.connected)
  const pendingDevices = await client.pendingDevices().catch(() => ({}))
  const pendingFolders = await client.pendingFolders().catch(() => ({}))
  return { members, pendingDevices, pendingFolders }
}

export async function inviteSpace(client, config, space) {
  const { meta } = await resolveSpace(client, space, config)
  const deviceId = await getLocalDeviceId(client)
  const token = 'dshspace:v1:' + encodeToken({
    v: 1,
    kind: 'dsh-space-invite',
    spaceId: meta.id,
    spaceName: meta.name,
    description: meta.description || '',
    createdAt: meta.createdAt || nowIso(),
    deviceId,
  })
  return {
    space: { id: meta.id, name: meta.name },
    deviceId,
    invite: token,
    instructions: 'Share this token with the other device. After they run space_join, approve their device with space_approve_member.',
  }
}

export async function joinSpace(client, config, { invite, localPath }) {
  const data = decodeInvite(invite)
  const valid = await client.validateDeviceId(data.deviceId).catch(() => null)
  if (!valid || valid.error) throw httpError('INVALID_INVITE', 'invite device id is invalid')
  const local = await getLocalDeviceId(client)
  const root = path.resolve(config.spacesRoot, localPath || data.spaceId)
  if (!root.startsWith(path.resolve(config.spacesRoot) + path.sep)) throw httpError('PATH_INVALID', 'localPath must stay inside the spaces root')
  const existing = (await client.configFolders()).find(folder => folder.id === data.spaceId)
  if (existing) {
    const devices = existing.devices || []
    if (!devices.some(entry => entry.deviceID === data.deviceId)) {
      devices.push({ deviceID: data.deviceId })
      await client.putFolder({ ...existing, devices })
    }
    return { space: { id: data.spaceId, name: data.spaceName }, path: existing.path, pendingApproval: true }
  }
  const devices = (await client.configDevices()).map(device => device.deviceID)
  if (!devices.includes(data.deviceId)) {
    await client.postDevice({ deviceID: data.deviceId, name: data.spaceName || data.deviceId.slice(0, 7), addresses: ['dynamic'] })
  }
  await ensureSpaceLayout(root)
  const meta = {
    schema: 1,
    id: data.spaceId,
    name: data.spaceName || data.spaceId,
    description: data.description || '',
    createdAt: data.createdAt || nowIso(),
    createdBy: data.deviceId,
    homePage: null,
    format: 'open-text',
  }
  await writeJson(path.join(root, '.space.json'), meta)
  await atomicWrite(path.join(root, '.stignore'), STIGNORE)
  await client.postFolder({
    id: data.spaceId,
    label: meta.name,
    path: root,
    type: 'sendreceive',
    devices: [{ deviceID: local }, { deviceID: data.deviceId }],
    fsWatcherEnabled: true,
    rescanIntervalS: 3600,
  })
  await client.scan(data.spaceId).catch(() => {})
  return { space: { id: meta.id, name: meta.name }, path: root, pendingApproval: true, deviceId: local }
}

export async function approveMember(client, config, { space, deviceId, name }) {
  const { folder } = await resolveSpace(client, space, config)
  const valid = await client.validateDeviceId(deviceId).catch(() => null)
  if (!valid || valid.error) throw httpError('INVALID_DEVICE', 'invalid device id')
  const devices = await client.configDevices()
  if (!devices.some(device => device.deviceID === deviceId)) {
    await client.postDevice({ deviceID: deviceId, name: name || deviceId.slice(0, 7), addresses: ['dynamic'] })
  }
  const folderDevices = folder.devices || []
  if (!folderDevices.some(entry => entry.deviceID === deviceId)) folderDevices.push({ deviceID: deviceId })
  await client.putFolder({ ...folder, devices: folderDevices })
  await client.scan(folder.id).catch(() => {})
  return { space: folder.id, deviceId, approved: true }
}

export async function removeMember(client, config, { space, deviceId }) {
  const { folder } = await resolveSpace(client, space, config)
  const devices = (folder.devices || []).filter(entry => entry.deviceID !== deviceId)
  await client.putFolder({ ...folder, devices })
  return { space: folder.id, deviceId, removed: true }
}

export async function syncStatus(client, config, { space }) {
  const { folder } = await resolveSpace(client, space, config)
  const status = await client.dbStatus(folder.id).catch(() => ({ state: 'unknown', needFiles: 0, needBytes: 0 }))
  const connections = await client.connections().catch(() => ({ connections: {} }))
  const peers = []
  for (const entry of folder.devices || []) {
    const id = entry.deviceID
    if (id === (await getLocalDeviceId(client))) continue
    const connected = Boolean(connections.connections?.[id]?.connected)
    const completion = await client.completion(folder.id, id).catch(() => null)
    peers.push({ deviceId: id, connected, completion: completion?.completion ?? null, remoteState: completion?.remoteState ?? null })
  }
  const conflicts = await findConflicts(folder.path)
  return { space: folder.id, state: status.state, needFiles: status.needFiles, needBytes: status.needBytes, conflicts: conflicts.length, peers }
}

export async function waitSync(client, config, { space, timeoutMs = 10000 }) {
  const deadline = Date.now() + Math.max(1000, Math.min(60000, Number(timeoutMs) || 10000))
  let last
  while (Date.now() < deadline) {
    last = await syncStatus(client, config, { space })
    if (last.state === 'idle' && last.needFiles === 0) return { ...last, timedOut: false }
    await new Promise(resolve => setTimeout(resolve, 400))
  }
  return { ...(last || { space }), timedOut: true }
}

export async function findSpaceConflicts(client, config, { space }) {
  const { root } = await resolveSpace(client, space, config)
  return findConflicts(root)
}

export { findConflicts }
