import { readFile, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ensureLocalDaemon, installRuntimeVersion, localServiceStatus, stopLocalDaemon, enableLocalUpdater } from '../../../packages/local-runtime/src/manager.js';
import { resolveDataHome, resolveRuntimeHome } from '../../../packages/local-runtime/src/paths.js';
import { readDataLayout } from '../../../packages/review-core/src/data-layout.js';

const distRoot = path.dirname(fileURLToPath(import.meta.url));
const metadata = JSON.parse(await readFile(path.join(distRoot, 'package.json'), 'utf8'));

function openBrowser(url) {
  const [command, args] = process.platform === 'darwin'
    ? ['open', [url]]
    : process.platform === 'win32'
      ? ['rundll32', ['url.dll,FileProtocolHandler', url]]
      : ['xdg-open', [url]];
  const child = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true });
  child.once('error', error => { process.stderr.write(`Could not open browser: ${error.message}\n`); });
  child.unref();
}

async function currentPaths() {
  const dataHome = resolveDataHome();
  const runtimeHome = resolveRuntimeHome({ dataHome });
  const versionHome = await installRuntimeVersion({ sourceVersionHome: distRoot, runtimeHome, version: metadata.version });
  return { dataHome, runtimeHome, versionHome };
}

async function ensureService({ scheduleUpgrade = true } = {}) {
  const paths = await currentPaths();
  const endpoint = await ensureLocalDaemon({ ...paths, version: metadata.version, autoUpdate: true, scheduleUpgrade });
  if (scheduleUpgrade) await enableLocalUpdater(paths.runtimeHome);
  if (endpoint.upgradeNotice === 'restart-required') process.stderr.write('A newer CoSpace version is installed, but the running service cannot update itself. Save and close review pages, disconnect Agents, then run: npx -y @hanfang5057/co-space@latest service restart\n');
  else if (endpoint.upgradeNotice === 'scheduled') process.stderr.write('A newer CoSpace version is ready and will start after review pages and Agents disconnect.\n');
  return endpoint;
}

async function rollbackService(targetVersion) {
  const dataHome = resolveDataHome();
  const runtimeHome = resolveRuntimeHome({ dataHome });
  const running = await localServiceStatus({ dataHome, runtimeHome });
  const versionsRoot = path.join(runtimeHome, 'versions');
  const names = await readdir(versionsRoot).catch(() => []);
  const installed = [];
  for (const name of names) {
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(name)) continue;
    try {
      const marker = JSON.parse(await readFile(path.join(versionsRoot, name, 'runtime.json'), 'utf8'));
      if (marker.version === name && marker.protocolVersion === metadata.protocolVersion && marker.dataLayoutVersion === readDataLayout(dataHome)) installed.push(name);
    } catch {}
  }
  const currentVersion = running.version || metadata.version;
  const target = targetVersion || installed.filter(version => version.localeCompare(currentVersion, 'en', { numeric: true }) < 0).sort((left, right) => right.localeCompare(left, 'en', { numeric: true }))[0];
  if (!target || !installed.includes(target)) throw new Error(targetVersion ? `Local Server runtime ${targetVersion} is not installed or is incompatible with the current data layout` : 'No previous Local Server runtime is compatible with the current data layout');
  if (running.running) await stopLocalDaemon({ dataHome, runtimeHome });
  const sourceVersionHome = path.join(versionsRoot, target);
  const versionHome = await installRuntimeVersion({ sourceVersionHome, runtimeHome, version: target });
  const endpoint = await ensureLocalDaemon({ dataHome, runtimeHome, versionHome, version: target, autoUpdate: true });
  return endpoint;
}

async function runMcp() {
  const endpoint = await ensureService({ scheduleUpgrade: false });
  const { startStdioMcp } = await import(pathToFileURL(path.join(distRoot, 'mcp.cjs')).href);
  await startStdioMcp({ ...endpoint, url: `http://${endpoint.host}:${endpoint.port}/` }, { packageVersion: metadata.version });
}

async function runService(command, argument) {
  if (command === 'status') {
    const status = await localServiceStatus();
    const failure = !status.running ? await readFile(path.join(resolveRuntimeHome(), 'upgrade-failure.json'), 'utf8').then(JSON.parse).catch(() => null) : null;
    process.stdout.write(status.running ? `CoSpace Local Server ${status.version}\n${status.url}\nActive Agent connections: ${status.activeMcpClients}\nActive review pages: ${status.activeUiSessions}\nUpdate: ${status.update?.state || (status.updaterEnabled ? 'checking' : 'unavailable')}${status.update?.targetVersion ? ` (${status.update.targetVersion})` : ''}${status.update?.reason ? ` (${status.update.reason})` : ''}\n` : `CoSpace Local Server is not running.${failure ? ` Last upgrade failed: ${failure.code}. Restore a compatible runtime or backup before restarting.` : ''}\n`);
    return;
  }
  if (command === 'stop') {
    const result = await stopLocalDaemon();
    process.stdout.write(result.wasRunning ? 'CoSpace Local Server stopped. Data was preserved.\n' : 'CoSpace Local Server was not running.\n');
    return;
  }
  if (command === 'start' || command === 'restart') {
    if (command === 'restart') await stopLocalDaemon();
    const endpoint = await ensureService();
    process.stdout.write(`CoSpace Local Server ${endpoint.version} is running at http://${endpoint.host}:${endpoint.port}/\n`);
    return;
  }
  if (command === 'rollback') {
    const endpoint = await rollbackService(argument);
    process.stdout.write(`CoSpace Local Server rolled back to ${endpoint.version} at http://${endpoint.host}:${endpoint.port}/\n`);
    return;
  }
  if (command === 'open') {
    const endpoint = await ensureService();
    openBrowser(`http://${endpoint.host}:${endpoint.port}/`);
    process.stdout.write(`Opening CoSpace at http://${endpoint.host}:${endpoint.port}/\n`);
    return;
  }
  throw new Error(`Unknown service command: ${command || '(missing)'}`);
}

const [mode = 'mcp', subcommand, argument] = process.argv.slice(2);
try {
  if (mode === 'mcp') await runMcp();
  else if (mode === 'service') await runService(subcommand, argument);
  else throw new Error(`Unknown command: ${mode}`);
} catch (error) {
  process.stderr.write(`CoSpace Local Server: ${error.message}\n`);
  process.exitCode = 1;
}
