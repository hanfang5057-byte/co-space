import { McpServer } from '@modelcontextprotocol/server'
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio'
import { z } from 'zod'
import path from 'node:path'
import { resolveHome, loadConfig, ensureHome } from './config.mjs'
import { ensureDaemon, stopDaemon, daemonStatus } from './daemon.mjs'
import {
  createSpace, listSpaces, getSpace, treeSpace, spaceContext, updateSpace, deleteSpace,
  inviteSpace, joinSpace, memberInfo, approveMember, removeMember, syncStatus, waitSync,
  resolveSpace, findSpaceConflicts,
} from './core/spaces.mjs'
import {
  listFiles, readFile, writeFile, editFile, moveFile, deleteFile, importFile, outlineFile,
  conflicts, resolveConflict, conflictDetail,
} from './core/files.mjs'
import { createDocumentFile, appendDocumentFile } from './core/content.mjs'
import { scanLegacy, cleanupLegacy } from './core/legacy.mjs'
import {
  docBlocks, docPatch, docPropose, docProposals, docResolveProposal, docRestore, docVersions,
} from './core/docs.mjs'
import { readPresence } from './core/live.mjs'

const home = resolveHome()
const logger = { info: (...args) => console.error('[dsh-space]', ...args), warn: (...args) => console.error('[dsh-space]', ...args) }
let configPromise
let daemonPromise

async function getConfig() {
  if (!configPromise) configPromise = loadConfig(home)
  return configPromise
}

async function getDaemon() {
  if (!daemonPromise) {
    daemonPromise = (async () => {
      await ensureHome(home)
      const config = await getConfig()
      return ensureDaemon(home, config, logger)
    })().catch(error => { daemonPromise = undefined; throw error })
  }
  return daemonPromise
}

async function context() {
  const [config, daemon] = await Promise.all([getConfig(), getDaemon()])
  return { home, config, client: daemon.client, runtime: daemon.runtime }
}

function ok(data) {
  const structured = data && typeof data === 'object' && !Array.isArray(data) ? data : undefined
  return {
    ...(structured ? { structuredContent: structured } : {}),
    content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data) }],
  }
}

function fail(error) {
  const code = error?.code || 'INTERNAL'
  const message = error?.message || String(error)
  return { isError: true, content: [{ type: 'text', text: JSON.stringify({ error: { code, message } }) }] }
}

function wrap(fn) {
  return async (args) => { try { return ok(await fn(args)) } catch (error) { logger.warn?.(error.stack || error.message); return fail(error) } }
}

const server = new McpServer({
  name: 'space',
  version: '0.1.0',
  instructions: [
    'Spaces are local folders synchronized by Syncthing between trusted devices.',
    'Native content is open text Markdown .md documents. Tables and slide decks are retired: files in those formats are readable as plain text but must not be created.',
    'Call space_context first when entering a space; it returns the home page, page tree, recent files, and conflicts.',
    'Prefer file_edit for small changes; pass expectedSha256 when overwriting.',
    'After writes, use space_wait_sync to confirm peers received them.',
    'If file_conflicts reports entries, resolve them before further edits.',
    'Prefer file_edit over file_write: a whole-file write discards other writers edits.',
    'For documents, call doc_blocks first, then doc_patch with block anchors; large or destructive changes should be doc_propose so a human can accept them.',
    'doc_patch returns LOCKED when someone holds the edit right; do not retry in a loop, switch to doc_propose.',
    'Check doc_presence before editing a block that someone else is working on.',
    'Never store secrets in a space; any approved member can read every file.',
  ].join('\n'),
})

const spaceRef = z.string().min(1).describe('Space id or name')
const relPath = z.string().min(1).describe('Relative POSIX path inside the space')

server.registerTool('space_list', {
  description: 'List spaces with counts and sync summaries.',
  inputSchema: z.object({ filter: z.enum(['all', 'owned', 'shared']).optional() }),
}, wrap(async ({ filter = 'all' }) => {
  const { client, config } = await context()
  return listSpaces(client, config, { filter })
}))

