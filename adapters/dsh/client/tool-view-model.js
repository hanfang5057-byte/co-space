/**
 * Read one CoSpace MCP tool call into a small view model.
 *
 * MCP results reach the client as text blocks containing the JSON the server
 * returned, so every reader here is defensive: an unparsable payload or an
 * unknown tool yields `null`, and the caller falls back to the generic row.
 */

const PENDING = new Set(['pending', 'conflicted']);

/**
 * Parse the first object payload of an MCP result.
 * @param {Array<object>} content - result content blocks.
 * @returns {object|null} the payload, or null when no block holds JSON.
 */
export function toolResultPayload(content) {
  if (!Array.isArray(content)) return null;
  for (const block of content) {
    if (!block || block.type !== 'text' || typeof block.text !== 'string') continue;
    let value;
    try {
      value = JSON.parse(block.text);
    } catch {
      continue;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  }
  return null;
}

/**
 * Parse a tool call's raw argument JSON; a partial stream yields null.
 * @param {string} argsRaw - JSON text of the call arguments.
 * @returns {object|null} the arguments, or null while they are incomplete.
 */
export function toolArgs(argsRaw) {
  if (typeof argsRaw !== 'string' || argsRaw.trim() === '') return null;
  try {
    const value = JSON.parse(argsRaw);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

const visibleText = value => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null);
const pendingCount = value => (Array.isArray(value) ? value.filter(item => item && PENDING.has(item.status)).length : null);
const versionOf = value => (Number.isFinite(value) ? value : null);

/**
 * Read a document call into its card fields.
 * @param {{args: object|null, payload: object|null, isError?: boolean}} input - call data.
 * @returns {object} card model.
 */
export function readDocumentCard({ args, payload, isError = false }) {
  if (isError) return { kind: 'document', titleKey: 'tool.read.failed', failed: true };
  const docId = visibleText(args?.docId) ?? visibleText(payload?.id) ?? null;
  return {
    kind: 'document',
    titleKey: 'tool.read.title',
    docId,
    title: visibleText(payload?.title) ?? docId,
    version: versionOf(payload?.version),
    pending: pendingCount(payload?.suggestions),
    comments: Array.isArray(payload?.comments) ? payload.comments.length : null,
  };
}

/**
 * Read a suggest call into its card fields.
 * @param {{args: object|null, payload: object|null, isError?: boolean}} input - call data.
 * @returns {object} card model.
 */
export function suggestCard({ args, payload, isError = false }) {
  if (isError) return { kind: 'suggestion', titleKey: 'tool.suggest.failed', failed: true };
  const docId = visibleText(args?.docId) ?? visibleText(payload?.docId) ?? visibleText(payload?.id) ?? null;
  return {
    kind: 'suggestion',
    titleKey: 'tool.suggest.title',
    docId,
    expected: typeof args?.expected === 'string' ? args.expected : null,
    replacement: typeof args?.replacement === 'string' ? args.replacement : null,
    suggestionId: visibleText(payload?.id),
  };
}

/**
 * Read a suggestion-list call into its card fields.
 * @param {{args: object|null, payload: object|null, isError?: boolean}} input - call data.
 * @returns {object} card model.
 */
export function suggestionListCard({ args, payload, isError = false }) {
  if (isError) return { kind: 'suggestion-list', titleKey: 'tool.list.failed', failed: true };
  const suggestions = Array.isArray(payload?.suggestions) ? payload.suggestions : null;
  return {
    kind: 'suggestion-list',
    titleKey: 'tool.list.title',
    docId: visibleText(args?.docId) ?? visibleText(payload?.docId) ?? null,
    pending: pendingCount(suggestions),
    total: suggestions === null ? null : suggestions.length,
  };
}

const BY_TOOL = {
  'mcp__space__space_document_read': readDocumentCard,
  'mcp__space__space_suggest': suggestCard,
  'mcp__space__space_suggestion_list': suggestionListCard,
};

/**
 * Build the card model for one tool call.
 * @param {string} toolName - model-facing MCP tool name.
 * @param {{argsRaw?: string, content?: Array<object>, isError?: boolean}} data - call or result data.
 * @returns {object|null} card model, or null for an unknown tool.
 */
export function toolCardModel(toolName, data = {}) {
  const build = BY_TOOL[toolName];
  if (!build) return null;
  return build({
    args: toolArgs(data.argsRaw),
    payload: toolResultPayload(data.content),
    isError: data.isError === true,
  });
}
