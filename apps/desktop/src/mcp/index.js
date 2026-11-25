import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SpaceService } from '../../../../packages/review-core/src/space-service.js';
import { CollaborationStore } from '../../../../packages/review-core/src/collaboration-store.js';
import { createMcpServer } from '../../../../packages/transport-mcp/server.js';
import { resolveWebHome } from '../shared/paths.js';

async function start() {
  const home = resolveWebHome();
  const service = new SpaceService(home);
  const collaboration = new CollaborationStore(home);
  service.markInterruptedUnknown();
  const server = createMcpServer(service, collaboration);
  await server.connect(new StdioServerTransport());
  const close = () => { collaboration.close(); service.close(); process.exit(0); };
  process.once('SIGINT', close); process.once('SIGTERM', close);
}
void start();