server.registerTool('space_create', {
  description: 'Create a new space (Syncthing folder) with the standard pages/assets layout.',
  inputSchema: z.object({ name: z.string().min(1).max(80), description: z.string().optional() }),
}, wrap(async ({ name, description }) => {
  const { client, config } = await context()
  return createSpace(client, config, { name, description })
}))

server.registerTool('space_get', {
  description: 'Get one space, its stats, and member summary.',
  inputSchema: z.object({ space: spaceRef }),
}, wrap(async ({ space }) => {
  const { client, config } = await context()
  const value = await getSpace(client, config, space)
  const members = await memberInfo(client, config, space).catch(() => ({ members: [] }))
  return { ...value, members: members.members }
}))

server.registerTool('space_tree', {
  description: 'Return the page/asset tree of a space.',
  inputSchema: z.object({ space: spaceRef, parent: z.string().optional(), depth: z.number().int().min(1).max(12).optional() }),
}, wrap(async ({ space, parent = '', depth = 8 }) => {
  const { client, config } = await context()
  return treeSpace(client, config, { space, parent, depth })
}))

server.registerTool('space_context', {
  description: 'Get a bounded context pack for an agent: home excerpt, page tree, recent files, conflicts.',
  inputSchema: z.object({ space: spaceRef, maxChars: z.number().int().min(1000).max(50000).optional() }),
}, wrap(async ({ space, maxChars = 8000 }) => {
  const { client, config } = await context()
  return spaceContext(client, config, { space, maxChars })
}))

server.registerTool('space_update', {
  description: 'Rename a space or change its description.',
  inputSchema: z.object({ space: spaceRef, name: z.string().min(1).max(80).optional(), description: z.string().optional() }),
}, wrap(async ({ space, name, description }) => {
  const { client, config } = await context()
  return updateSpace(client, config, { space, name, description })
}))

server.registerTool('space_delete', {
  description: 'Move a space to the local trash and remove its local Syncthing folder. Other devices keep their copies.',
  inputSchema: z.object({ space: spaceRef, confirm: z.union([z.boolean(), z.string()]) }),
}, wrap(async ({ space, confirm }) => {
  const { client, config } = await context()
  return deleteSpace(client, config, { space, confirm })
}))

server.registerTool('space_invite', {
  description: 'Create an invite token for another device to join a space.',
  inputSchema: z.object({ space: spaceRef }),
}, wrap(async ({ space }) => {
  const { client, config } = await context()
  return inviteSpace(client, config, space)
}))

server.registerTool('space_join', {
  description: 'Join a space using an invite token. The creator must approve this device afterwards.',
  inputSchema: z.object({ invite: z.string().min(1), localPath: z.string().optional() }),
}, wrap(async ({ invite, localPath }) => {
  const { client, config } = await context()
  return joinSpace(client, config, { invite, localPath })
}))

server.registerTool('space_members', {
  description: 'List members, pending devices, and pending folders for a space.',
  inputSchema: z.object({ space: spaceRef }),
}, wrap(async ({ space }) => {
  const { client, config } = await context()
  return memberInfo(client, config, space)
}))

server.registerTool('space_approve_member', {
  description: 'Approve a pending device and share a space with it.',
  inputSchema: z.object({ space: spaceRef, deviceId: z.string().min(1), name: z.string().optional() }),
}, wrap(async ({ space, deviceId, name }) => {
  const { client, config } = await context()
  return approveMember(client, config, { space, deviceId, name })
}))

server.registerTool('space_remove_member', {
  description: 'Remove a device from a space. Existing files on that device are not deleted.',
  inputSchema: z.object({ space: spaceRef, deviceId: z.string().min(1) }),
}, wrap(async ({ space, deviceId }) => {
  const { client, config } = await context()
  return removeMember(client, config, { space, deviceId })
}))

