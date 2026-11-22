import { promises as fs } from 'node:fs'
import path from 'node:path'
import { diff3Merge } from 'node-diff3'
import {
  atomicWrite, conflictBaseName, fileExists, fileKind, httpError, normalizeRel,
  readText, resolveInside, sha256, titleFromPath, walk,
} from './util.mjs'
import { renderDocument, titleOf, outlineMarkdown } from './markdown.mjs'
import { readSpaceMeta, resolveSpace, findConflicts } from './spaces.mjs'

const BASE_DIR = '.space/base'

function baseFile(root, rel) {
  return path.join(root, BASE_DIR, rel)
}

async function metaFor(root, rel) {
  const { full } = await resolveInside(root, rel)
  const stat = await fs.lstat(full)
  if (stat.isSymbolicLink()) throw httpError('PATH_INVALID', 'symbolic links are not allowed')
  if (!stat.isFile()) throw httpError('PATH_INVALID', 'not a file')
  const buffer = await fs.readFile(full)
  const kind = fileKind(rel, buffer.subarray(0, 800).toString('utf8'))
  return { path: rel, name: path.posix.basename(rel), kind, size: stat.size, mtimeMs: stat.mtimeMs, sha256: sha256(buffer) }
}

async function saveBase(root, rel, full) {
  try {
    const stat = await fs.lstat(full)
    if (!stat.isFile()) return
    const buffer = await fs.readFile(full)
    if (buffer.length > 2_097_152) return
    await atomicWrite(baseFile(root, rel), buffer)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}

async function scan(client, folderId, sub) {
  await client.scan(folderId, sub).catch(() => {})
}

export async function listFiles(client, config, { space, path: rel = '', recursive = true, limit = 500, cursor = 0 } = {}) {
  const { folder, root } = await resolveSpace(client, space, config)
  const start = normalizeRel(rel, { allowEmpty: true })
  const entries = await walk(root, start, { readHead: true, maxDepth: recursive ? 8 : 1 })
  const files = entries.filter(entry => entry.type === 'file')
  const offset = Math.max(0, Number(cursor) || 0)
  const max = Math.max(1, Math.min(2000, Number(limit) || 500))
  return {
    space: folder.id,
    path: start,
    total: files.length,
    offset,
    files: files.slice(offset, offset + max),
    directories: entries.filter(entry => entry.type === 'directory').map(entry => entry.path),
    nextCursor: offset + max < files.length ? offset + max : null,
  }
}

export async function readFile(client, config, { space, path: rel, maxChars = 20000 }) {
  const { folder, root } = await resolveSpace(client, space, config)
  const { rel: normalized, full } = await resolveInside(root, rel)
  const meta = await metaFor(root, normalized)
  if (meta.kind === 'image' || meta.kind === 'file') {
    throw httpError('UNSUPPORTED_FORMAT', `cannot read ${meta.kind} as text: ${normalized}`)
  }
  const text = await readText(full, config.limits?.maxTextBytes || 2_097_152)
  if (meta.kind === 'legacy') {
    // Retired formats (CSV / Marp / ODS) stay readable as plain text until they
    // are moved to the trash by space_cleanup_legacy.
    return { ...meta, text: text.slice(0, maxChars), title: titleFromPath(normalized), truncated: text.length > maxChars }
  }
  return {
    ...meta,
    text: text.slice(0, maxChars),
    title: titleOf(text, titleFromPath(normalized)),
    html: renderDocument(normalized, text).html,
    outline: outlineMarkdown(text),
    truncated: text.length > maxChars,
  }
}

export async function outlineFile(client, config, { space, path: rel }) {
  const { root } = await resolveSpace(client, space, config)
  const { rel: normalized, full } = await resolveInside(root, rel)
  const buffer = await fs.readFile(full)
  const kind = fileKind(normalized, buffer.subarray(0, 800).toString('utf8'))
  if (kind === 'document') return { path: normalized, kind, outline: outlineMarkdown(buffer.toString('utf8')) }
  return { path: normalized, kind, outline: [] }
}

export async function writeFile(client, config, { space, path: rel, content, expectedSha256, overwrite = false, base = 'keep' }) {
  const { folder, root } = await resolveSpace(client, space, config)
  const { rel: normalized, full } = await resolveInside(root, rel)
  const stat = await fs.lstat(full).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error))
  if (stat) {
    const current = await fs.readFile(full)
    if (expectedSha256 && sha256(current) !== expectedSha256) throw httpError('VERSION_CONFLICT', 'file changed since it was read')
    if (!overwrite && !expectedSha256) throw httpError('FILE_EXISTS', 'file already exists; pass overwrite or expectedSha256')
    if (base === 'save') await saveBase(root, normalized, full)
  }
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(String(content ?? ''), 'utf8')
  if (buffer.length > (config.limits?.maxFileBytes || 52_428_800)) throw httpError('LIMIT_EXCEEDED', 'file is too large')
  await atomicWrite(full, buffer)
  await scan(client, folder.id, normalized)
  return metaFor(root, normalized)
}

