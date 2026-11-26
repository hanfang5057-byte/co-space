import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
