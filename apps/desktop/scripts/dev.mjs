import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rm, stat } from 'node:fs/promises';
import { reconcileLocalServiceVersion } from './reconcile-local-service.mjs';
import { localServiceStatus, stopLocalDaemon } from '../../../packages/local-runtime/src/manager.js';
import { endpointFile, resolveDataHome, resolveRuntimeHome } from '../../../packages/local-runtime/src/paths.js';
import desktop from '../package.json' with { type: 'json' };

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tauriCli = path.resolve(appDir, '../../node_modules/@tauri-apps/cli/tauri.js');

function run(command, args, options = {}) {
  return spawn(command, args, { cwd: appDir, stdio: 'inherit', ...options });
}

const prepare = process.env.npm_execpath
  ? run(process.execPath, [process.env.npm_execpath, 'run', 'prepare:tauri'])
  : run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'prepare:tauri']);
const prepareCode = await new Promise(resolve => prepare.once('exit', resolve));
if (prepareCode !== 0) process.exit(prepareCode || 1);

await reconcileLocalServiceVersion();

// The dev build can change while keeping the product version. Stop any idle
// daemon before replacing that version's cached assets; never touch user data.
const dataHome = resolveDataHome();
const runtimeHome = resolveRuntimeHome({ dataHome });
const service = await localServiceStatus({ dataHome, runtimeHome });
if (service.running) {
  if (service.activeMcpClients > 0 || service.activeUiSessions > 0) {
    throw new Error(`CoSpace service ${service.version} is active (${service.activeMcpClients} Agent connection(s), ${service.activeUiSessions} review page(s)). Disconnect Agents and close review pages before starting the development app.`);
  }
  await stopLocalDaemon({ dataHome, runtimeHome });
}
try {
  await stat(endpointFile(runtimeHome));
  throw new Error('CoSpace service state is uncertain; refusing to replace its development runtime. Check the running service and retry.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await rm(path.join(runtimeHome, 'versions', desktop.version), { recursive: true, force: true });

const watcher = run(process.execPath, ['scripts/build-webapp.mjs', '--watch']);
const tauri = run(process.execPath, [tauriCli, 'dev', '--config', 'src-tauri/tauri.conf.json']);
let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  watcher.kill('SIGTERM');
  tauri.kill('SIGTERM');
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
const exitCode = await new Promise(resolve => tauri.once('exit', resolve));
stop();
process.exit(exitCode || 0);