export async function editFile(client, config, { space, path: rel, edits, expectedSha256 }) {
  if (!Array.isArray(edits) || !edits.length) throw httpError('INVALID_INPUT', 'edits must be a non-empty array')
  const { folder, root } = await resolveSpace(client, space, config)
  const { rel: normalized, full } = await resolveInside(root, rel)
  const buffer = await fs.readFile(full)
  if (expectedSha256 && sha256(buffer) !== expectedSha256) throw httpError('VERSION_CONFLICT', 'file changed since it was read')
  let text = buffer.toString('utf8')
  await saveBase(root, normalized, full)
  for (const edit of edits) {
    const oldText = String(edit?.oldText ?? '')
    const newText = String(edit?.newText ?? '')
    if (!oldText) throw httpError('INVALID_INPUT', 'oldText cannot be empty')
    const first = text.indexOf(oldText)
    if (first < 0) throw httpError('EDIT_NOT_APPLIED', `oldText not found: ${oldText.slice(0, 60)}`)
    if (!edit.replaceAll && text.indexOf(oldText, first + oldText.length) >= 0) {
      throw httpError('EDIT_NOT_APPLIED', `oldText is not unique: ${oldText.slice(0, 60)}`)
    }
    text = edit.replaceAll ? text.split(oldText).join(newText) : text.slice(0, first) + newText + text.slice(first + oldText.length)
  }
  await atomicWrite(full, text)
  await scan(client, folder.id, normalized)
  return metaFor(root, normalized)
}

export async function moveFile(client, config, { space, from, to, overwrite = false }) {
  const { folder, root } = await resolveSpace(client, space, config)
  const source = await resolveInside(root, from)
  const target = await resolveInside(root, to)
  if (!overwrite && await fileExists(target.full)) throw httpError('FILE_EXISTS', 'destination already exists')
  await fs.mkdir(path.dirname(target.full), { recursive: true })
  await fs.rename(source.full, target.full)
  await scan(client, folder.id)
  return metaFor(root, target.rel)
}

export async function deleteFile(client, config, { space, path: rel, confirm }) {
  if (confirm !== true) throw httpError('INVALID_INPUT', 'file_delete requires confirm=true')
  const { folder, root } = await resolveSpace(client, space, config)
  const { rel: normalized, full } = await resolveInside(root, rel)
  const stat = await fs.lstat(full)
  if (stat.isDirectory()) throw httpError('INVALID_INPUT', 'use a directory operation for directories')
  await fs.rm(full, { force: true })
  await fs.rm(baseFile(root, normalized), { force: true }).catch(() => {})
  await scan(client, folder.id, normalized)
  return { deleted: true, path: normalized }
}

export async function importFile(client, config, { space, sourcePath, path: rel }) {
  if (!sourcePath) throw httpError('INVALID_INPUT', 'sourcePath is required')
  const source = path.resolve(sourcePath)
  const stat = await fs.lstat(source)
  if (!stat.isFile()) throw httpError('INVALID_INPUT', 'sourcePath must be a regular file')
  if (stat.size > (config.limits?.maxFileBytes || 52_428_800)) throw httpError('LIMIT_EXCEEDED', 'file is too large')
  const { folder, root } = await resolveSpace(client, space, config)
  const targetRel = normalizeRel(rel || `files/${path.basename(source)}`)
  const { full } = await resolveInside(root, targetRel)
  await fs.mkdir(path.dirname(full), { recursive: true })
  await fs.copyFile(source, full)
  await scan(client, folder.id, targetRel)
  return metaFor(root, targetRel)
}

