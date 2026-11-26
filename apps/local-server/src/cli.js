import { readFile, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ensureLocalDaemon, installRuntimeVersion, localServiceStatus, stopLocalDaemon } from '../../../packages/local-runtime/src/manager.js';
import { resolveDataHome, resolveRuntimeHome } from '../../../packages/local-runtime/src/paths.js';

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

async function ensureService() {
  const paths = await currentPaths();
  return ensureLocalDaemon({ ...paths, version: metadata.version });
}

async function rollbackService(targetVersion) {
  const dataHome = resolveDataHome();
  const runtimeHome = resolveRuntimeHome({ dataHome });
  const running = await localServiceStatus({ dataHome, runtimeHome });
  if (running.running) await stopLocalDaemon({ dataHome, runtimeHome });
  const versionsRoot = path.join(runtimeHome, 'versions');
  const names = await readdir(versionsRoot).catch(() => []);
  const installed = [];
  for (const name of names) {
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(name)) continue;
    try {
      const marker = JSON.parse(await readFile(path.join(versionsRoot, name, 'runtime.json'), 'utf8'));
      if (marker.version === name && marker.protocolVersion === metadata.protocolVersion) installed.push(name);
    } catch {}
  }
  const currentVersion = running.version || metadata.version;
  const target = targetVersion || installed.filter(version => version.localeCompare(currentVersion, 'en', { numeric: true }) < 0).sort((left, right) => right.localeCompare(left, 'en', { numeric: true }))[0];
  if (!target || !installed.includes(target)) throw new Error(targetVersion ? `Local Server runtime ${targetVersion} is not installed` : 'No previous Local Server runtime is available to roll back to');
  const sourceVersionHome = path.join(versionsRoot, target);
  const versionHome = await installRuntimeVersion({ sourceVersionHome, runtimeHome, version: target });
  const endpoint = await ensureLocalDaemon({ dataHome, runtimeHome, versionHome, version: target });
  return endpoint;
}

async function runMcp() {
  const endpoint = await ensureService();
  const { startStdioMcp } = await import(pathToFileURL(path.join(distRoot, 'mcp.cjs')).href);
  await startStdioMcp({ ...endpoint, url: `http://${endpoint.host}:${endpoint.port}/` }, { packageVersion: metadata.version });
}

async function runService(command, argument) {
  if (command === 'status') {
    const status = await localServiceStatus();
    process.stdout.write(status.running ? `CoSpace Local Server ${status.version}\n${status.url}\nActive Agent connections: ${status.activeMcpClients}\n` : 'CoSpace Local Server is not running.\n');
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
