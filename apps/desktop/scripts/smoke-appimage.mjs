import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { stopLocalDaemon } from '../../../packages/local-runtime/src/manager.js';
import { resolveRuntimeHome } from '../../../packages/local-runtime/src/paths.js';

if (process.platform !== 'linux') throw new Error('Linux package smoke requires Linux');
const deb = process.argv[2] === '--deb';
if (process.argv.length > (deb ? 3 : 2)) throw new Error('Usage: smoke-appimage.mjs [--deb]');
const release = path.resolve(import.meta.dirname, '../../../dist/releases/desktop/linux');
const files = (await readdir(release)).filter(name => name.endsWith(deb ? '.deb' : '.AppImage'));
if (files.length !== 1) throw new Error(`Expected exactly one ${deb ? 'deb' : 'AppImage'}`);
const home = await mkdtemp(path.join(os.tmpdir(), 'cospace-appimage-smoke-'));
const dataHome = path.join(home, 'desktop');
await mkdir(dataHome);
const env = { ...process.env, HOME: home, XDG_DATA_HOME: home, COSPACE_DESKTOP_HOME: dataHome, APPIMAGE_EXTRACT_AND_RUN: '1', PATH: '/usr/bin:/bin' };
delete env.COSPACE_RESOURCE_DIR;
delete env.COSPACE_LOCAL_SERVER_DIST;
delete env.COSPACE_LOCAL_SERVER_VERSION;
delete env.COSPACE_DESKTOP_RUNTIME_DIST;
if (deb) delete env.APPIMAGE_EXTRACT_AND_RUN;
const child = spawn(deb ? '/usr/bin/cospace-desktop' : path.join(release, files[0]), ['--mcp'], { env, stdio: ['pipe', 'pipe', 'pipe'] });
const lines = readline.createInterface({ input: child.stdout });
let stderr = '';
child.stderr.setEncoding('utf8').on('data', text => { stderr += text; });
const closed = new Promise(resolve => child.once('close', resolve));
try {
  const response = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`AppImage MCP timed out: ${stderr}`)), 30000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`AppImage exited before MCP response (${code}): ${stderr}`)); });
    lines.on('line', line => {
      try {
        const message = JSON.parse(line);
        if (message.id === 1) { clearTimeout(timer); resolve(message); }
      } catch (error) { clearTimeout(timer); reject(error); }
    });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'appimage-smoke', version: '1' } } })}\n`);
  });
  if (response.error || response.result?.serverInfo?.name !== 'CoSpace') throw new Error('Unexpected AppImage MCP response');
  child.stdin.end();
  let timeout;
  const exit = await Promise.race([closed, new Promise(resolve => { timeout = setTimeout(() => resolve(null), 10000); })]);
  clearTimeout(timeout);
  if (exit !== 0) throw new Error(`AppImage MCP did not exit cleanly: ${stderr}`);
  console.log(`${deb ? 'Installed deb' : 'AppImage'} MCP launcher smoke passed`);
} finally {
  if (child.exitCode === null && child.signalCode === null) { child.kill(); await closed; }
  lines.close();
  await stopLocalDaemon({ dataHome, runtimeHome: resolveRuntimeHome({ dataHome, env }) });
  await rm(home, { recursive: true, force: true });
}