export async function conflicts(client, config, { space }) {
  const { root, folder } = await resolveSpace(client, space, config)
  const list = await findConflicts(root)
  return list.map(item => ({ ...item, basePath: path.join(BASE_DIR, item.path) }))
}

function flattenMerge(parts) {
  const lines = []
  let count = 0
  for (const part of parts) {
    if (part.ok) {
      lines.push(...part.ok)
    } else {
      count++
      const conflict = part.conflict || part
      lines.push('<<<<<<< local', ...(conflict.a || []), '||||||| base', ...(conflict.o || []), '=======', ...(conflict.b || []), '>>>>>>> remote')
    }
  }
  return { text: lines.join('\n') + '\n', conflicts: count }
}

export async function resolveConflict(client, config, { space, conflictPath, action }) {
  const { folder, root } = await resolveSpace(client, space, config)
  const { rel: normalized, full } = await resolveInside(root, conflictPath)
  if (!normalized.includes('.sync-conflict-')) throw httpError('INVALID_INPUT', 'not a sync conflict file')
  const original = conflictBaseName(normalized)
  if (!original) throw httpError('INVALID_INPUT', 'cannot determine original file')
  const originalFile = await resolveInside(root, original)
  if (action === 'keep-local') {
    await fs.rm(full, { force: true })
    await scan(client, folder.id)
    return { resolved: true, path: original, action }
  }
  if (action === 'keep-conflict') {
    await atomicWrite(originalFile.full, await fs.readFile(full))
    await fs.rm(full, { force: true })
    await scan(client, folder.id)
    return { resolved: true, path: original, action }
  }
  if (action !== 'merge') throw httpError('INVALID_INPUT', 'action must be keep-local, keep-conflict, or merge')
  const local = await fs.readFile(originalFile.full, 'utf8').catch(() => '')
  const remote = await fs.readFile(full, 'utf8')
  const base = await fs.readFile(baseFile(root, original), 'utf8').catch(() => '')
  const merged = flattenMerge(diff3Merge(
    local.split(/\r?\n/), base.split(/\r?\n/), remote.split(/\r?\n/),
    { excludeFalseConflicts: true },
  ))
  if (merged.conflicts > 0) {
    return { resolved: false, path: original, conflicts: merged.conflicts, text: merged.text }
  }
  await atomicWrite(originalFile.full, merged.text)
  await fs.rm(full, { force: true })
  await scan(client, folder.id)
  return { resolved: true, path: original, action, conflicts: 0 }
}

/** Return local/remote/base text for one conflict so a UI can show a real diff. */
export async function conflictDetail(client, config, { space, conflictPath }) {
  const { root } = await resolveSpace(client, space, config)
  const { rel: normalized, full } = await resolveInside(root, conflictPath)
  if (!normalized.includes('.sync-conflict-')) throw httpError('INVALID_INPUT', 'not a sync conflict file')
  const original = conflictBaseName(normalized)
  if (!original) throw httpError('INVALID_INPUT', 'cannot determine original file')
  const originalFile = await resolveInside(root, original)
  const local = await fs.readFile(originalFile.full, 'utf8').catch(() => '')
  const remote = await fs.readFile(full, 'utf8')
  const base = await fs.readFile(baseFile(root, original), 'utf8').catch(() => '')
  const kind = fileKind(original, local || remote)
  return {
    originalPath: original,
    conflictPath: normalized,
    kind,
    local,
    remote,
    base,
    localExists: Boolean(local),
    baseExists: Boolean(base),
    sha256: { local: sha256(Buffer.from(local)), remote: sha256(Buffer.from(remote)), base: sha256(Buffer.from(base)) },
  }
}
