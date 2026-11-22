/**
 * Single source of truth binding every MCP tool to its HTTP method.
 *
 * The MCP server (server/main.mjs) and the page API (server/api.mjs) expose the
 * same capabilities through different transports. Keeping the mapping here —
 * and asserting it in scripts/contract-check.mjs — is what stops the two
 * surfaces from drifting apart.
 *
 * `http: null` marks a tool that intentionally has no page-facing method.
 */
export const TOOL_HTTP = {
  space_list: 'list',
  space_create: 'createSpace',
  space_get: 'get',
  space_tree: 'tree',
  space_context: 'context',
  space_update: 'updateSpace',
  space_delete: 'deleteSpace',
  space_invite: 'invite',
  space_join: 'join',
  space_members: 'members',
  space_approve_member: 'approve',
  space_remove_member: 'removeMember',
  space_sync_status: 'sync',
  space_wait_sync: 'waitSync',
  space_rescan: 'rescan',
  space_daemon: null,
  file_list: 'listFiles',
  file_read: 'read',
  file_write: 'write',
  file_edit: 'edit',
  file_move: 'moveFile',
  file_delete: 'deleteFile',
  file_import: 'importFile',
  file_outline: 'outlineFile',
  file_conflicts: 'conflicts',
  file_conflict_detail: 'conflictDetail',
  file_resolve_conflict: 'resolveConflict',
  space_cleanup_legacy: 'cleanupLegacy',
  doc_create: 'createDoc',
  doc_append: 'appendDoc',
  doc_blocks: 'docBlocks',
  doc_patch: 'docPatch',
  doc_propose: 'docPropose',
  doc_proposals: 'docProposals',
  doc_resolve_proposal: 'docResolveProposal',
  doc_versions: 'docVersions',
  doc_restore: 'docRestore',
  doc_presence: 'presenceList',
}

/** Page-only methods: no MCP tool (UI coordination endpoints). */
export const HTTP_ONLY = [
  'asset', 'events', 'legacyReport', 'devices', 'presence', 'presenceList',
  'leaseStatus', 'leaseAcquire', 'leaseRenew', 'leaseRelease', 'docState',
  'daemonStatus', 'daemonStart', 'daemonStop', 'uploadAsset',
]

/** Every HTTP method the page API may dispatch. */
export function httpMethods() {
  return new Set([
    ...Object.values(TOOL_HTTP).filter(Boolean),
    ...HTTP_ONLY,
  ])
}
