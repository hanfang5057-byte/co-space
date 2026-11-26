import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { mkdir, mkdtemp, open, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureLocalDaemon, installRuntimeVersion, localServiceStatus, stopLocalDaemon } from '../packages/local-runtime/src/manager.js';
import { startStdioMcp } from '../packages/local-runtime/src/mcp-client.js';

const root = path.resolve(import.meta.dirname, '..');
const dataHome = path.resolve(process.env.COSPACE_DEV_HOME || path.join(os.tmpdir(), 'cospace-local-dev'));
const runtimeHome = path.join(dataHome, '.runtime');
const watched = ['packages', 'apps/local-server/src', 'apps/local-server/scripts', 'assets'];
const ignored = new Set(['node_modules', 'dist', '.git']);
export function shouldRebuild(name) {
  const normalized = name.replaceAll('\\', '/');
  return !normalized.split('/').some(part => ignored.has(part)) && /\.(js|jsx|mjs|css|html|json|svg|png|webp)$/i.test(normalized);
}

async function mcp() {
  const status = await localServiceStatus({ dataHome, runtimeHome });
  if (!status.running) throw new Error('Dev server is not running. Start npm run dev:local first.');
  const secrets = JSON.parse(await readFile(path.join(runtimeHome, 'secrets.json'), 'utf8'));
  await startStdioMcp({ ...status, rpcToken: secrets.rpcToken, uiToken: secrets.uiToken });
}

async function main() {
  await mkdir(runtimeHome, { recursive: true, mode: 0o700 });
  let lock;
  const lockPath = path.join(runtimeHome, 'dev.lock');
  try { lock = await open(lockPath, 'wx', 0o600); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const pid = Number((await readFile(lockPath, 'utf8')).trim());
    if (!Number.isInteger(pid) || pid <= 0) throw new Error(`Invalid dev lock: ${lockPath}`);
    try { process.kill(pid, 0); throw new Error(`Dev server is already running (PID ${pid}).`); }
    catch (check) { if (check.code !== 'ESRCH') throw check; }
    await rm(lockPath);
    lock = await open(lockPath, 'wx', 0o600);
  }
  await lock.writeFile(`${process.pid}\n`);
  await lock.close();
  const dirs = [];
  const watchers = [];
  let running = false, stopping = false, queued = false, timer, retry, port;
  const stop = () => { void shutdown(); };
  async function shutdown() {
    if (stopping) return;
    stopping = true;
    clearTimeout(timer); clearTimeout(retry);
    watchers.forEach(watcher => watcher.close());
    while (running) await new Promise(resolve => setTimeout(resolve, 100));
    try { await stopLocalDaemon({ dataHome, runtimeHome }); }
    catch (error) { console.error(`[dev:local] Service kept running: ${error.message}`); }
    await rm(lockPath, { force: true });
    await Promise.all(dirs.map(dir => rm(dir, { recursive: true, force: true })));
    console.log('[dev:local] stopped; data preserved');
  }
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  async function build() {
    const output = await mkdtemp(path.join(os.tmpdir(), 'cospace-build-'));
    dirs.push(output);
    const child = spawn(process.execPath, [path.join(root, 'apps/local-server/scripts/build.mjs')], {
      cwd: root, env: { ...process.env, COSPACE_BUILD_OUTPUT: output }, stdio: 'inherit',
    });
    await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', code => code === 0 ? resolve() : reject(new Error(`build exited with ${code}`))); });
    return output;
  }
  async function pump() {
    if (running || stopping) return;
    running = true;
    while (queued && !stopping) {
      queued = false;
      let output;
      try {
        output = await build();
        if (stopping) break;
        const version = `0.0.0-dev.${Date.now()}.${process.pid}`;
        const existing = await localServiceStatus({ dataHome, runtimeHome });
        if (existing.running) {
          port = existing.port;
          try { await stopLocalDaemon({ dataHome, runtimeHome }); }
          catch (error) {
            console.error(`[dev:local] Restart deferred: ${error.message}. Retrying after Agent disconnects.`);
            retry = setTimeout(() => { queued = true; void pump(); }, 3000);
            continue;
          }
        }
        const versionHome = await installRuntimeVersion({ sourceVersionHome: output, runtimeHome, version });
        if (port) process.env.COSPACE_DEV_PORT = String(port);
        const endpoint = await ensureLocalDaemon({ dataHome, runtimeHome, versionHome, version, autoUpdate: false });
        port = endpoint.port;
        const url = `http://${endpoint.host}:${endpoint.port}/`;
        console.log(`[dev:local] ${url} | ${version} | data: ${dataHome}`);
        if (!main.opened && process.env.COSPACE_DEV_NO_OPEN !== '1') {
          main.opened = true;
          const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
          const opener = spawn(command, [url], { detached: true, stdio: 'ignore', shell: process.platform === 'win32' });
          opener.on('error', error => console.error(`[dev:local] Could not open browser: ${error.message}`)); opener.unref();
        }
        console.log('[dev:local] Refresh the page after rebuild. Ctrl-C stops the server.');
      } catch (error) { console.error(`[dev:local] ${error.message}; watching for changes`); }
      finally { if (output) { await rm(output, { recursive: true, force: true }); dirs.splice(dirs.indexOf(output), 1); } }
    }
    running = false;
  }
  for (const dir of watched) {
    const watcher = watch(path.join(root, dir), { recursive: true }, (_event, filename) => {
      if (!filename || !shouldRebuild(filename.toString())) return;
      clearTimeout(timer); clearTimeout(retry);
      timer = setTimeout(() => { queued = true; void pump(); }, 150);
    });
    watcher.on('error', error => console.error(`[dev:local] watcher error: ${error.message}`));
    watchers.push(watcher);
  }
  console.log(`[dev:local] watching ${watched.join(', ')}`);
  console.log(`[dev:local] daemon log: ${path.join(runtimeHome, 'daemon.log')}`);
  queued = true;
  await pump();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  (process.argv[2] === 'mcp' ? mcp() : process.argv[2] === 'clean' ? clean() : main()).catch(error => { console.error(`[dev:local] ${error.message}`); process.exitCode = 1; });
}

async function clean() {
  await mkdir(runtimeHome, { recursive: true, mode: 0o700 });
  try { await open(path.join(runtimeHome, 'dev.lock'), 'wx').then(async file => { await file.close(); }); }
  catch (error) { if (error.code === 'EEXIST') throw new Error('Stop the development watcher before cleaning.'); throw error; }
  try {
    if ((await localServiceStatus({ dataHome, runtimeHome })).running) throw new Error('Stop the development service before cleaning.');
    await rm(path.join(runtimeHome, 'versions'), { recursive: true, force: true });
    console.log('[dev:local] Removed development runtime builds; documents preserved.');
  } finally { await rm(path.join(runtimeHome, 'dev.lock'), { force: true }); }
}
