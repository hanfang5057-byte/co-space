import { createReadStream, promises as fs } from 'node:fs'
import { loadConfig, resolveHome, ensureHome } from './config.mjs'
import { ensureDaemon, daemonStatus, stopDaemon } from './daemon.mjs'
import {
  listSpaces, getSpace, treeSpace, spaceContext, createSpace, updateSpace, deleteSpace,
  inviteSpace, joinSpace, memberInfo, approveMember, removeMember, syncStatus, waitSync, resolveSpace,
} from './core/spaces.mjs'
import { listFiles, readFile, writeFile, editFile, moveFile, deleteFile, importFile, outlineFile, conflicts, resolveConflict, conflictDetail } from './core/files.mjs'
import { createDocumentFile, appendDocumentFile } from './core/content.mjs'
import { uploadAsset } from './core/assets.mjs'
import { resolveInside } from './core/util.mjs'
import { scanLegacy, cleanupLegacy } from './core/legacy.mjs'
import {
  acquireLease, currentLease, listLeases, listProposals, localDeviceId, readPresence,
  releaseLease, renewLease, stopWatching, subscribe, subscriberCount, watchSpace, writePresence,
} from './core/live.mjs'
import {
  docBlocks, docPatch, docPropose, docProposals, docResolveProposal, docRestore, docVersions, parseBlocks,
} from './core/docs.mjs'

let configPromise
let daemonPromise
const logger = { info: (...args) => console.error('[dsh-space-api]', ...args), warn: (...args) => console.error('[dsh-space-api]', ...args) }

async function context(home) {
  const actual = home || resolveHome()
  if (!configPromise) configPromise = loadConfig(actual)
  const config = await configPromise
  if (!daemonPromise) {
    daemonPromise = (async () => {
      await ensureHome(actual)
      return ensureDaemon(actual, config, logger)
    })().catch(error => { daemonPromise = undefined; throw error })
  }
  const daemon = await daemonPromise
  return { home: actual, config, client: daemon.client, runtime: daemon.runtime }
}

function json(res, status, value) {
  const body = JSON.stringify(value)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  })
  res.end(body)
}

function fail(res, error) {
  const status = error?.code === 'SPACE_NOT_FOUND' || error?.code === 'FILE_NOT_FOUND' ? 404
    : error?.code === 'VERSION_CONFLICT' || error?.code === 'FILE_EXISTS' ? 409
      : error?.code === 'PATH_INVALID' || error?.code === 'INVALID_INPUT' || error?.code === 'INVALID_INVITE' ? 400
        : 500
  json(res, status, { error: { code: error?.code || 'INTERNAL', message: error?.message || String(error), details: error?.details } })
}

async function readBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > 8 * 1024 * 1024) throw Object.assign(new Error('request body is too large'), { code: 'LIMIT_EXCEEDED' })
    chunks.push(chunk)
  }
  if (!chunks.length) return {}
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { throw Object.assign(new Error('invalid JSON body'), { code: 'INVALID_INPUT' }) }
}

