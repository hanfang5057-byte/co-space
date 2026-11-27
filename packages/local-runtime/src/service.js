import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { CollaborationStore } from '../../review-core/src/collaboration-store.js';
import { SpaceService } from '../../review-core/src/space-service.js';
import { createHostApi } from '../../host-api/src/index.js';
import { createHttpHandler } from '../../transport-http/http-handler.js';
import { endpointFile, LOCAL_PROTOCOL_VERSION, secretFile } from './paths.js';
import { readDataLayout, DATA_LAYOUT_VERSION } from '../../review-core/src/data-layout.js';

const MAX_RPC_BODY = 1024 * 1024;
const MCP_SESSION_TTL_MS = 60_000;
const UI_SESSION_TTL_MS = 90_000;
const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
};

async function readJsonBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_RPC_BODY) throw Object.assign(new Error('请求过大'), { code: 'LIMIT_EXCEEDED' });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function loadSecrets(runtimeHome) {
  const file = secretFile(runtimeHome);
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const secrets = { uiToken: randomBytes(32).toString('base64url'), rpcToken: randomBytes(32).toString('base64url') };
    await writeFile(file, `${JSON.stringify(secrets)}\n`, { mode: 0o600, flag: 'wx' });
    return secrets;
  }
}

async function dispatchMcp(space, collaboration, method, args = {}) {
  switch (method) {
    case 'createDocument': return space.createDocument(args);
    case 'readDocument': return space.readDocument(args.id);
    case 'propose': return space.propose(args);
    case 'listSuggestions': return space.listSuggestions(args.id, args.status || 'all');
    case 'completeCommentProcessing': return space.completeCommentProcessing(args);
    case 'listComments': return space.listComments(args.id);
    case 'linkCommentSuggestion': return space.linkCommentSuggestion(args);
    case 'readInstructions': return collaboration.readInstructions(args.docId);
    default: throw Object.assign(new Error('未知 MCP 操作'), { code: 'METHOD_NOT_FOUND' });
  }
}

