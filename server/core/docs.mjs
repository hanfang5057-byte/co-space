import { promises as fs } from 'node:fs'
import { createHash } from 'node:crypto'
import { httpError, resolveInside } from './util.mjs'
import { resolveSpace } from './spaces.mjs'
import { readFile, writeFile } from './files.mjs'
import {
  broadcast, createProposal, currentLease, docId, listProposals, listVersions,
  localDeviceId, readHeads, recordVersion, updateProposal,
} from './live.mjs'

const sha256 = (text) => createHash('sha256').update(String(text)).digest('hex')

// ---------------------------------------------------------------------------
// Block model
// ---------------------------------------------------------------------------

const FENCE = /^\s{0,3}(```|~~~)/
const HEADING = /^\s{0,3}(#{1,6})\s+(.*)\s*$/
const BLANK = /^\s*$/

function blockKind(lines) {
  const first = lines.find(line => !BLANK.test(line)) ?? ''
  if (HEADING.test(first)) return 'heading'
  if (/^\s*([-*+]|\d+\.)\s+/.test(first)) return 'list'
  if (/^\s*>/.test(first)) return 'quote'
  if (/^\s*\|/.test(first)) return 'table'
  if (/^\s*---+\s*$/.test(first) && lines.length === 1) return 'hr'
  return 'paragraph'
}

/**
 * Split Markdown into top-level blocks with stable-within-version anchors.
 *
 * A block is a run of non-blank lines outside fenced code; a heading always
 * starts a new block. `anchor = { section, index, heading }` identifies a
 * block for agents: `section` counts heading sections from 0, `index` counts
 * blocks inside that section.
 */
export function parseBlocks(markdown) {
  const lines = String(markdown ?? '').split('\n')
  const blocks = []
  let inFence = false
  let section = 0
  let heading = ''
  let nextIndex = 0
  let current = null

  const startBlock = (lineNo) => {
    current = { lines: [], start: lineNo, section, heading, index: nextIndex }
    nextIndex += 1
  }
  const flush = () => {
    if (!current || current.lines.length === 0) { current = null; return }
    const text = current.lines.join('\n')
    blocks.push({
      blockId: `${current.section}:${current.index}`,
      kind: blockKind(current.lines),
      heading: current.heading,
      section: current.section,
      index: current.index,
      startLine: current.start,
      endLine: current.start + current.lines.length,
      text,
      sha256: sha256(text),
    })
    current = null
  }

  for (let lineNo = 0; lineNo < lines.length; lineNo++) {
    const line = lines[lineNo]
    if (FENCE.test(line)) {
      if (!current) startBlock(lineNo)
      current.lines.push(line)
      inFence = !inFence
      continue
    }
    if (inFence) {
      if (!current) startBlock(lineNo)
      current.lines.push(line)
      continue
    }
    if (BLANK.test(line)) { flush(); continue }

    const headingMatch = HEADING.exec(line)
    if (headingMatch) {
      flush()
      section += 1
      heading = headingMatch[2].trim()
      nextIndex = 0
      startBlock(lineNo)
      current.lines.push(line)
      flush()
      continue
    }

    if (!current) startBlock(lineNo)
    current.lines.push(line)
  }
  flush()
  return blocks
}

function findBlock(blocks, { blockId, anchor }) {
  if (blockId) {
    const found = blocks.find(block => block.blockId === blockId)
    if (found) return found
  }
  if (anchor) {
    const candidates = blocks.filter(block => {
      if (anchor.heading != null && block.heading !== String(anchor.heading)) return false
      if (anchor.section != null && block.section !== Number(anchor.section)) return false
      if (anchor.index != null && block.index !== Number(anchor.index)) return false
      return true
    })
    if (candidates.length === 1) return candidates[0]
    if (candidates.length > 1 && anchor.kind) return candidates.find(block => block.kind === anchor.kind) ?? null
  }
  return null
}

/**
 * Apply structural ops to Markdown text.
 *
 * Ops are resolved against the current block list, then spliced by line range
 * from the bottom up so earlier line numbers stay valid.
 */
export function applyOps(markdown, ops) {
  if (!Array.isArray(ops) || ops.length === 0) throw httpError('INVALID_INPUT', 'ops must be a non-empty array')
  let text = String(markdown ?? '')
  const applied = []

  for (const op of ops) {
    const blocks = parseBlocks(text)
    const lines = text.split('\n')
    const kind = String(op?.op || '')
    const markdownPart = String(op?.markdown ?? '').replace(/\s+$/, '')
    const linesOf = (value) => (value === '' ? [] : String(value).split('\n'))

    if (kind === 'append_section') {
      const body = linesOf(markdownPart)
      text = text.replace(/\s*$/, '') + '\n\n' + body.join('\n') + '\n'
      applied.push({ op: kind, heading: op.heading ?? null })
      continue
    }

    const block = findBlock(blocks, op)
    if (!block) throw httpError('EDIT_NOT_APPLIED', `block not found: ${JSON.stringify(op.blockId || op.anchor)}`)

    if (kind === 'replace_block') {
      const next = [...lines.slice(0, block.startLine), ...linesOf(markdownPart), ...lines.slice(block.endLine)]
      text = next.join('\n')
      applied.push({ op: kind, blockId: block.blockId, heading: block.heading })
      continue
    }
    if (kind === 'delete_block') {
      const next = [...lines.slice(0, block.startLine), ...lines.slice(block.endLine)]
      text = next.join('\n').replace(/\n{3,}/g, '\n\n')
      applied.push({ op: kind, blockId: block.blockId })
      continue
    }
    if (kind === 'insert_after') {
      const at = block.endLine
      const next = [...lines.slice(0, at), ...(linesOf(markdownPart).length ? ['', ...linesOf(markdownPart)] : []), ...lines.slice(at)]
      text = next.join('\n')
      applied.push({ op: kind, blockId: block.blockId, heading: block.heading })
      continue
    }
    if (kind === 'insert_before') {
      const next = [...lines.slice(0, block.startLine), ...linesOf(markdownPart), '', ...lines.slice(block.startLine)]
      text = next.join('\n')
      applied.push({ op: kind, blockId: block.blockId, heading: block.heading })
      continue
    }
    if (kind === 'replace_text') {
      const oldText = String(op.oldText ?? '')
      const newText = String(op.newText ?? '')
      if (!oldText) throw httpError('INVALID_INPUT', 'replace_text requires oldText')
      if (!block.text.includes(oldText)) throw httpError('EDIT_NOT_APPLIED', `oldText not found in ${block.blockId}`)
      const patched = block.text.replace(oldText, newText)
      const next = [...lines.slice(0, block.startLine), ...patched.split('\n'), ...lines.slice(block.endLine)]
      text = next.join('\n')
      applied.push({ op: kind, blockId: block.blockId })
      continue
    }
    throw httpError('INVALID_INPUT', `unknown op: ${kind}`)
  }

  return { text: text.replace(/\s+$/, '') + '\n', applied }
}

// ---------------------------------------------------------------------------
// Document tools
// ---------------------------------------------------------------------------

async function resolveDoc(client, config, { space, path: rel }) {
  const { folder, root } = await resolveSpace(client, space, config)
  const { rel: normalized, full } = await resolveInside(root, rel)
  return { folder, root, rel: normalized, full }
}

export async function docBlocks(client, config, { space, path: rel, heading, limit = 200 }) {
  const { rel: normalized, full } = await resolveDoc(client, config, { space, path: rel })
  const text = await fs.readFile(full, 'utf8')
  let blocks = parseBlocks(text)
  if (heading != null) blocks = blocks.filter(block => block.heading === String(heading))
  const rows = blocks.slice(0, Math.max(1, Math.min(500, Number(limit) || 200)))
    .map(block => ({
      blockId: block.blockId, kind: block.kind, heading: block.heading,
      section: block.section, index: block.index,
      lines: [block.startLine, block.endLine], sha256: block.sha256,
      text: block.text.length > 2000 ? `${block.text.slice(0, 2000)}…` : block.text,
    }))
  return {
    space: (await resolveSpace(client, space, config)).folder.id,
    path: normalized,
    sha256: sha256(text),
    total: parseBlocks(text).length,
    blocks: rows,
  }
}

export async function docPatch(client, config, { space, path: rel, expectedSha256, ops, writer = 'agent', holder } = {}) {
  const { folder, root, rel: normalized, full } = await resolveDoc(client, config, { space, path: rel })
  const current = await fs.readFile(full, 'utf8')
  const currentSha = sha256(current)

  if (expectedSha256 && expectedSha256 !== currentSha) {
    const blocks = parseBlocks(current).map(block => ({ blockId: block.blockId, heading: block.heading, kind: block.kind, sha256: block.sha256 }))
    throw httpError('VERSION_CONFLICT', 'document changed since it was read', { currentSha256: currentSha, blocks })
  }

  const lease = await currentLease(root, normalized)
  const device = await localDeviceId(client)
  const allowed = !lease || lease.force
    || (holder ? lease.holder === holder : (lease.device != null && lease.device === device))
  if (!allowed) {
    throw httpError('LOCKED', `${lease.label || lease.holder} is editing this document`, {
      holder: lease.holder, label: lease.label, expiresAt: lease.expiresAt,
    })
  }

  const { text, applied } = applyOps(current, ops)
  const meta = await writeFile(client, config, {
    space, path: normalized, content: text, expectedSha256: currentSha, overwrite: true, base: 'save',
  })
  await recordVersion(root, normalized, text, { writer: device, by: writer })
  broadcast(folder.id, { type: 'doc-change', path: normalized, sha256: meta.sha256, source: writer })
  return { path: normalized, sha256: meta.sha256, applied, blocks: parseBlocks(text).length }
}

export async function docPropose(client, config, { space, path: rel, expectedSha256, ops, rationale, author = 'agent' } = {}) {
  const { folder, root, rel: normalized, full } = await resolveDoc(client, config, { space, path: rel })
  const current = await fs.readFile(full, 'utf8')
  if (expectedSha256 && expectedSha256 !== sha256(current)) {
    throw httpError('VERSION_CONFLICT', 'document changed since it was read', { currentSha256: sha256(current) })
  }
  const proposal = await createProposal(client, config, {
    space, path: normalized, baseSha: sha256(current), ops, rationale, author,
  })
  broadcast(folder.id, { type: 'proposal', path: normalized, proposal })
  return proposal
}

export async function docProposals(client, config, { space, path: rel, status = 'pending' } = {}) {
  return { path: rel, proposals: await listProposals(client, config, { space, path: rel, status }) }
}

export async function docResolveProposal(client, config, { space, path: rel, id, accept = false, writer = 'human' } = {}) {
  const { folder, root, rel: normalized, full } = await resolveDoc(client, config, { space, path: rel })
  const proposals = await listProposals(client, config, { space, path: rel, status: 'pending' })
  const proposal = proposals.find(row => row.id === id)
  if (!proposal) throw httpError('FILE_NOT_FOUND', `proposal not found: ${id}`)
  if (!accept) {
    const next = await updateProposal(client, config, { space, path: rel, id, status: 'rejected' })
    broadcast(folder.id, { type: 'proposal-resolved', path: normalized, proposal: next })
    return next
  }
  const current = await fs.readFile(full, 'utf8')
  const { text, applied } = applyOps(current, proposal.ops)
  const meta = await writeFile(client, config, {
    space, path: normalized, content: text, expectedSha256: sha256(current), overwrite: true, base: 'save',
  })
  await recordVersion(root, normalized, text, { writer: await localDeviceId(client), by: writer })
  const next = await updateProposal(client, config, { space, path: rel, id, status: 'accepted' })
  broadcast(folder.id, { type: 'proposal-resolved', path: normalized, proposal: next })
  return { ...next, sha256: meta.sha256, applied }
}

export async function docVersions(client, config, { space, path: rel, limit = 30 } = {}) {
  const { root, rel: normalized } = await resolveDoc(client, config, { space, path: rel })
  const versions = await listVersions(root, normalized, { limit })
  return { path: normalized, versions, heads: await readHeads(root, normalized) }
}

export async function docRestore(client, config, { space, path: rel, sha, writer = 'human' } = {}) {
  const { folder, root, rel: normalized, full } = await resolveDoc(client, config, { space, path: rel })
  const versionFile = `${root}/.live/versions/${docId(normalized)}/${sha}.md`
  const text = await fs.readFile(versionFile, 'utf8').catch(() => null)
  if (text == null) throw httpError('FILE_NOT_FOUND', `version not found: ${sha}`)
  const current = await fs.readFile(full, 'utf8')
  const meta = await writeFile(client, config, {
    space, path: normalized, content: text, expectedSha256: sha256(current), overwrite: true, base: 'save',
  })
  await recordVersion(root, normalized, text, { writer: await localDeviceId(client), by: writer })
  broadcast(folder.id, { type: 'doc-change', path: normalized, sha256: meta.sha256, source: 'restore' })
  return { path: normalized, restored: sha, sha256: meta.sha256 }
}