server.registerTool('space_sync_status', {
  description: 'Return sync state, peer completion, and conflict count for a space.',
  inputSchema: z.object({ space: spaceRef }),
}, wrap(async ({ space }) => {
  const { client, config } = await context()
  return syncStatus(client, config, { space })
}))

server.registerTool('space_wait_sync', {
  description: 'Wait until a space is locally synced or the timeout expires.',
  inputSchema: z.object({ space: spaceRef, timeoutMs: z.number().int().min(1000).max(60000).optional() }),
}, wrap(async ({ space, timeoutMs = 10000 }) => {
  const { client, config } = await context()
  return waitSync(client, config, { space, timeoutMs })
}))

server.registerTool('space_rescan', {
  description: 'Trigger a Syncthing scan of a space or one subpath.',
  inputSchema: z.object({ space: spaceRef, sub: z.string().optional() }),
}, wrap(async ({ space, sub }) => {
  const { client } = await context()
  const { folder } = await resolveSpace(client, space, await getConfig())
  await client.scan(folder.id, sub)
  return { space: folder.id, scanned: true, sub: sub || null }
}))

server.registerTool('space_daemon', {
  description: 'Inspect or control the local Syncthing daemon.',
  inputSchema: z.object({ action: z.enum(['status', 'start', 'stop', 'restart']) }),
}, wrap(async ({ action }) => {
  if (action === 'status') return daemonStatus(home)
  if (action === 'stop') { daemonPromise = undefined; return stopDaemon(home, logger) }
  if (action === 'restart') { daemonPromise = undefined; await stopDaemon(home, logger).catch(() => {}); const daemon = await getDaemon(); return daemonStatus(home) }
  const daemon = await getDaemon()
  return daemonStatus(home)
}))

server.registerTool('file_list', {
  description: 'List files and directories under a space path.',
  inputSchema: z.object({
    space: spaceRef, path: z.string().optional(), recursive: z.boolean().optional(),
    limit: z.number().int().min(1).max(2000).optional(), cursor: z.number().int().min(0).optional(),
  }),
}, wrap(async ({ space, path: rel = '', recursive = true, limit = 500, cursor = 0 }) => {
  const { client, config } = await context()
  return listFiles(client, config, { space, path: rel, recursive, limit, cursor })
}))

server.registerTool('file_read', {
  description: 'Read a text file (Markdown, CSV, Marp) with rendered HTML and structure when available.',
  inputSchema: z.object({ space: spaceRef, path: relPath, maxChars: z.number().int().min(1000).max(100000).optional() }),
}, wrap(async ({ space, path: rel, maxChars = 20000 }) => {
  const { client, config } = await context()
  return readFile(client, config, { space, path: rel, maxChars })
}))

server.registerTool('file_write', {
  description: 'Write a whole text file atomically. Use expectedSha256 or overwrite for existing files.',
  inputSchema: z.object({
    space: spaceRef, path: relPath, content: z.string(),
    expectedSha256: z.string().optional(), overwrite: z.boolean().optional(),
  }),
}, wrap(async ({ space, path: rel, content, expectedSha256, overwrite = false }) => {
  const { client, config } = await context()
  return writeFile(client, config, { space, path: rel, content, expectedSha256, overwrite, base: 'save' })
}))

server.registerTool('file_edit', {
  description: 'Replace exact text in a file. Each edit must match uniquely unless replaceAll is set.',
  inputSchema: z.object({
    space: spaceRef, path: relPath,
    expectedSha256: z.string().optional(),
    edits: z.array(z.object({ oldText: z.string().min(1), newText: z.string(), replaceAll: z.boolean().optional() })).min(1),
  }),
}, wrap(async ({ space, path: rel, expectedSha256, edits }) => {
  const { client, config } = await context()
  return editFile(client, config, { space, path: rel, expectedSha256, edits })
}))