async function dispatch(method, args, home) {
  const { client, config } = await context(home)
  switch (method) {
    case 'uploadAsset': return uploadAsset(client, config, {
      space: args.space, filename: args.filename, dataBase64: args.dataBase64,
    })
    case 'list': return listSpaces(client, config, { filter: args.filter || 'all' })
    case 'get': {
      const value = await getSpace(client, config, args.space)
      const members = await memberInfo(client, config, args.space).catch(() => ({ members: [] }))
      return { ...value, members: members.members }
    }
    case 'tree': return treeSpace(client, config, { space: args.space, parent: args.parent || '', depth: args.depth || 8 })
    case 'context': return spaceContext(client, config, { space: args.space, maxChars: args.maxChars || 8000 })
    case 'createSpace': return createSpace(client, config, { name: args.name, description: args.description || '' })
    case 'updateSpace': return updateSpace(client, config, { space: args.space, name: args.name, description: args.description })
    case 'deleteSpace': return deleteSpace(client, config, { space: args.space, confirm: args.confirm })
    case 'docBlocks': return docBlocks(client, config, { space: args.space, path: args.path, heading: args.heading, limit: args.limit || 200 })
    case 'docPatch': return docPatch(client, config, { space: args.space, path: args.path, expectedSha256: args.expectedSha256, ops: args.ops, writer: args.writer || 'human', holder: args.holder })
    case 'docPropose': return docPropose(client, config, { space: args.space, path: args.path, expectedSha256: args.expectedSha256, ops: args.ops, rationale: args.rationale, author: args.author || 'agent' })
    case 'docProposals': return docProposals(client, config, { space: args.space, path: args.path, status: args.status || 'pending' })
    case 'docResolveProposal': return docResolveProposal(client, config, { space: args.space, path: args.path, id: args.id, accept: Boolean(args.accept) })
    case 'docVersions': return docVersions(client, config, { space: args.space, path: args.path, limit: args.limit || 30 })
    case 'docRestore': return docRestore(client, config, { space: args.space, path: args.path, sha: args.sha })
    case 'devices': return { device: await localDeviceId(client) }
    case 'presence': {
      if (!args.doc) return { presence: await readPresence(client, config, { space: args.space }) }
      const value = await writePresence(client, config, {
        space: args.space, device: args.device || await localDeviceId(client), name: args.name,
        doc: args.doc, block: args.block, mode: args.mode, agent: args.agent,
      })
      return { presence: value }
    }
    case 'presenceList': return { presence: await readPresence(client, config, { space: args.space }) }
    case 'leaseStatus': {
      const lease = await currentLease((await resolveSpace(client, args.space, config)).root, args.path)
      return { lease, leases: await listLeases((await resolveSpace(client, args.space, config)).root, args.path), device: await localDeviceId(client) }
    }
    case 'leaseAcquire': return acquireLease(client, config, {
      space: args.space, path: args.path, holder: args.holder, label: args.label,
      device: await localDeviceId(client),
      agents: args.agents || [], force: Boolean(args.force), ttlMs: args.ttlMs || 90_000,
    })
    case 'leaseRenew': return renewLease(client, config, { space: args.space, path: args.path, leaseId: args.leaseId, ttlMs: args.ttlMs || 90_000 })
    case 'leaseRelease': return releaseLease(client, config, { space: args.space, path: args.path, leaseId: args.leaseId })
    case 'docState': {
      const { root } = await resolveSpace(client, args.space, config)
      const lease = await currentLease(root, args.path)
      return { lease, device: await localDeviceId(client), presence: await readPresence(client, config, { space: args.space }) }
    }
    case 'legacyReport': return scanLegacy(client, config, { space: args.space })
    case 'cleanupLegacy': return cleanupLegacy(client, config, { space: args.space, dryRun: Boolean(args.dryRun), deleteMarkdown: Boolean(args.deleteMarkdown) })
    case 'createDoc': return createDocumentFile(client, config, { space: args.space, path: args.path, parent: args.parent, title: args.title, markdown: args.markdown || '', template: args.template || 'blank' })
    case 'appendDoc': return appendDocumentFile(client, config, { space: args.space, path: args.path, markdown: args.markdown || '', expectedSha256: args.expectedSha256 })
    case 'listFiles': return listFiles(client, config, { space: args.space, path: args.path || '', recursive: args.recursive !== false, limit: args.limit || 500, cursor: args.cursor || 0 })
    case 'outlineFile': return outlineFile(client, config, { space: args.space, path: args.path })
    case 'moveFile': return moveFile(client, config, { space: args.space, from: args.from, to: args.to, overwrite: Boolean(args.overwrite) })
    case 'deleteFile': return deleteFile(client, config, { space: args.space, path: args.path, confirm: args.confirm })
    case 'importFile': return importFile(client, config, { space: args.space, sourcePath: args.sourcePath, path: args.path })
    case 'read': return readFile(client, config, { space: args.space, path: args.path, maxChars: args.maxChars || 20000 })
    case 'write': return writeFile(client, config, { space: args.space, path: args.path, content: args.content, expectedSha256: args.expectedSha256, overwrite: Boolean(args.overwrite), base: 'save' })
    case 'edit': return editFile(client, config, { space: args.space, path: args.path, edits: args.edits, expectedSha256: args.expectedSha256 })
    case 'invite': return inviteSpace(client, config, args.space)
    case 'join': return joinSpace(client, config, { invite: args.invite, localPath: args.localPath })
    case 'members': return memberInfo(client, config, args.space)
    case 'approve': return approveMember(client, config, { space: args.space, deviceId: args.deviceId, name: args.name })
    case 'removeMember': return removeMember(client, config, { space: args.space, deviceId: args.deviceId })
    case 'sync': return syncStatus(client, config, { space: args.space })
    case 'rescan': { const { folder } = await resolveSpace(client, args.space, config); await client.scan(folder.id, args.sub); return { space: folder.id, scanned: true, sub: args.sub || null } }
    case 'waitSync': return waitSync(client, config, { space: args.space, timeoutMs: args.timeoutMs || 10000 })
    case 'conflicts': return conflicts(client, config, { space: args.space })
    case 'resolveConflict': return resolveConflict(client, config, { space: args.space, conflictPath: args.conflictPath, action: args.action })
    case 'conflictDetail': return conflictDetail(client, config, { space: args.space, conflictPath: args.conflictPath })
    case 'daemonStatus': return daemonStatus(home || resolveHome())
    case 'daemonStart': { daemonPromise = undefined; await context(home); return daemonStatus(home || resolveHome()) }
    case 'daemonStop': { daemonPromise = undefined; return stopDaemon(home || resolveHome(), logger) }
    default: throw Object.assign(new Error(`unknown method: ${method}`), { code: 'INVALID_METHOD' })
  }
}