export async function startLocalService({ dataHome, runtimeHome, versionHome, version = '0.0.0', beforeAdvertise, host = '127.0.0.1', port = 0, fallbackPort = false, mcpSessionTtlMs = MCP_SESSION_TTL_MS, uiSessionTtlMs = UI_SESSION_TTL_MS, sessionSweepIntervalMs = 20_000 } = {}) {
  if (!dataHome || !runtimeHome || !versionHome) throw new TypeError('dataHome, runtimeHome, and versionHome are required');
  await Promise.all([
    mkdir(dataHome, { recursive: true, mode: 0o700 }),
    mkdir(runtimeHome, { recursive: true, mode: 0o700 }),
  ]);
  const existingLayout = readDataLayout(dataHome);
  if (existingLayout > DATA_LAYOUT_VERSION) throw Object.assign(new Error('CoSpace data was created by an incompatible newer runtime'), { code: 'DATA_LAYOUT_MISMATCH' });
  const secrets = await loadSecrets(runtimeHome);
  const space = new SpaceService(dataHome);
  const collaboration = new CollaborationStore(dataHome);
  space.markInterruptedUnknown();
  const api = createHostApi({ home: dataHome, space, collaboration, markInterrupted: false });
  const uiHandler = createHttpHandler(api, { token: secrets.uiToken });
  const webRoot = path.join(versionHome, 'web');
  const runtimeId = path.basename(runtimeHome);
  const mcpSessions = new Map();
  const uiSessions = new Map();
  let draining = false;
  let upgradeRunning = false;
  let inFlight = 0;
  const pruneSessions = () => {
    const expiredBefore = Date.now() - mcpSessionTtlMs;
    for (const [id, touchedAt] of mcpSessions) if (touchedAt < expiredBefore) mcpSessions.delete(id);
    const expiredUiBefore = Date.now() - uiSessionTtlMs;
    for (const [id, touchedAt] of uiSessions) if (touchedAt < expiredUiBefore) uiSessions.delete(id);
  };
  const sessionTimer = setInterval(pruneSessions, sessionSweepIntervalMs);
  sessionTimer.unref?.();
  let server;
  let endpoint;

  server = createServer(async (req, res) => {
    let counted = false;
    try {
      const expectedHost = endpoint ? `${host}:${endpoint.port}` : null;
      if (!expectedHost || req.headers.host !== expectedHost) { res.writeHead(403); res.end(); return; }
      if (req.method === 'GET' && req.url === '/__cospace/health') {
        pruneSessions();
        json(res, 200, { ready: !upgradeRunning, draining, runtimeId, version, protocolVersion: LOCAL_PROTOCOL_VERSION, updaterEnabled: false, activeMcpClients: mcpSessions.size, activeUiSessions: uiSessions.size });
        return;
      }
      if (upgradeRunning) { json(res, 503, { error: { code: 'UPDATE_IN_PROGRESS', message: 'Service update in progress' } }); return; }
      inFlight++;
      counted = true;
      if (req.method === 'POST' && req.url === '/__cospace/mcp/session') {
        if (req.headers['x-cospace-rpc-token'] !== secrets.rpcToken) { json(res, 403, { error: { code: 'FORBIDDEN', message: 'Invalid local RPC authorization' } }); return; }
        if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) { json(res, 415, { error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'JSON required' } }); return; }
        const input = await readJsonBody(req);
        pruneSessions();
        if (input.action === 'open' && draining) { json(res, 503, { error: { code: 'SERVICE_DRAINING', message: 'CoSpace is preparing an update. Reconnect after it completes.' } }); return; }
        if (input.action === 'open' && typeof input.id === 'string' && input.id.length >= 16 && input.id.length <= 128) mcpSessions.set(input.id, Date.now());
        else if (input.action === 'heartbeat' && mcpSessions.has(input.id)) mcpSessions.set(input.id, Date.now());
        else if (input.action === 'close') mcpSessions.delete(input.id);
        else { json(res, 400, { error: { code: 'INVALID_SESSION', message: 'Invalid MCP session action' } }); return; }
        json(res, 200, { result: { activeMcpClients: mcpSessions.size } });
        return;
      }
      if (req.method === 'POST' && req.url === '/__cospace/ui/session') {
        if (req.headers['x-cospace-token'] !== secrets.uiToken || !req.headers['content-type']?.toLowerCase().startsWith('application/json')) { json(res, 403, { error: { code: 'FORBIDDEN', message: 'Invalid local UI session authorization' } }); return; }
        const input = await readJsonBody(req);
        pruneSessions();
        if (!/^[0-9a-f-]{36}$/i.test(input.id || '')) { json(res, 400, { error: { code: 'INVALID_SESSION', message: 'Invalid UI session id' } }); return; }
        if (draining && (input.action === 'open' || (input.action === 'heartbeat' && !uiSessions.has(input.id)))) { json(res, 503, { error: { code: 'SERVICE_DRAINING', message: 'CoSpace is preparing an update.' } }); return; }
        if (input.action === 'open' || input.action === 'heartbeat') uiSessions.set(input.id, Date.now());
        else if (input.action === 'close') uiSessions.delete(input.id);
        else { json(res, 400, { error: { code: 'INVALID_SESSION', message: 'Invalid UI session action' } }); return; }
        json(res, 200, { result: { activeUiSessions: uiSessions.size } });
        return;
      }
      if (req.method === 'POST' && req.url === '/__cospace/mcp/rpc') {
        if (req.headers['x-cospace-rpc-token'] !== secrets.rpcToken || (req.headers.origin && req.headers.origin !== `http://${expectedHost}`)) {
          json(res, 403, { error: { code: 'FORBIDDEN', message: 'Invalid local RPC authorization' } });
          return;
        }
        if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) { json(res, 415, { error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'JSON required' } }); return; }
        const input = await readJsonBody(req);
        const result = await dispatchMcp(space, collaboration, input.method, input.args);
        json(res, 200, { result });
        return;
      }
      if (req.method === 'POST' && req.url === '/__cospace/control/stop') {
        if (req.headers['x-cospace-rpc-token'] !== secrets.rpcToken) { json(res, 403, { error: { code: 'FORBIDDEN', message: 'Invalid service authorization' } }); return; }
        pruneSessions();
        if (mcpSessions.size > 0 || uiSessions.size > 0 || inFlight > 1) { json(res, 409, { error: { code: 'ACTIVE_MCP_CLIENTS', message: `Cannot stop CoSpace while ${mcpSessions.size} Agent connection(s), ${uiSessions.size} review page(s), or ${Math.max(0, inFlight - 1)} request(s) are active.` } }); return; }
        upgradeRunning = true;
        json(res, 200, { result: { stopping: true } });
        setImmediate(() => process.kill(process.pid, 'SIGTERM'));
        return;
      }
      if (req.method === 'POST' && req.url === '/__cospace/control/drain') {
        if (req.headers['x-cospace-rpc-token'] !== secrets.rpcToken) { json(res, 403, { error: { code: 'FORBIDDEN', message: 'Invalid service authorization' } }); return; }
        if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) { json(res, 415, { error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'JSON required' } }); return; }
        const input = await readJsonBody(req);
        if (!['start', 'status', 'cancel', 'finish'].includes(input.action)) { json(res, 400, { error: { code: 'INVALID_DRAIN_ACTION', message: 'Invalid drain action' } }); return; }
        if (upgradeRunning) { json(res, 503, { error: { code: 'UPDATE_IN_PROGRESS', message: 'Service update in progress' } }); return; }
        if (input.action === 'start') {
          if (upgradeRunning) { json(res, 409, { error: { code: 'UPDATE_IN_PROGRESS', message: 'Another update is already in progress.' } }); return; }
          draining = true;
        } else if (input.action === 'cancel') draining = false;
        pruneSessions();
        if (input.action === 'finish') {
          if (!draining) { json(res, 409, { error: { code: 'DRAIN_NOT_STARTED', message: 'The service is not draining.' } }); return; }
          if (mcpSessions.size || uiSessions.size || inFlight > 1) { json(res, 409, { error: { code: 'SERVICE_BUSY', message: 'Agent connections, review pages or requests are still active.' } }); return; }
          upgradeRunning = true;
          json(res, 200, { result: { stopping: true } });
          setImmediate(() => process.kill(process.pid, 'SIGTERM'));
          return;
        }
        json(res, 200, { result: { draining, activeMcpClients: mcpSessions.size, activeUiSessions: uiSessions.size, inFlight: Math.max(0, inFlight - 1) } });
        return;
      }
      if (req.method === 'GET' && new URL(req.url, `http://${expectedHost}`).pathname === '/') {
        if (draining) { json(res, 503, { error: { code: 'SERVICE_DRAINING', message: 'CoSpace is preparing an update.' } }); return; }
        let html = await readFile(path.join(webRoot, 'index.html'), 'utf8');
        const uiSessionId = randomBytes(18).toString('hex');
        uiSessions.set(uiSessionId, Date.now());
        html = html.replace('<!--COSPACE_TOKEN-->', `<script>window.__COSPACE_LOCAL_TOKEN__=${JSON.stringify(secrets.uiToken)};(()=>{const id=${JSON.stringify(uiSessionId)},token=${JSON.stringify(secrets.uiToken)},base='http://${host}:'+location.port;const send=action=>fetch(base+'/__cospace/ui/session',{method:'POST',headers:{'content-type':'application/json','x-cospace-token':token},body:JSON.stringify({id,action}),keepalive:action==='close'}).catch(()=>{});let timer;const start=()=>{clearInterval(timer);send('open');timer=setInterval(()=>send('heartbeat'),20000)};start();addEventListener('pagehide',()=>{clearInterval(timer);send('close')});addEventListener('pageshow',event=>{if(event.persisted)start()})})()</script>`);
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        res.end(html);
        return;
      }
      if (req.method === 'GET' && (req.url === '/app.js' || req.url === '/app.css')) {
        const name = req.url.slice(1);
        const content = await readFile(path.join(webRoot, name));
        res.writeHead(200, { 'content-type': name.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/css; charset=utf-8', 'cache-control': 'no-store' });
        res.end(content);
        return;
      }
      if (req.url === '/cospace-api') { await uiHandler(req, res); return; }
      res.writeHead(404); res.end('Not found');
    } catch (error) {
      if (res.headersSent) { res.destroy(error); return; }
      json(res, 400, { error: { code: error.code || 'INVALID_REQUEST', message: error.message || 'Request failed' } });
    } finally {
      if (counted) inFlight--;
    }
  });

  const listen = listenPort => new Promise((resolve, reject) => {
    const onError = error => { server.off('listening', onListening); reject(error); };
    const onListening = () => { server.off('error', onError); resolve(); };
    server.once('error', onError); server.once('listening', onListening); server.listen(listenPort, host);
  });
  try { await listen(port); }
  catch (error) {
    if (error.code === 'EADDRINUSE' && fallbackPort) await listen(0);
    else { clearInterval(sessionTimer); api.close(); collaboration.close(); space.close(); throw error; }
  }
  try { await beforeAdvertise?.(); }
  catch (error) {
    clearInterval(sessionTimer);
    await new Promise(resolve => server.close(resolve));
    api.close(); collaboration.close(); space.close();
    throw error;
  }
  const address = server.address();
  endpoint = { pid: process.pid, runtimeId, host, port: address.port, version, protocolVersion: LOCAL_PROTOCOL_VERSION };
  const endpointPath = endpointFile(runtimeHome);
  const tempPath = `${endpointPath}.${process.pid}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(endpoint)}\n`, { mode: 0o600 });
  await rename(tempPath, endpointPath);
  await rm(path.join(runtimeHome, 'start.lock'), { force: true });

  let closing;
  const close = () => closing ??= (async () => {
    clearInterval(sessionTimer);
    await new Promise(resolve => {
      server.close(resolve);
      server.closeIdleConnections?.();
    });
    api.close();
    collaboration.close();
    space.close();
    try {
      const current = JSON.parse(await readFile(endpointPath, 'utf8'));
      if (current.pid === process.pid) await rm(endpointPath, { force: true });
    } catch {}
  })();
  return { ...endpoint, url: `http://${host}:${address.port}/`, uiToken: secrets.uiToken, rpcToken: secrets.rpcToken, close };
}
