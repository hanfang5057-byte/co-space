import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SpaceService, documentFromMarkdown } from '../src/space-service.js';

const text = result => ({ content: [{ type: 'text', text: JSON.stringify(result) }] });
const wrap = fn => async args => {
  try { return text(await fn(args)); }
  catch (error) { return { isError: true, ...text({ error: { code: error.code || 'INTERNAL', message: error.message, details: error.details || {} } }) }; }
};
const id = z.string().min(1).max(200);
const resolveRef = value => { if (!value.startsWith('space:')) return value; try { return decodeURIComponent(value.slice(6)); } catch { throw Object.assign(new Error('Invalid Space reference'), {code:'INVALID_INPUT'}); } };
const referenceFor = value => `space:${encodeURIComponent(value)}`;
const generatedId = operationId => `doc-${createHash('sha256').update(operationId).digest('hex').slice(0, 24)}`;
const opId = id.describe('Stable unique operation ID; reuse the same ID only when retrying the same request.');
const status = z.enum(['all', 'pending', 'accepted', 'rejected', 'conflicted']).optional().describe('Decision status to return; omit or use "all" for the complete history.');

const INSTRUCTIONS = [
  'References in user messages of the form space:<docId> identify Space documents, not filesystem paths; read them with space_document_read.',
  'Workflow: list or read the document first, note its current version, then submit one concrete replacement suggestion per independent change with space_suggest.',
  'from/to are UTF-16 half-open source offsets into the exact Markdown content returned by space_document_read. expected must equal content.slice(from, to); use empty expected for insertion and empty replacement for deletion.',
  'Existing documents are never edited directly. Only the user accepts or rejects suggestions in the Space UI; never claim a change was applied until space_suggestion_list or space_document_read reports it.',
  'Use space_suggestion_list to see which suggestions were accepted, rejected, or conflicted. Do not write the Space database or document files directly.',
].join('\n');

export function createMcpServer(service) {
  const server = new McpServer({ name: 'space', version: '0.1.0' }, { instructions: INSTRUCTIONS });
  server.registerTool('space_list', { description: 'List personal document spaces.', inputSchema: {} }, wrap(() => ({ spaces: service.listSpaces() })));
  server.registerTool('space_documents', { description: 'List personal Space documents with id, title, current version, pending suggestion count, creation and update times; documents are ordered by most recently updated.', inputSchema: {} }, wrap(() => ({ documents: service.listDocuments() })));
  server.registerTool('space_document_create', {
    description: 'Create a new document with complete initial content interpreted as CommonMark Markdown. Omit id to derive a stable id from operationId. This cannot overwrite an existing document. Returns the id and its space:<id> reference.',
    inputSchema: { id: id.optional().describe('Optional document id; omit to derive one from operationId.'), text: z.string(), operationId: opId },
  }, wrap(({ id: requestedId, text: initialText, operationId }) => {
    const docId = requestedId || generatedId(operationId);
    const result = service.createDocument({ id: docId, content: documentFromMarkdown(initialText), operationId });
    return { ...result, reference: referenceFor(result.id) };
  }));
  server.registerTool('space_document_read', {
    description: 'Read the accepted Markdown source, version, and pending text replacement suggestions. Offsets are UTF-16 code units into markdown. Use space_suggestion_list for decided suggestions.',
    inputSchema: { id },
  }, wrap(({ id }) => service.readDocument(resolveRef(id))));
  server.registerTool('space_suggest', {
    description: 'Propose exactly one replacement of expected Markdown source text in the given UTF-16 range. Use empty expected text for insertion and empty replacement for deletion. Submit independent changes as separate suggestions, each read against the current version. This does not change accepted content until the user accepts.',
    inputSchema: { docId: id, baseVersion: z.number().int().nonnegative(), from: z.number().int().nonnegative(), to: z.number().int().nonnegative(), expected: z.string(), replacement: z.string(), operationId: opId },
  }, wrap(({docId,...input}) => service.propose({ ...input, docId: resolveRef(docId) })));
  server.registerTool('space_suggestion_list', {
    description: 'List every suggestion for a document with its decision status (pending, accepted, rejected, conflicted). Use this after the user reviews the document to learn which changes were accepted.',
    inputSchema: { docId: id, status },
  }, wrap(({ docId, status: requestedStatus }) => {
    const result = service.listSuggestions(resolveRef(docId), requestedStatus ?? 'all');
    return { ...result, reference: referenceFor(result.id) };
  }));
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const home = path.resolve(process.env.DSH_SPACE_HOME || path.join(process.env.DSH_HOME || path.join(homedir(), '.dsh'), 'space'));
  const service = new SpaceService(home);
  const server = createMcpServer(service);
  process.on('SIGTERM', () => { service.close(); process.exit(0); });
  await server.connect(new StdioServerTransport());
}
