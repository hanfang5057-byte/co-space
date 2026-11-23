import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { SpaceService } from '../../../packages/review-core/src/space-service.js';
import { createMcpServer, resolveSpaceRef } from '../../../packages/transport-mcp/server.js';
import { ensureReviewDaemon, runReviewDaemon, touchReviewDaemon } from './review-daemon.js';
import { resolveWorkBuddySpaceHome } from './paths.js';

const reply = result => ({ content: [{ type: 'text', text: JSON.stringify(result) }] });
const withToolErrors = fn => async args => {
  try { return reply(await fn(args)); }
  catch (error) {
    return { isError: true, ...reply({ error: { code: error.code || 'INTERNAL', message: error.message || 'Request failed' } }) };
  }
};

export async function startWorkBuddyConnector({ transport = new StdioServerTransport() } = {}) {
  const { home } = resolveWorkBuddySpaceHome();
  const service = new SpaceService(home);
  const activityService = new Proxy(service, {
    get(target, property) {
      const value = target[property];
      if (typeof value !== 'function') return value;
      return (...args) => {
        void touchReviewDaemon(home).catch(() => {});
        return value.apply(target, args);
      };
    },
  });
  let server;
  try {
    server = createMcpServer(activityService);
    server.registerTool('space_review_open', {
      description: 'Open the local Space review page. Pass the user-provided space:<docId> reference or its decoded document ID to open that document; omit docId to open the document home. This tool does not enumerate documents or return a document selected on the page to the conversation.',
      inputSchema: { docId: z.string().min(1).max(200).optional().describe('Optional user-provided space:<docId> reference or decoded document ID. Omit to open the home page.') },
    }, withToolErrors(async ({ docId }) => {
      const resolvedDocId = docId ? resolveSpaceRef(docId) : undefined;
      if (resolvedDocId) service.readDocument(resolvedDocId);
      const baseUrl = await ensureReviewDaemon(home, fileURLToPath(import.meta.url));
      return { name: 'Space', available: true, storage: 'local-only', reviewUrl: resolvedDocId ? `${baseUrl}/document/${encodeURIComponent(resolvedDocId)}` : baseUrl };
    }));
    await server.connect(transport);
    return { server, service };
  } catch (error) {
    service.close();
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === '--review-daemon') {
  await runReviewDaemon();
} else if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const running = await startWorkBuddyConnector();
  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    await running.server.close().catch(() => {});
    running.service.close();
  };
  process.once('SIGINT', () => { void close(); });
  process.once('SIGTERM', () => { void close(); });
}