server.registerTool('file_move', {
  description: 'Move or rename a file inside a space.',
  inputSchema: z.object({ space: spaceRef, from: relPath, to: relPath, overwrite: z.boolean().optional() }),
}, wrap(async ({ space, from, to, overwrite = false }) => {
  const { client, config } = await context()
  return moveFile(client, config, { space, from, to, overwrite })
}))

server.registerTool('file_delete', {
  description: 'Delete one file from a space. Requires confirm=true.',
  inputSchema: z.object({ space: spaceRef, path: relPath, confirm: z.boolean() }),
}, wrap(async ({ space, path: rel, confirm }) => {
  const { client, config } = await context()
  return deleteFile(client, config, { space, path: rel, confirm })
}))

server.registerTool('file_import', {
  description: 'Copy a local image or attachment into a space; content is not parsed or converted.',
  inputSchema: z.object({ space: spaceRef, sourcePath: z.string().min(1), path: z.string().optional() }),
}, wrap(async ({ space, sourcePath, path: rel }) => {
  const { client, config } = await context()
  return importFile(client, config, { space, sourcePath, path: rel })
}))

server.registerTool('file_outline', {
  description: 'Return the heading/slide/column outline of a file.',
  inputSchema: z.object({ space: spaceRef, path: relPath }),
}, wrap(async ({ space, path: rel }) => {
  const { client, config } = await context()
  return outlineFile(client, config, { space, path: rel })
}))

server.registerTool('file_conflicts', {
  description: 'List unresolved Syncthing conflict files in a space.',
  inputSchema: z.object({ space: spaceRef }),
}, wrap(async ({ space }) => {
  const { client, config } = await context()
  return conflicts(client, config, { space })
}))

server.registerTool('file_conflict_detail', {
  description: 'Read local, remote, and base text for one sync conflict.',
  inputSchema: z.object({ space: spaceRef, conflictPath: relPath }),
}, wrap(async ({ space, conflictPath }) => {
  const { client, config } = await context()
  return conflictDetail(client, config, { space, conflictPath })
}))

server.registerTool('file_resolve_conflict', {
  description: 'Resolve a sync conflict by keeping local, keeping the conflict version, or three-way merging.',
  inputSchema: z.object({
    space: spaceRef, conflictPath: relPath,
    action: z.enum(['keep-local', 'keep-conflict', 'merge']),
  }),
}, wrap(async ({ space, conflictPath, action }) => {
  const { client, config } = await context()
  return resolveConflict(client, config, { space, conflictPath, action })
}))

server.registerTool('doc_create', {
  description: 'Create a Markdown document. Path defaults to pages/<slug>.md; parent adds a subpage folder.',
  inputSchema: z.object({
    space: spaceRef, path: z.string().optional(), parent: z.string().optional(),
    title: z.string().optional(), markdown: z.string().optional(),
    template: z.enum(['blank', 'project-brief', 'meeting-notes', 'decision-log']).optional(),
  }),
}, wrap(async ({ space, path: rel, parent, title, markdown = '', template = 'blank' }) => {
  const { client, config } = await context()
  return createDocumentFile(client, config, { space, path: rel, parent, title, markdown, template })
}))

server.registerTool('doc_append', {
  description: 'Append Markdown to an existing document.',
  inputSchema: z.object({ space: spaceRef, path: relPath, markdown: z.string(), expectedSha256: z.string().optional() }),
}, wrap(async ({ space, path: rel, markdown, expectedSha256 }) => {
  const { client, config } = await context()
  return appendDocumentFile(client, config, { space, path: rel, markdown, expectedSha256 })
}))

server.registerTool('space_cleanup_legacy', {
  description: 'List or clean retired content (CSV, Marp decks, Markdown with YAML front matter). Files move to the local trash folder; nothing is deleted outright.',
  inputSchema: z.object({
    space: spaceRef,
    dryRun: z.boolean().optional(),
    deleteMarkdown: z.boolean().optional(),
  }),
}, wrap(async ({ space, dryRun = true, deleteMarkdown = false }) => {
  const { client, config } = await context()
  if (dryRun) return scanLegacy(client, config, { space })
  return cleanupLegacy(client, config, { space, deleteMarkdown })
}))

