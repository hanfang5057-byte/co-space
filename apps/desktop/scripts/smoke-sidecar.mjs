import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { stopLocalDaemon } from '../../../packages/local-runtime/src/manager.js';
import { endpointFile, resolveRuntimeHome } from '../../../packages/local-runtime/src/paths.js';
import desktop from '../package.json' with { type: 'json' };
import { SpaceService } from '../../../packages/review-core/src/space-service.js';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(appDir, '../..');
const triples = {
  darwin: { arm64: 'aarch64-apple-darwin', x64: 'x86_64-apple-darwin' },
  win32: { arm64: 'aarch64-pc-windows-msvc', x64: 'x86_64-pc-windows-msvc' },
  linux: { arm64: 'aarch64-unknown-linux-gnu', x64: 'x86_64-unknown-linux-gnu' },
};
const triple = triples[process.platform]?.[process.arch];
if (!triple) throw new Error(`Unsupported smoke target: ${process.platform}-${process.arch}`);
const tauri = path.join(appDir, 'src-tauri');
const resources = path.join(tauri, 'resources');
const runtime = path.join(tauri, 'binaries', `cospace-node-${triple}${process.platform === 'win32' ? '.exe' : ''}`);
const home = await mkdtemp(path.join(os.tmpdir(), 'cospace-desktop-smoke-'));
const dataHome = path.join(home, 'webapp');
await mkdir(dataHome);
const smokeEnv = {
  ...process.env,
  HOME: home,
  USERPROFILE: home,
  LOCALAPPDATA: home,
  XDG_DATA_HOME: home,
  COSPACE_DESKTOP_HOME: dataHome,
  COSPACE_RESOURCE_DIR: resources,
};
const source = `
  const { startWebApp } = require('./desktop/server.bundle.cjs');
  (async () => {
    const app = await startWebApp({ home: process.env.COSPACE_DESKTOP_HOME });
    try {
      const page = await fetch(app.url);
      const html = await page.text();
      const tokenMatch = html.match(/__COSPACE_LOCAL_TOKEN__=(".*?")/);
      if (page.status !== 200 || !tokenMatch) throw new Error('Desktop page or local token missing');
      const token = JSON.parse(tokenMatch[1]);
      const session = html.match(/const id=("[^"]+"),token=window\.__COSPACE_LOCAL_TOKEN__/);
      if (!session) throw new Error('Desktop UI session missing');
      const sessionId = JSON.parse(session[1]);
      const uiSession = (action) => fetch(new URL('/local/ui/session', app.url), { method: 'POST', headers: { 'content-type': 'application/json', 'x-cospace-token': token }, body: JSON.stringify({ action, id: sessionId }) });
      if (!(await uiSession('open')).ok) throw new Error('Desktop UI session could not be opened');
      if (!(await uiSession('close')).ok) throw new Error('Desktop UI session could not be closed');
      const deepLink = await fetch(new URL('/?document=example', app.url));
      if (deepLink.status !== 200) throw new Error('Document link did not open the desktop page');
      const wrongHost = await new Promise((resolve, reject) => {
        require('node:http').get(app.url, { headers: { host: 'attacker.invalid' } }, response => { response.resume(); resolve(response.statusCode); }).on('error', reject);
      });
      if (wrongHost !== 403) throw new Error('Bootstrap page accepted an untrusted host');
      const wrongOrigin = await fetch(app.url, { headers: { origin: 'https://attacker.invalid' } });
      if (wrongOrigin.status !== 403) throw new Error('Bootstrap page accepted an untrusted origin');
      const denied = await fetch(new URL('/cospace-api', app.url), {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ method: 'listDocuments', args: {} }),
      });
      if (denied.status !== 403) throw new Error('API accepted a request without the local token');
      const response = await fetch(new URL('/cospace-api', app.url), {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-cospace-token': token },
        body: JSON.stringify({ method: 'listDocuments', args: {} }),
      });
      const body = await response.json();
      if (response.status !== 200 || !Array.isArray(body.result)) throw new Error('Document API smoke check failed');
      console.log(JSON.stringify({ page: page.status, unauthorized: denied.status, api: response.status }));
    } finally { await app.close(); }
  })().catch(error => { console.error(error); process.exitCode = 1; });
`;

