import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { ensureLocalDaemon, localServiceStatus } from '../../../../packages/local-runtime/src/manager.js';
import { detectAgentIntegrations, connectAgent } from '../agent/integration.js';
import { migrationStatus, resolveWebHome } from '../shared/paths.js';
import { migrateLocalProfile } from '../migration.js';
import { createDesktopUpdateCoordinator, recoverDesktopUpdate } from '../update-coordinator.js';
import { resolveRuntimeHome } from '../../../../packages/local-runtime/src/paths.js';
import desktop from '../../package.json' with { type: 'json' };

const here = path.dirname(fileURLToPath(import.meta.url));
const resources = process.env.COSPACE_RESOURCE_DIR;
const root = resources || path.resolve(here, '../../../..');
const devMode = process.env.COSPACE_DEV === '1';
const webappDist = process.env.COSPACE_WEBAPP_DIST || (resources ? path.join(root, 'dist/webapp') : path.resolve(here, '../../build/webapp'));
const runtimeDist = process.env.COSPACE_DESKTOP_RUNTIME_DIST || (resources ? path.join(root, 'desktop/runtime') : path.resolve(root, 'apps/desktop/build/runtime'));
function openBrowser(url) {
  const [command, args] = process.platform === 'darwin' ? ['open', [url]] : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : ['xdg-open', [url]];
  const child = spawn(command, args, { detached: true, stdio: 'ignore' }); child.on('error', () => {}); child.unref();
}
export async function startWebApp({ port = Number(process.env.COSPACE_PORT || 0), host = '127.0.0.1', home = resolveWebHome() } = {}) {
  const initialMigration = migrationStatus();
  let migrationRequired = initialMigration.required && path.resolve(home) === initialMigration.destinationHome;
  let service;
  let updateCoordinator;
  let starting;
  let migrationBusy = false;
  if (!migrationRequired) await recoverDesktopUpdate({ dataHome: path.resolve(home), runtimeHome: resolveRuntimeHome({ dataHome: path.resolve(home) }), version: desktop.version });
  const startService = () => starting ??= (async () => {
    const endpoint = await ensureLocalDaemon({ dataHome: path.resolve(home), sourceVersionHome: runtimeDist, version: desktop.version, blockDuringDesktopUpdate: true });
    if (endpoint.version !== desktop.version) throw Object.assign(new Error('CoSpace service version differs from the installed desktop app. Disconnect Agents and restart the service.'), { code: 'DESKTOP_SERVICE_VERSION_MISMATCH' });
    service = endpoint;
    updateCoordinator = createDesktopUpdateCoordinator({ ...endpoint, url: `http://${endpoint.host}:${endpoint.port}/` }, desktop.version);
  })().catch(error => { starting = undefined; throw error; });
  if (!migrationRequired) await startService();
  const token = randomBytes(32).toString('base64url');
  let desktopAddress;
  const reject = (req, res) => {
    if (req.headers['x-cospace-token'] !== token || (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) || req.headers.host !== `${host}:${desktopAddress?.port}`) {
      res.writeHead(403, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Invalid local session' } }));
      return true;
    }
    return false;
  };
  const proxyApi = async (req, res) => {
    if (reject(req, res)) return;
    if (!service) { res.writeHead(503); res.end(); return; }
    try {
      let size = 0; const chunks = [];
      for await (const chunk of req) { size += chunk.length; if (size > 1024 * 1024) throw new Error('Request too large'); chunks.push(chunk); }
      const upstream = await fetch(`http://${service.host}:${service.port}/cospace-api`, {
        method: req.method,
        headers: { 'content-type': req.headers['content-type'] || 'application/json', 'x-cospace-token': service.uiToken },
        body: Buffer.concat(chunks),
      });
      res.writeHead(upstream.status, {
        'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      });
      res.end(Buffer.from(await upstream.arrayBuffer()));
    } catch (error) {
      res.writeHead(502, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ error: { code: 'LOCAL_SERVER_UNAVAILABLE', message: error.message } }));
    }
  };
  const server = createServer(async (req, res) => {
    // The bootstrap HTML contains the UI token. Reject DNS-rebinding and
    // cross-origin requests before serving any resource, including that HTML.
    if (!desktopAddress || req.headers.host !== `${host}:${desktopAddress.port}` || (req.headers.origin && req.headers.origin !== `http://${host}:${desktopAddress.port}`)) {
      res.writeHead(403, { 'cache-control': 'no-store' }); res.end(); return;
    }
    if (req.method === 'GET' && new URL(req.url, `http://${host}:${desktopAddress.port}`).pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      let index = await readFile(path.join(webappDist, 'index.html'), 'utf8');
      const uiSessionId = randomUUID();
      index = index.replace('<!--COSPACE_TOKEN-->', `<script>window.__COSPACE_LOCAL_TOKEN__=${JSON.stringify(token)};(()=>{const id=${JSON.stringify(uiSessionId)},token=window.__COSPACE_LOCAL_TOKEN__;let queue=Promise.resolve();const send=(action)=>queue=queue.catch(()=>{}).then(()=>fetch('/local/ui/session',{method:'POST',headers:{'content-type':'application/json','x-cospace-token':token},body:JSON.stringify({id,action}),keepalive:action==='close'}));let timer,paused=false;const open=()=>{paused=false;clearInterval(timer);timer=setInterval(()=>send('heartbeat').catch(()=>{}),20000);return send('open')};const pause=()=>{paused=true;clearInterval(timer);return send('close')};window.__COSPACE_UI_SESSION__={open,pause};open().catch(()=>{});addEventListener('pagehide',()=>{clearInterval(timer);send('close').catch(()=>{})});addEventListener('pageshow',e=>{if(e.persisted&&!paused)open().catch(()=>{})})})()</script>`);
      if (devMode) index = index.replace('</body>', `<script>let v;setInterval(async()=>{try{const r=await fetch('/__dev/version',{cache:'no-store'});const n=await r.text();if(v&&v!==n)location.reload();v=n}catch{}},700)</script></body>`);
      res.end(index); return;
    }
    if (devMode && req.method === 'GET' && req.url === '/__dev/version') {
      const assets = await Promise.all(['app.js', 'app.css'].map(name => stat(path.join(webappDist, name)).catch(() => null)));
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
      res.end(assets.map(asset => asset ? `${asset.mtimeMs}:${asset.size}` : 'missing').join('|')); return;
    }
    if (req.method === 'GET' && req.url === '/app.js') { res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' }); res.end(await readFile(path.join(webappDist, 'app.js'))); return; }
    if (req.method === 'GET' && req.url === '/app.css') { res.writeHead(200, { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'no-store' }); res.end(await readFile(path.join(webappDist, 'app.css'))); return; }
    if (req.url === '/local/ui/session' && req.method === 'POST') {
      if (reject(req, res)) return;
      if (!service) { res.writeHead(503); res.end(); return; }
      try {
        let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 1024) throw new Error('Request too large'); }
        const input = JSON.parse(body);
        if (!/^[0-9a-f-]{36}$/i.test(input.id || '') || !['open', 'heartbeat', 'close'].includes(input.action)) throw new Error('Invalid UI session');
        const upstream = await fetch(`http://${service.host}:${service.port}/__cospace/ui/session`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cospace-token': service.uiToken }, body: JSON.stringify(input), signal: AbortSignal.timeout(3000) });
        res.writeHead(upstream.status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(await upstream.text());
      } catch { res.writeHead(400); res.end(); }
      return;
    }
    if (req.url === '/local/update') {
      if (reject(req, res)) return;
      if (!updateCoordinator) { res.writeHead(503); res.end(); return; }
      if (req.method === 'GET') {
        res.writeHead(updateCoordinator.isReady() ? 200 : 409, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
        res.end(JSON.stringify({ ready: updateCoordinator.isReady() })); return;
      }
      if (req.method === 'POST') {
        try {
          let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 1024) throw new Error('Request too large'); }
          const { action } = JSON.parse(body);
          if (!['begin', 'status', 'cancel', 'finish'].includes(action)) throw new Error('Invalid update action');
          const result = await updateCoordinator[action]();
          res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify({ result: result || null }));
        } catch (error) { res.writeHead(409, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify({ error: { code: error.code || 'UPDATE_FAILED', message: error.message } })); }
        return;
      }
    }
    if (req.url === '/local/service-status' && req.method === 'GET') {
      if (reject(req, res)) return;
      try {
        const status = await localServiceStatus({ dataHome: home });
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
        res.end(JSON.stringify({ running: status.running, compatible: status.compatible ?? false, version: status.version ?? null, activeMcpClients: status.activeMcpClients ?? 0, activeUiSessions: status.activeUiSessions ?? 0 }));
      } catch (error) {
        res.writeHead(503, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
        res.end(JSON.stringify({ error: { code: error.code || 'SERVICE_STATUS_FAILED', message: error.message } }));
      }
      return;
    }
    if (req.url === '/local/migration') {
      if (reject(req, res)) return;
      if (req.method === 'GET') {
        if (!migrationRequired && !service) {
          try { await startService(); }
          catch (error) { res.writeHead(503, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify({ error: { code: error.code || 'SERVICE_FAILED', message: error.message } })); return; }
        }
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
        res.end(JSON.stringify({ required: migrationRequired, hasLegacy: initialMigration.hasLegacy, sourceHome: initialMigration.sourceHome })); return;
      }
      if (req.method === 'POST') {
        let ownsMigration = false;
        try {
          if (!migrationRequired) throw Object.assign(new Error('迁移选择已完成。'), { code: 'MIGRATION_NOT_REQUIRED' });
          if (migrationBusy) throw Object.assign(new Error('迁移正在进行，请等待完成。'), { code: 'MIGRATION_BUSY' });
          migrationBusy = true;
          ownsMigration = true;
          let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 4096) throw new Error('Request too large'); }
          const input = JSON.parse(body);
          if (input.action === 'migrate' && typeof input.sourceHome === 'string' && path.isAbsolute(input.sourceHome)) await migrateLocalProfile({ sourceHome: input.sourceHome, destinationHome: home });
          else if (input.action === 'new') { await mkdir(path.dirname(home), { recursive: true, mode: 0o700 }); await mkdir(home, { recursive: false, mode: 0o700 }); }
          else throw Object.assign(new Error('请选择迁移或新建空间，并填写完整的旧数据路径。'), { code: 'INVALID_MIGRATION_CHOICE' });
          migrationRequired = false;
          await startService();
          res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify({ ready: true }));
        } catch (error) { res.writeHead(400, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify({ error: { code: error.code || 'MIGRATION_FAILED', message: error.message } })); }
        finally { if (ownsMigration) migrationBusy = false; }
        return;
      }
    }
    if (req.url?.startsWith('/local/agents')) {
      if (reject(req, res)) return;
      if (req.method === 'GET' && req.url === '/local/agents') {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(await detectAgentIntegrations())); return;
      }
      if (req.method === 'POST' && req.url === '/local/agents/connect') {
        try {
          let body=''; for await (const chunk of req) { body += chunk; if (body.length > 4096) throw new Error('Request too large'); }
          const { id } = JSON.parse(body);
          const packagedMcp = path.join(root, 'desktop/mcp-entry.bundle.cjs');
          const mcpEntry = existsSync(packagedMcp) ? packagedMcp : path.resolve(here, '../mcp/index.js');
          const result = await connectAgent(id, { entry: mcpEntry, dataHome: home, runtimeDist });
          res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(result));
        } catch (error) { res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify({ error: { code: error.code || 'CONNECT_FAILED', message: error.message } })); }
        return;
      }
    }
    if (req.url === '/cospace-api') { await proxyApi(req, res); return; }
    res.writeHead(404); res.end('Not found');
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve); });
  const address = server.address();
  desktopAddress = address;
  const close = async () => { await new Promise(resolve => server.close(resolve)); };
  const url = `http://${host}:${address.port}/`;
  return { url, token, home, close, open: () => openBrowser(url) };
}

async function run() {
  const app = await startWebApp();
  console.log(`CoSpace WebApp: ${app.url}`);
  console.log(`Data directory: ${app.home}`);
  if (process.env.COSPACE_OPEN_BROWSER !== '0') app.open();
  const stop = () => app.close().finally(() => process.exit(0));
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) void run();
