import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureLocalDaemon } from '../../../../packages/local-runtime/src/manager.js';
import { startStdioMcp } from '../../../../packages/local-runtime/src/mcp-client.js';
import { resolveWebHome } from '../shared/paths.js';
import localServer from '../../../local-server/package.json' with { type: 'json' };

async function start() {
  const home = resolveWebHome();
  const here = path.dirname(fileURLToPath(import.meta.url));
  const versionHome = process.env.COSPACE_LOCAL_SERVER_DIST
    || (process.env.COSPACE_RESOURCE_DIR ? path.join(process.env.COSPACE_RESOURCE_DIR, 'desktop/local-server') : path.resolve(here, '../../../local-server/dist'));
  const endpoint = await ensureLocalDaemon({ dataHome: home, sourceVersionHome: versionHome, version: process.env.COSPACE_LOCAL_SERVER_VERSION || localServer.version });
  await startStdioMcp({ ...endpoint, url: `http://${endpoint.host}:${endpoint.port}/` }, { packageVersion: process.env.COSPACE_LOCAL_SERVER_VERSION || localServer.version });
}
void start().catch(error => { process.stderr.write(`CoSpace MCP: ${error.message}\n`); process.exitCode = 1; });
