import { promises as fs } from 'node:fs'
import { loadConfig, resolveHome, ensureHome } from './config.mjs'
import { ensureDaemon, daemonStatus, stopDaemon } from './daemon.mjs'
import {
  listSpaces, getSpace, treeSpace, spaceContext, createSpace, updateSpace, deleteSpace,
  inviteSpace, joinSpace, memberInfo, approveMember, removeMember, syncStatus, waitSync,
} from './core/spaces.mjs'
import { readFile, writeFile, editFile, conflicts, resolveConflict } from './core/files.mjs'
import {
  createDocumentFile, appendDocumentFile, createSheetFile, readSheetFile, updateSheetFile,
  createSlidesFile, readSlidesFile, updateSlidesFile,
} from './core/content.mjs'

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
    case 'createDoc': return createDocumentFile(client, config, { space: args.space, path: args.path, parent: args.parent, title: args.title, markdown: args.markdown || '', template: args.template || 'blank' })
    case 'appendDoc': return appendDocumentFile(client, config, { space: args.space, path: args.path, markdown: args.markdown || '', expectedSha256: args.expectedSha256 })
    case 'createSheet': return createSheetFile(client, config, { space: args.space, path: args.path, title: args.title, template: args.template || 'blank', columns: args.columns, rows: args.rows, hasHeader: args.hasHeader !== false })
    case 'readSheet': return readSheetFile(client, config, { space: args.space, path: args.path, offset: args.offset || 0, limit: args.limit || 200, header: args.header !== false })
    case 'updateSheet': return updateSheetFile(client, config, { space: args.space, path: args.path, rows: args.rows, mode: args.mode || 'append', expectedSha256: args.expectedSha256 })
    case 'createSlides': return createSlidesFile(client, config, { space: args.space, path: args.path, parent: args.parent, title: args.title, template: args.template || 'blank', slides: args.slides, markdown: args.markdown })
    case 'readSlides': return readSlidesFile(client, config, { space: args.space, path: args.path })
    case 'updateSlides': return updateSlidesFile(client, config, { space: args.space, path: args.path, markdown: args.markdown, index: args.index || 0, mode: args.mode || 'replace', expectedSha256: args.expectedSha256 })
    case 'read': return readFile(client, config, { space: args.space, path: args.path, maxChars: args.maxChars || 20000 })
    case 'write': return writeFile(client, config, { space: args.space, path: args.path, content: args.content, expectedSha256: args.expectedSha256, overwrite: Boolean(args.overwrite), base: 'save' })
    case 'edit': return editFile(client, config, { space: args.space, path: args.path, edits: args.edits, expectedSha256: args.expectedSha256 })
    case 'invite': return inviteSpace(client, config, args.space)
    case 'join': return joinSpace(client, config, { invite: args.invite, localPath: args.localPath })
    case 'members': return memberInfo(client, config, args.space)
    case 'approve': return approveMember(client, config, { space: args.space, deviceId: args.deviceId, name: args.name })
    case 'removeMember': return removeMember(client, config, { space: args.space, deviceId: args.deviceId })
    case 'sync': return syncStatus(client, config, { space: args.space })
    case 'waitSync': return waitSync(client, config, { space: args.space, timeoutMs: args.timeoutMs || 10000 })
    case 'conflicts': return conflicts(client, config, { space: args.space })
    case 'resolveConflict': return resolveConflict(client, config, { space: args.space, conflictPath: args.conflictPath, action: args.action })
    case 'daemonStatus': return daemonStatus(home || resolveHome())
    case 'daemonStart': { daemonPromise = undefined; await context(home); return daemonStatus(home || resolveHome()) }
    case 'daemonStop': { daemonPromise = undefined; return stopDaemon(home || resolveHome(), logger) }
    default: throw Object.assign(new Error(`unknown method: ${method}`), { code: 'INVALID_METHOD' })
  }
}

/** Handle /dsh-space-api requests from the client page. */
export async function handleApi(req, res, { home } = {}) {
  try {
    const url = new URL(req.url || '/', 'http://127.0.0.1')
    if (url.pathname === '/dsh-space-api/health') return json(res, 200, { ok: true })
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