try {
  const webResult = await new Promise((resolve, reject) => {
    const child = spawn(runtime, ['-e', source], {
      cwd: resources,
      env: smokeEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => { child.kill(); reject(new Error('Packaged desktop smoke timed out')); }, 30_000);
    child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('exit', async code => {
      clearTimeout(timeout);
      if (code === 0) return resolve(stdout.trim());
      let daemonLog = '';
      try { daemonLog = await readFile(path.join(home, 'Library', 'Application Support', 'CoSpace', 'local-server', 'profiles', (await import('node:crypto')).createHash('sha256').update(path.join(home, 'webapp')).digest('hex').slice(0, 16), 'daemon.log'), 'utf8'); } catch {}
      reject(new Error([stderr, daemonLog && `Daemon log:\n${daemonLog}`, `Packaged runtime exited with ${code}`].filter(Boolean).join('\n')));
    });
  });
  const mcpResult = await new Promise((resolve, reject) => {
    const child = spawn(runtime, ['desktop/mcp-entry.bundle.cjs'], {
      cwd: resources,
      env: smokeEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const lines = readline.createInterface({ input: child.stdout });
    let stderr = '';
    let settled = false;
    const finish = async (error, response) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      lines.close();
      if (child.exitCode === null && child.signalCode === null) {
        const closed = new Promise(resolve => child.once('close', resolve));
        child.kill();
        await closed;
      }
      error ? reject(error) : resolve(response);
    };
    const timeout = setTimeout(() => finish(new Error('Packaged MCP handshake timed out')), 10_000);
    child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
    child.once('error', error => finish(error));
    child.once('exit', code => finish(new Error(stderr || `Packaged MCP exited with ${code}`)));
    lines.on('line', line => {
      try {
        const message = JSON.parse(line);
        if (message.id !== 1) return;
        if (message.error || message.result?.serverInfo?.name !== 'CoSpace' || message.result?.serverInfo?.version !== desktop.version) throw new Error('Unexpected packaged MCP initialize response');
        finish(null, `${message.result.serverInfo.name}@${message.result.serverInfo.version}`);
      } catch (error) { finish(error); }
    });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'cospace-smoke', version: '1' } } })}\n`);
  });
  const runtimeHome = resolveRuntimeHome({ dataHome, env: smokeEnv });
  const endpoint = JSON.parse(await readFile(endpointFile(runtimeHome), 'utf8'));
  const health = await fetch(`http://${endpoint.host}:${endpoint.port}/__cospace/health`).then(response => response.json());
  if (health.updaterEnabled) throw new Error('Desktop MCP must not enable the npm updater');
  const oldHome = path.join(home, 'legacy');
  const migratedHome = path.join(home, 'migrated');
  const old = new SpaceService(oldHome);
  old.createDocument({ id: 'migration-smoke', content: '# Existing document', operationId: 'migration-create' });
  old.close();
  const migrationEnv = { ...smokeEnv, COSPACE_WEB_HOME: oldHome, COSPACE_DESKTOP_HOME: migratedHome };
  const migrationSource = `
    const { startWebApp } = require('./desktop/server.bundle.cjs');
    (async () => {
      const app = await startWebApp();
      try {
        const headers = { 'x-cospace-token': app.token };
        let state = await fetch(new URL('/local/migration', app.url), { headers }).then(r => r.json());
        if (!state.required || !state.hasLegacy) throw new Error('Legacy data was not detected');
        const response = await fetch(new URL('/local/migration', app.url), { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'migrate', sourceHome: state.sourceHome }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message || 'Migration failed');
        const docs = await fetch(new URL('/cospace-api', app.url), { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ method: 'listDocuments', args: {} }) }).then(r => r.json());
        if (!docs.result?.some(doc => doc.id === 'migration-smoke')) throw new Error('Migrated document missing');
        const update = action => fetch(new URL('/local/update', app.url), { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ action }) });
        const started = await (await update('begin')).json();
        if (!started.result?.draining) throw new Error('Desktop update drain did not start: ' + JSON.stringify(started));
        const notReady = await fetch(new URL('/local/update', app.url), { headers });
        if (notReady.status !== 409) throw new Error('Updater allowed install before service shutdown');
        if (!(await update('cancel')).ok) throw new Error('Desktop update drain could not be cancelled');
        state = await fetch(new URL('/local/migration', app.url), { headers }).then(r => r.json());
        if (state.required) throw new Error('Migration did not complete');
      } finally { await app.close(); }
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `;
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(runtime, ['-e', migrationSource], { cwd: resources, env: migrationEnv, stdio: ['ignore', 'pipe', 'pipe'] });
      let stderr = '';
      child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
      const timeout = setTimeout(() => { child.kill(); reject(new Error('Migration smoke timed out')); }, 30_000);
      child.once('error', error => { clearTimeout(timeout); reject(error); });
      child.once('close', code => { clearTimeout(timeout); code === 0 ? resolve() : reject(new Error(stderr || `Migration smoke exited with ${code}`)); });
    });
    const sourceCheck = new SpaceService(oldHome);
    try { if (sourceCheck.readDocument('migration-smoke').content !== '# Existing document') throw new Error('Migration changed the source'); }
    finally { sourceCheck.close(); }
  } finally {
    await stopLocalDaemon({ dataHome: migratedHome, runtimeHome: resolveRuntimeHome({ dataHome: migratedHome, env: migrationEnv }) });
  }
  console.log(`Packaged runtime smoke passed: ${webResult}; MCP handshake: ${mcpResult}`);
} finally {
  const envKeys = ['HOME', 'USERPROFILE', 'LOCALAPPDATA', 'XDG_DATA_HOME'];
  const originalEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  Object.assign(process.env, Object.fromEntries(envKeys.map(key => [key, smokeEnv[key]])));
  try {
    const runtimeHome = resolveRuntimeHome({ dataHome });
    await stopLocalDaemon({ dataHome, runtimeHome });
  } finally {
    for (const key of envKeys) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  }
  await rm(home, { recursive: true, force: true });
}
