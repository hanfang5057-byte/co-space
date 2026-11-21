import { createHash, randomBytes } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'

export const IGNORED = new Set(['.space', '.stfolder', '.stversions', '.git', 'node_modules'])

export function nowIso() {
  return new Date().toISOString()
}

export function slugify(value, fallback = 'untitled') {
  const ascii = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return ascii || fallback
}

export function spaceId(name) {
  return `${slugify(name, 'space')}-${randomBytes(2).toString('hex')}`
}

/** File-name slug that keeps Unicode letters (Chinese titles stay readable). */
export function fileSlug(value, fallback = 'untitled') {
  const cleaned = String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
  return cleaned || fallback
}

export function normalizeRel(input, { allowEmpty = false } = {}) {
  if (typeof input !== 'string') throw httpError('PATH_INVALID', 'path must be a string')
  const raw = input.replace(/\\/g, '/').trim()
  if (!raw) {
    if (allowEmpty) return ''
    throw httpError('PATH_INVALID', 'path is required')
  }
  if (raw.startsWith('/') || /^[a-zA-Z]:/.test(raw) || raw.includes('\0')) {
    throw httpError('PATH_INVALID', 'absolute paths are not allowed')
  }
  if (raw.split('/').some(part => part === '..')) throw httpError('PATH_INVALID', 'parent traversal is not allowed')
  const normalized = path.posix.normalize(raw).replace(/^\.\/+/, '').replace(/\/+$/, '')
  if (normalized === '.' || normalized.startsWith('../')) throw httpError('PATH_INVALID', 'invalid relative path')
  if (normalized.length > 512) throw httpError('PATH_INVALID', 'path is too long')
  return normalized
}

export function httpError(code, message, details) {
  return Object.assign(new Error(message), { code, details })
}

export async function fileExists(file) {
  try { await fs.access(file); return true } catch { return false }
}

export async function assertNoSymlink(root, rel) {
  const parts = normalizeRel(rel, { allowEmpty: true }).split('/').filter(Boolean)
  let current = root
  for (const part of parts) {
    current = path.join(current, part)
    try {
      const stat = await fs.lstat(current)
      if (stat.isSymbolicLink()) throw httpError('PATH_INVALID', 'symbolic links are not allowed')
    } catch (error) {
      if (error.code === 'ENOENT') return
      throw error
    }
  }
}

export async function resolveInside(root, rel) {
  const normalized = normalizeRel(rel, { allowEmpty: true })
  const full = path.resolve(root, normalized)
  const base = path.resolve(root)
  if (full !== base && !full.startsWith(base + path.sep)) throw httpError('PATH_INVALID', 'path escapes the space')
  await assertNoSymlink(base, normalized)
  return { rel: normalized, full }
}

export async function atomicWrite(file, data) {
  const dir = path.dirname(file)
  await fs.mkdir(dir, { recursive: true })
  const temp = path.join(dir, `.${path.basename(file)}.${randomBytes(6).toString('hex')}.tmp`)
  const handle = await fs.open(temp, 'w', 0o600)
  try {
    await handle.writeFile(data)
    await handle.sync()
  } finally {
    await handle.close()
  }
  try {
    await fs.rename(temp, file)
  } catch (error) {
    await fs.rm(temp, { force: true }).catch(() => {})
    throw error
  }
}

export function sha256(data) {
  return createHash('sha256').update(data).digest('hex')
}

export async function fileSha256(file) {
  const buffer = await fs.readFile(file)
  return sha256(buffer)
}

export async function readText(file, limit = 2_097_152) {
  const stat = await fs.stat(file)
  if (stat.size > limit) throw httpError('LIMIT_EXCEEDED', `file is too large to read as text (${stat.size} bytes)`)
  return fs.readFile(file, 'utf8')
}

export function fileKind(rel, content = '') {
  const lower = rel.toLowerCase()
  if (lower.endsWith('.slides.md')) return 'slides'
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) {
    return /^---[\s\S]*?\bmarp\s*:\s*true\b/.test(content.slice(0, 800)) ? 'slides' : 'document'
  }
  if (lower.endsWith('.csv') || lower.endsWith('.tsv')) return 'table'
  if (lower.endsWith('.ods')) return 'workbook'
  if (/\.(png|jpe?g|gif|webp|svg|avif)$/.test(lower)) return 'image'
  return 'file'
}

export function isTextKind(kind) {
  return kind === 'document' || kind === 'slides' || kind === 'table'
}

export function titleFromPath(rel) {
  const base = path.posix.basename(rel).replace(/\.(slides\.)?md$/i, '').replace(/\.(csv|tsv)$/i, '')
  return base.replace(/[-_]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}

export async function walk(root, rel = '', options = {}) {
  const maxDepth = options.maxDepth ?? 8
  const includeIgnored = options.includeIgnored ?? false
  const output = []
  const start = path.join(root, rel)
  await walkInto(start, rel, 0)
  return output

  async function walkInto(dir, currentRel, depth) {
    if (depth > maxDepth) return
    let entries
    try { entries = await fs.readdir(dir, { withFileTypes: true }) } catch (error) {
      if (error.code === 'ENOENT') return
      throw error
    }
    entries.sort((a, b) => a.name.localeCompare(b.name))
    for (const entry of entries) {
      if (!includeIgnored && IGNORED.has(entry.name)) continue
      if (!includeIgnored && (entry.name.endsWith('.tmp') || entry.name.includes('.sync-conflict-'))) continue
      if (entry.isSymbolicLink()) continue
      const full = path.join(dir, entry.name)
      const relPath = currentRel ? `${currentRel}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        output.push({ path: relPath, name: entry.name, type: 'directory' })
        await walkInto(full, relPath, depth + 1)
      } else if (entry.isFile()) {
        const stat = await fs.stat(full)
        let content = ''
        if (options.readHead && /\.(md|markdown)$/i.test(entry.name)) {
          try { content = (await fs.readFile(full, 'utf8')).slice(0, 800) } catch {}
        }
        output.push({
          path: relPath,
          name: entry.name,
          type: 'file',
          kind: fileKind(relPath, content),
          size: stat.size,
          mtimeMs: stat.mtimeMs,
        })
      }
    }
  }
}

export function conflictBaseName(file) {
  const match = path.posix.basename(file).match(/^(.*)\.sync-conflict-\d{8}-\d{6}-[^.]+(\.[^.]+)$/)
  if (!match) return null
  return path.posix.join(path.posix.dirname(file), match[1] + match[2])
}
