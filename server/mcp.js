import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
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
const opId = id.describe('Stable unique operation ID; reuse the same ID only when retrying the same request.');

export function createMcpServer(service) {
  const server = new McpServer({ name: 'space', version: '0.1.0' }, { instructions: 'References in user messages of the form space:<docId> identify Space documents, not filesystem paths; use space_document_read to load Markdown source, version, and pending suggestions. Existing documents may only be modified by submitting concrete text replacement suggestions; the user accepts or rejects each. Offsets are UTF-16 code units into the exact Markdown source. Always provide expected text and read again after conflicts. Never write the Space database or existing document directly.' });
  server.registerTool('space_list', { description: 'List personal document spaces.', inputSchema: {} }, wrap(() => ({ spaces: service.listSpaces() })));
  server.registerTool('space_documents', { description: 'List personal Space documents.', inputSchema: {} }, wrap(() => ({ documents: service.listDocuments() })));
  server.registerTool('space_document_create', {
    description: 'Create a new document with complete initial content interpreted as CommonMark Markdown. This cannot overwrite an existing document.',
    inputSchema: { id, text: z.string(), operationId: opId },
  }, wrap(({ id, text: initialText, operationId }) => service.createDocument({ id, content: documentFromMarkdown(initialText), operationId })));
  server.registerTool('space_document_read', {
    description: 'Read the accepted Markdown source, version, and pending text replacement suggestions. Offsets are UTF-16 code units into markdown.',
    inputSchema: { id },
  }, wrap(({ id }) => service.readDocument(resolveRef(id))));
  server.registerTool('space_suggest', {
    description: 'Propose replacing expected Markdown source text in the given UTF-16 range. Use empty expected text for insertion and empty replacement for deletion. This does not change accepted content until the user accepts.',
    inputSchema: { docId: id, baseVersion: z.number().int().nonnegative(), from: z.number().int().nonnegative(), to: z.number().int().nonnegative(), expected: z.string(), replacement: z.string(), operationId: opId },
  }, wrap(({docId,...input}) => service.propose({ ...input, docId: resolveRef(docId) })));
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const home = path.resolve(process.env.DSH_SPACE_HOME || path.join(process.env.DSH_HOME || path.join(homedir(), '.dsh'), 'space'));
  const service = new SpaceService(home);
  const server = createMcpServer(service);
  process.on('SIGTERM', () => { service.close(); process.exit(0); });
  await server.connect(new StdioServerTransport());
}
