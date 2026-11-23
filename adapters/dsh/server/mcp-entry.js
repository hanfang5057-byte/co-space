import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SpaceService } from '../../../packages/review-core/src/space-service.js';
import { createMcpServer } from '../../../packages/transport-mcp/server.js';

export function resolveHome(env = process.env) {
  return path.resolve(env.DSH_SPACE_HOME || path.join(env.DSH_HOME || path.join(homedir(), '.dsh'), 'space'));
}

export async function startMcpServer({ home = resolveHome(), transport = new StdioServerTransport() } = {}) {
  const service = new SpaceService(home);
  const server = createMcpServer(service);
  process.once('SIGTERM', () => { service.close(); process.exit(0); });
  process.once('SIGINT', () => { service.close(); process.exit(0); });
  await server.connect(transport);
  return { service, server };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await startMcpServer();
}
