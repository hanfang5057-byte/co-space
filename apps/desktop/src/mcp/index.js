import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureLocalDaemon } from '../../../../packages/local-runtime/src/manager.js';
import { startStdioMcp } from '../../../../packages/local-runtime/src/mcp-client.js';
import { migrationStatus, resolveWebHome } from '../shared/paths.js';
import desktop from '../../package.json' with { type: 'json' };

async function start() {
  const home = resolveWebHome();
  if (migrationStatus().required) throw Object.assign(new Error('请先打开 CoSpace 桌面应用并完成本地空间设置。'), { code: 'MIGRATION_REQUIRED' });
  const here = path.dirname(fileURLToPath(import.meta.url));
  const versionHome = process.env.COSPACE_DESKTOP_RUNTIME_DIST
    || (process.env.COSPACE_RESOURCE_DIR ? path.join(process.env.COSPACE_RESOURCE_DIR, 'desktop/runtime') : path.resolve(here, '../../build/runtime'));
  const endpoint = await ensureLocalDaemon({ dataHome: home, sourceVersionHome: versionHome, version: desktop.version, blockDuringDesktopUpdate: true });
  if (endpoint.version !== desktop.version) throw Object.assign(new Error('CoSpace service version differs from the installed desktop app. Disconnect Agents and restart the service.'), { code: 'DESKTOP_SERVICE_VERSION_MISMATCH' });
  await startStdioMcp({ ...endpoint, url: `http://${endpoint.host}:${endpoint.port}/` }, { packageVersion: desktop.version });
}
void start().catch(error => { process.stderr.write(`CoSpace MCP: ${error.message}\n`); process.exitCode = 1; });