/** Image/asset types the editor may render; everything else is refused. */
const ASSET_TYPES = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', avif: 'image/avif', svg: 'image/svg+xml',
}

function assetType(rel) {
  const ext = String(rel).toLowerCase().split('.').pop()
  return ASSET_TYPES[ext]
}

/**
 * Stream an in-space asset to the page. Same-origin, cookie-authenticated;
 * path traversal and non-image types are rejected before any byte is sent.
 */
async function serveAsset(req, res, { home } = {}) {
  const url = new URL(req.url || '/', 'http://127.0.0.1')
  const space = url.searchParams.get('space') || ''
  const rel = url.searchParams.get('path') || ''
  const type = assetType(rel)
  if (!type) return json(res, 403, { error: { code: 'UNSUPPORTED_FORMAT', message: 'only images can be served' } })
  if (rel.startsWith('.') || rel.includes('/.') || rel.includes('..')) {
    return json(res, 400, { error: { code: 'PATH_INVALID', message: 'invalid asset path' } })
  }
  const { client, config } = await context(home)
  const { root } = await resolveSpace(client, space, config)
  const { rel: normalized, full } = await resolveInside(root, rel)
  const stat = await fs.stat(full).catch(() => null)
  if (!stat?.isFile()) return json(res, 404, { error: { code: 'FILE_NOT_FOUND', message: `asset not found: ${normalized}` } })
  res.writeHead(200, {
    'content-type': type,
    'content-length': stat.size,
    'cache-control': 'private, max-age=60',
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  })
  createReadStream(full).pipe(res)
}

/**
 * Server-Sent Events for one space: remote file changes (Syncthing), document
 * writes by other clients, and presence updates.
 */
async function serveEvents(req, res, { home } = {}) {
  const url = new URL(req.url || '/', 'http://127.0.0.1')
  const space = url.searchParams.get('space') || ''
  const { client, config } = await context(home)
  const { folder, root } = await resolveSpace(client, space, config)

  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  })
  res.write(': connected\n\n')

  watchSpace(folder.id, root)
  const send = (event) => {
    if (res.writableEnded) return
    res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
  }
  const off = subscribe(folder.id, send)
  try { send({ type: 'ready', space: folder.id, device: await localDeviceId(client) }) } catch { /* ignore */ }
  const presence = setInterval(() => {
    void readPresence(client, config, { space }).then(rows => send({ type: 'presence', presence: rows })).catch(() => {})
  }, 5000)
  const keepAlive = setInterval(() => { if (!res.writableEnded) res.write(': ping\n\n') }, 15_000)

  const close = () => {
    clearInterval(presence)
    clearInterval(keepAlive)
    off()
    if (subscriberCount(folder.id) === 0) stopWatching(folder.id)
  }
  req.on('close', close)
  res.on('close', close)
}

/** Handle /dsh-space-api requests from the client page. */
export async function handleApi(req, res, { home } = {}) {
  try {
    const url = new URL(req.url || '/', 'http://127.0.0.1')
    if (url.pathname === '/dsh-space-api/health') return json(res, 200, { ok: true })
    if (url.pathname === '/dsh-space-api/asset' && req.method === 'GET') return await serveAsset(req, res, { home })
    if (url.pathname === '/dsh-space-api/events' && req.method === 'GET') return await serveEvents(req, res, { home })
    if (req.method !== 'POST') return json(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'use POST' } })
    const body = await readBody(req)
    const method = String(body.method || '')
    if (!method) throw Object.assign(new Error('method is required'), { code: 'INVALID_INPUT' })
    const result = await dispatch(method, body.args || {}, home)
    return json(res, 200, { ok: true, result })
  } catch (error) {
    console.error('[dsh-space-api]', error.stack || error.message)
    return fail(res, error)
  }
}
