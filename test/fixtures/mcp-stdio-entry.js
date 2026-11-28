/**
 * Test-only stdio entry for the shared CoSpace MCP contract. It exercises
 * `createMcpServer` exactly as a host would drive it; it is not part of the
 * shipped DSH plugin, whose agent tools register natively. DSH resource links
 * are injected here to keep the exercised contract close to the plugin's.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SpaceService } from '../../packages/review-core/src/space-service.js';
import { createMcpServer } from '../../packages/transport-mcp/server.js';
import { CollaborationStore } from '../../packages/review-core/src/collaboration-store.js';
import { dshSpaceResourceFor } from '../../adapters/dsh/client/resource-reference.js';

export function resolveHome(env = process.env) {
  return path.resolve(env.DSH_SPACE_HOME || path.join(env.DSH_HOME || path.join(homedir(), '.dsh'), 'space'));
}

export async function startMcpServer({ home = resolveHome(), transport = new StdioServerTransport() } = {}) {
  const service = new SpaceService(home);
  const collaboration = new CollaborationStore(home);
  const server = createMcpServer(service, collaboration, { documentLinkFor: dshSpaceResourceFor });
  process.once('SIGTERM', () => { collaboration.close(); service.close(); process.exit(0); });
  process.once('SIGINT', () => { collaboration.close(); service.close(); process.exit(0); });
  await server.connect(transport);
  return { service, server };
}

// A workspace `link:` install exposes this entry through a symlink, so compare
// canonical paths: argv[1] is the link while import.meta.url is the real file.
function isDirectInvocation(argv1 = process.argv[1]) {
  if (!argv1) return false;
  try {
    return realpathSync(path.resolve(argv1)) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isDirectInvocation()) {
  await startMcpServer();
}
