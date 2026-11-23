import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { SpaceService } from '../../../packages/review-core/src/space-service.js';
import { createMcpServer } from '../../../packages/transport-mcp/server.js';
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
      description: 'Return the local Space review page URL. Pass a document id to open that document; omit it to open the document home.',
      inputSchema: { docId: z.string().min(1).max(200).optional() },
    }, withToolErrors(async ({ docId }) => {
      if (docId) service.readDocument(docId);
      const baseUrl = await ensureReviewDaemon(home, fileURLToPath(import.meta.url));
      return { name: 'Space', available: true, reviewUrl: docId ? `${baseUrl}/document/${encodeURIComponent(docId)}` : baseUrl };
    }));
    server.registerTool('space_status', {
      description: 'Report whether the local Space document service and review page are available. Does not reveal local file paths.',
      inputSchema: {},
    }, withToolErrors(async () => ({
      name: 'Space', available: true, storage: 'local-only',
      reviewUrl: await ensureReviewDaemon(home, fileURLToPath(import.meta.url)),
    })));
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