server.registerTool('doc_blocks', {
  description: 'List document blocks with stable anchors (blockId, heading, section, line range, sha). Call this before doc_patch.',
  inputSchema: z.object({ space: spaceRef, path: relPath, heading: z.string().optional(), limit: z.number().int().min(1).max(500).optional() }),
}, wrap(async ({ space, path: rel, heading, limit = 200 }) => {
  const { client, config } = await context()
  return docBlocks(client, config, { space, path: rel, heading, limit })
}))

server.registerTool('doc_patch', {
  description: 'Apply block-level ops to a document. Ops: replace_block/delete_block/insert_after/insert_before/replace_text/append_section. Returns LOCKED when someone else holds the edit right, VERSION_CONFLICT when the file changed.',
  inputSchema: z.object({
    space: spaceRef, path: relPath, expectedSha256: z.string().optional(),
    ops: z.array(z.any()).min(1),
  }),
}, wrap(async ({ space, path: rel, expectedSha256, ops }) => {
  const { client, config } = await context()
  return docPatch(client, config, { space, path: rel, expectedSha256, ops, writer: 'agent' })
}))

server.registerTool('doc_propose', {
  description: 'Propose a document edit without writing it. A human accepts or rejects it from the editor. Use for large or destructive changes.',
  inputSchema: z.object({
    space: spaceRef, path: relPath, expectedSha256: z.string().optional(),
    ops: z.array(z.any()).min(1), rationale: z.string().optional(),
  }),
}, wrap(async ({ space, path: rel, expectedSha256, ops, rationale }) => {
  const { client, config } = await context()
  return docPropose(client, config, { space, path: rel, expectedSha256, ops, rationale })
}))

server.registerTool('doc_proposals', {
  description: 'List pending or resolved edit proposals for a document.',
  inputSchema: z.object({ space: spaceRef, path: relPath, status: z.enum(['pending', 'accepted', 'rejected', 'all']).optional() }),
}, wrap(async ({ space, path: rel, status = 'pending' }) => {
  const { client, config } = await context()
  return docProposals(client, config, { space, path: rel, status })
}))

server.registerTool('doc_resolve_proposal', {
  description: 'Accept or reject a pending edit proposal.',
  inputSchema: z.object({ space: spaceRef, path: relPath, id: z.string().min(1), accept: z.boolean() }),
}, wrap(async ({ space, path: rel, id, accept }) => {
  const { client, config } = await context()
  return docResolveProposal(client, config, { space, path: rel, id, accept })
}))

server.registerTool('doc_versions', {
  description: 'List content-addressed versions of a document, with the writers that saw each one.',
  inputSchema: z.object({ space: spaceRef, path: relPath, limit: z.number().int().min(1).max(200).optional() }),
}, wrap(async ({ space, path: rel, limit = 30 }) => {
  const { client, config } = await context()
  return docVersions(client, config, { space, path: rel, limit })
}))

server.registerTool('doc_restore', {
  description: 'Restore a document to a previous version sha.',
  inputSchema: z.object({ space: spaceRef, path: relPath, sha: z.string().min(8) }),
}, wrap(async ({ space, path: rel, sha }) => {
  const { client, config } = await context()
  return docRestore(client, config, { space, path: rel, sha })
}))

server.registerTool('doc_presence', {
  description: 'Report who is editing which document and block right now (humans, devices, agents).',
  inputSchema: z.object({ space: spaceRef, path: relPath.optional() }),
}, wrap(async ({ space, path: rel }) => {
  const { client, config } = await context()
  const presence = await readPresence(client, config, { space })
  return { presence: rel ? presence.filter(row => row.doc === rel) : presence }
}))

await server.connect(new StdioServerTransport())
