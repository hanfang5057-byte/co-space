import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { SpaceService } from '../../../../packages/review-core/src/space-service.js';
import { CollaborationStore } from '../../../../packages/review-core/src/collaboration-store.js';
import { createHostApi } from '../../../../packages/host-api/src/index.js';
import { createHttpHandler } from '../../../../packages/transport-http/http-handler.js';
import { detectAgentIntegrations, connectAgent } from '../agent/integration.js';
import { resolveWebHome } from '../shared/paths.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const resources = process.env.COSPACE_RESOURCE_DIR;
const root = resources || path.resolve(here, '../../../..');
const devMode = process.env.COSPACE_DEV === '1';
const webappDist = process.env.COSPACE_WEBAPP_DIST || (resources ? path.join(root, 'dist/webapp') : path.resolve(here, '../../build/webapp'));
function openBrowser(url) {
  const [command, args] = process.platform === 'darwin' ? ['open', [url]] : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : ['xdg-open', [url]];
  const child = spawn(command, args, { detached: true, stdio: 'ignore' }); child.on('error', () => {}); child.unref();
}
export async function startWebApp({ port = Number(process.env.COSPACE_PORT || 0), host = '127.0.0.1', home = resolveWebHome() } = {}) {
  await mkdir(home, { recursive: true, mode: 0o700 });
  const api = createHostApi({ home });
  const token = randomBytes(32).toString('base64url');
  const httpHandler = createHttpHandler(api, { token });
  const server = createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      let index = await readFile(path.join(webappDist, 'index.html'), 'utf8');
      index = index.replace('<!--COSPACE_TOKEN-->', `<script>window.__COSPACE_LOCAL_TOKEN__=${JSON.stringify(token)}</script>`);
      if (devMode) index = index.replace('</body>', `<script>let v;setInterval(async()=>{try{const r=await fetch('/__dev/version',{cache:'no-store'});const n=await r.text();if(v&&v!==n)location.reload();v=n}catch{}},700)</script></body>`);
      res.end(index); return;
    }
    if (devMode && req.method === 'GET' && req.url === '/__dev/version') {
      const assets = await Promise.all(['app.js', 'app.css'].map(name => stat(path.join(webappDist, name)).catch(() => null)));
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
      res.end(assets.map(asset => asset ? `${asset.mtimeMs}:${asset.size}` : 'missing').join('|')); return;
    }
    if (req.method === 'GET' && req.url === '/app.js') { res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': devMode ? 'no-store' : 'public, max-age=3600' }); res.end(await readFile(path.join(webappDist, 'app.js'))); return; }
    if (req.method === 'GET' && req.url === '/app.css') { res.writeHead(200, { 'content-type': 'text/css; charset=utf-8', 'cache-control': devMode ? 'no-store' : 'public, max-age=3600' }); res.end(await readFile(path.join(webappDist, 'app.css'))); return; }
    if (req.url?.startsWith('/local/agents')) {
      if (req.headers['x-cospace-token'] !== token || (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`)) { res.writeHead(403); res.end(); return; }
      if (req.method === 'GET' && req.url === '/local/agents') {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(await detectAgentIntegrations())); return;
      }
      if (req.method === 'POST' && req.url === '/local/agents/connect') {
        try {
          let body=''; for await (const chunk of req) { body += chunk; if (body.length > 4096) throw new Error('Request too large'); }
          const { id } = JSON.parse(body);
          const packagedMcp = path.join(root, 'desktop/mcp-entry.bundle.cjs');
          const mcpEntry = existsSync(packagedMcp) ? packagedMcp : path.resolve(here, '../mcp/index.js');
          const result = await connectAgent(id, { entry: mcpEntry, dataHome: home });
          res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(result));
        } catch (error) { res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify({ error: { code: error.code || 'CONNECT_FAILED', message: error.message } })); }
        return;
      }
    }
    if (req.url === '/cospace-api') { await httpHandler(req, res); return; }
    res.writeHead(404); res.end('Not found');
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve); });
  const address = server.address();
  const close = async () => { await new Promise(resolve => server.close(resolve)); api.close(); };
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
