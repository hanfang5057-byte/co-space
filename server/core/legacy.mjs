import { promises as fs } from 'node:fs'
import path from 'node:path'
import { atomicWrite, fileKind, normalizeRel, resolveInside, walk } from './util.mjs'
import { resolveSpace } from './spaces.mjs'

const FRONT_MATTER = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/

export function hasFrontMatter(text) {
  return FRONT_MATTER.test(String(text ?? ''))
}

export function stripFrontMatter(text) {
  return String(text ?? '').replace(FRONT_MATTER, '')
}

function trashRoot(config, spaceId) {
  return path.join(config.spacesRoot, '..', 'trash', `legacy-${spaceId}-${Date.now()}`)
}

/**
 * List retired content: CSV/TSV/ODS, Marp decks, and Markdown that still
 * carries a YAML front matter block.
 */
export async function scanLegacy(client, config, { space }) {
  const { root, folder } = await resolveSpace(client, space, config)
  const entries = await walk(root, '', { readHead: true, maxDepth: 8 })
  const files = []
  let bytes = 0

  for (const entry of entries) {
    if (entry.type !== 'file') continue
    const lower = entry.path.toLowerCase()
    const isMarkdown = lower.endsWith('.md') || lower.endsWith('.markdown')
    let action = null
    if (fileKind(entry.path) === 'legacy') action = 'trash'
    else if (isMarkdown) {
      const text = await fs.readFile(path.join(root, entry.path), 'utf8').catch(() => '')
      if (hasFrontMatter(text)) action = 'strip'
    }
    if (!action) continue
    bytes += entry.size || 0
    files.push({ path: entry.path, kind: entry.kind, size: entry.size || 0, action })
  }

  const stripCount = files.filter(file => file.action === 'strip').length
  return {
    space: folder.id,
    total: files.length,
    bytes,
    stripCount,
    trashCount: files.length - stripCount,
    files,
  }
}

/**
 * Move retired files into the local trash folder and/or strip YAML front
 * matter from Markdown documents. Never deletes: every touched file keeps a
 * copy under `<spacesRoot>/../trash/legacy-<spaceId>-<ts>/`.
 *
 * @param {object} options
 * @param {boolean} [options.dryRun] - report only; no writes, no moves.
 * @param {boolean} [options.deleteMarkdown] - move every legacy Markdown file
 *   to the trash instead of stripping its front matter.
 */
export async function cleanupLegacy(client, config, { space, dryRun = false, deleteMarkdown = false } = {}) {
  const report = await scanLegacy(client, config, { space })
  const plan = report.files.map(file => ({
    ...file,
    action: file.action === 'strip' && deleteMarkdown ? 'trash' : file.action,
  }))
  if (dryRun) {
    return { ...report, files: plan, dryRun: true, stripCount: plan.filter(f => f.action === 'strip').length, trashCount: plan.filter(f => f.action === 'trash').length }
  }

  const { folder, root } = await resolveSpace(client, space, config)
  const trash = trashRoot(config, folder.id)
  const result = { space: folder.id, trashed: [], stripped: [], failed: [] }

  const moveToTrash = async (rel) => {
    const { full } = await resolveInside(root, rel)
    const target = path.join(trash, normalizeRel(rel))
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.rename(full, target)
    return target
  }

  for (const file of plan) {
    try {
      if (file.action === 'trash') {
        const to = await moveToTrash(file.path)
        result.trashed.push({ path: file.path, trashPath: to })
        continue
      }
      const { full } = await resolveInside(root, file.path)
      const text = await fs.readFile(full, 'utf8')
      const body = stripFrontMatter(text)
      // Keep a recoverable copy before rewriting.
      const backup = path.join(trash, normalizeRel(file.path))
      await fs.mkdir(path.dirname(backup), { recursive: true })
      await fs.copyFile(full, backup)
      await atomicWrite(full, body)
      result.stripped.push({ path: file.path, backupPath: backup })
    } catch (error) {
      result.failed.push({ path: file.path, message: error.message })
    }
  }

  await client.scan(folder.id).catch(() => {})
  return {
    ...result,
    dryRun: false,
    trashedCount: result.trashed.length,
    strippedCount: result.stripped.length,
    trashRoot: result.trashed.length + result.stripped.length > 0 ? trash : null,
  }
}
