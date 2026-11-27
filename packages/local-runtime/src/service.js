import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, open, readFile, writeFile, rename, rm, appendFile } from 'node:fs/promises';
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

export async function startLocalService({ dataHome, runtimeHome, versionHome, version = '0.0.0', updaterEnabled = false, onEnableUpdater, host = '127.0.0.1', port = 0, fallbackPort = false, mcpSessionTtlMs = MCP_SESSION_TTL_MS, uiSessionTtlMs = UI_SESSION_TTL_MS, sessionSweepIntervalMs = 20_000 } = {}) {
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
  let automaticUpdatesEnabled = updaterEnabled;
  let pendingUpgrade = null;
  let upgradeRunning = false;
  let upgradeTimer = null;
  let inFlight = 0;
  let ownsUpgradeLock = false;
  let updateStatus = { state: updaterEnabled ? 'checking' : 'disabled' };
  const setUpdateStatus = status => { updateStatus = { ...status }; };
  let serviceCloseForUpgrade;
  const maybeUpgrade = () => {
    if (!pendingUpgrade || upgradeRunning || upgradeTimer || mcpSessions.size || uiSessions.size || inFlight) return;
    upgradeTimer = setTimeout(() => {
      upgradeTimer = null;
      if (!pendingUpgrade || upgradeRunning || mcpSessions.size || uiSessions.size || inFlight) return;
      const target = pendingUpgrade;
      upgradeRunning = true;
      setUpdateStatus({ state: 'switching', targetVersion: target });
      void appendFile(path.join(runtimeHome, 'upgrade.log'), `${new Date().toISOString()} switching to ${target}\n`, { mode: 0o600 });
      void serviceCloseForUpgrade?.(target).catch(async error => {
        void appendFile(path.join(runtimeHome, 'upgrade.log'), `${new Date().toISOString()} switch failed: ${error.stack || error.message}\n`, { mode: 0o600 });
        if (ownsUpgradeLock) { await rm(path.join(runtimeHome, 'start.lock'), { force: true }); ownsUpgradeLock = false; }
        upgradeRunning = false;
        pendingUpgrade = null;
        setUpdateStatus({ state: 'failed', targetVersion: target, reason: 'switch' });
      });
    }, 500);
    upgradeTimer.unref?.();
  };
  const pruneSessions = () => {
    const expiredBefore = Date.now() - mcpSessionTtlMs;
    for (const [id, touchedAt] of mcpSessions) if (touchedAt < expiredBefore) mcpSessions.delete(id);
    const expiredUiBefore = Date.now() - uiSessionTtlMs;
    for (const [id, touchedAt] of uiSessions) if (touchedAt < expiredUiBefore) uiSessions.delete(id);
    maybeUpgrade();
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
        json(res, 200, { ready: !upgradeRunning, runtimeId, version, protocolVersion: LOCAL_PROTOCOL_VERSION, safeUpgradeProtocol: 1, updaterEnabled: automaticUpdatesEnabled, activeMcpClients: mcpSessions.size, activeUiSessions: uiSessions.size, update: pendingUpgrade && !upgradeRunning ? { state: 'waiting', targetVersion: pendingUpgrade } : updateStatus });
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
        if (input.action === 'open' && typeof input.id === 'string' && input.id.length >= 16 && input.id.length <= 128) mcpSessions.set(input.id, Date.now());
        else if (input.action === 'heartbeat' && mcpSessions.has(input.id)) mcpSessions.set(input.id, Date.now());
        else if (input.action === 'close') { mcpSessions.delete(input.id); maybeUpgrade(); }
        else { json(res, 400, { error: { code: 'INVALID_SESSION', message: 'Invalid MCP session action' } }); return; }
        json(res, 200, { result: { activeMcpClients: mcpSessions.size } });
        return;
      }
      if (req.method === 'POST' && req.url === '/__cospace/ui/session') {
        if (req.headers['x-cospace-token'] !== secrets.uiToken || !req.headers['content-type']?.toLowerCase().startsWith('application/json')) { json(res, 403, { error: { code: 'FORBIDDEN', message: 'Invalid local UI session authorization' } }); return; }
        const input = await readJsonBody(req);
        pruneSessions();
        if (!/^[0-9a-f-]{36}$/i.test(input.id || '')) { json(res, 400, { error: { code: 'INVALID_SESSION', message: 'Invalid UI session id' } }); return; }
        if (input.action === 'open' || input.action === 'heartbeat') uiSessions.set(input.id, Date.now());
        else if (input.action === 'close') uiSessions.delete(input.id);
        else { json(res, 400, { error: { code: 'INVALID_SESSION', message: 'Invalid UI session action' } }); return; }
        maybeUpgrade();
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
        if (mcpSessions.size > 0 || inFlight > 1) { json(res, 409, { error: { code: 'ACTIVE_MCP_CLIENTS', message: `Cannot stop CoSpace while ${mcpSessions.size} Agent connection(s) or ${Math.max(0, inFlight - 1)} request(s) are active.` } }); return; }
        json(res, 200, { result: { stopping: true } });
        setImmediate(() => process.kill(process.pid, 'SIGTERM'));
        return;
      }
      if (req.method === 'POST' && req.url === '/__cospace/control/upgrade') {
        if (req.headers['x-cospace-rpc-token'] !== secrets.rpcToken) { json(res, 403, { error: { code: 'FORBIDDEN', message: 'Invalid service authorization' } }); return; }
        const input = await readJsonBody(req);
        if (typeof input.version !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(input.version)) { json(res, 400, { error: { code: 'INVALID_VERSION', message: 'Invalid runtime version' } }); return; }
        const stableVersion = value => /^\d+\.\d+\.\d+$/.test(value);
        if (stableVersion(version) && stableVersion(input.version) && input.version.localeCompare(version, 'en', { numeric: true }) <= 0) { json(res, 409, { error: { code: 'NOT_NEWER', message: 'Upgrade version must be newer than the running service' } }); return; }
        pruneSessions();
        const target = path.join(path.dirname(versionHome), input.version, 'daemon.cjs');
        try { await readFile(target); } catch { json(res, 404, { error: { code: 'RUNTIME_NOT_INSTALLED', message: 'Runtime is not installed' } }); return; }
        if (!pendingUpgrade || !stableVersion(pendingUpgrade) || !stableVersion(input.version) || input.version.localeCompare(pendingUpgrade, 'en', { numeric: true }) > 0) pendingUpgrade = input.version;
        setUpdateStatus({ state: 'waiting', targetVersion: pendingUpgrade });
        json(res, 200, { result: { scheduled: true, waitingForConnections: mcpSessions.size > 0 || uiSessions.size > 0 } });
        maybeUpgrade();
        return;
      }
      if (req.method === 'POST' && req.url === '/__cospace/control/updater/enable') {
        if (req.headers['x-cospace-rpc-token'] !== secrets.rpcToken) { json(res, 403, { error: { code: 'FORBIDDEN', message: 'Invalid service authorization' } }); return; }
        automaticUpdatesEnabled = true;
        onEnableUpdater?.();
        json(res, 200, { result: { enabled: true } });
        return;
      }
      if (req.method === 'GET' && req.url === '/') {
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
      if (counted) { inFlight--; maybeUpgrade(); }
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
    clearTimeout(upgradeTimer);
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
  serviceCloseForUpgrade = async version => {
    const lockPath = path.join(runtimeHome, 'start.lock');
    const lock = await open(lockPath, 'wx', 0o600);
    ownsUpgradeLock = true;
    try { await lock.writeFile(JSON.stringify({ pid: process.pid, nonce: randomBytes(16).toString('hex'), startedAt: Date.now() })); }
    finally { await lock.close(); }
    await appendFile(path.join(runtimeHome, 'upgrade.log'), `${new Date().toISOString()} closing old service\n`, { mode: 0o600 });
    await close();
    await appendFile(path.join(runtimeHome, 'upgrade.log'), `${new Date().toISOString()} old service closed\n`, { mode: 0o600 });
    const { spawn } = await import('node:child_process');
    const launch = target => {
      const targetHome = path.join(path.dirname(versionHome), target);
      const child = spawn(process.execPath, [path.join(targetHome, 'daemon.cjs')], {
        detached: true, stdio: 'ignore', windowsHide: true,
        env: { ...process.env, COSPACE_DATA_HOME: dataHome, COSPACE_RUNTIME_HOME: runtimeHome, COSPACE_VERSION_HOME: targetHome, COSPACE_PACKAGE_VERSION: target, COSPACE_AUTO_UPDATE: automaticUpdatesEnabled ? '1' : '0', COSPACE_UPDATE_PORT: String(endpoint.port), COSPACE_UPDATE_RESULT: target === endpoint.version ? 'failed' : 'updated', COSPACE_UPGRADE_SUPERVISOR: 'layout-aware-v1' },
      });
      child.once('error', error => { void appendFile(path.join(runtimeHome, 'upgrade.log'), `${new Date().toISOString()} ${target}: ${error.stack || error.message}\n`, { mode: 0o600 }); });
      child.once('exit', (code, signal) => { void appendFile(path.join(runtimeHome, 'upgrade.log'), `${new Date().toISOString()} ${target} exited code=${code} signal=${signal}\n`, { mode: 0o600 }); });
      child.unref();
      return child;
    };
    const healthy = async (target, child) => {
      const deadline = Date.now() + 15000;
      while (Date.now() < deadline) {
        if (child && (child.exitCode !== null || child.signalCode !== null || child.pid === undefined)) return false;
        try {
          const current = JSON.parse(await readFile(endpointPath, 'utf8'));
          if (current.host !== host || !Number.isInteger(current.port)) throw new Error('Candidate endpoint is invalid');
          const response = await fetch(`http://${current.host}:${current.port}/__cospace/health`, { signal: AbortSignal.timeout(600) });
          const body = await response.json();
          if (response.ok && body.ready && body.version === target && body.runtimeId === runtimeId) return true;
        } catch {}
        await new Promise(resolve => setTimeout(resolve, 250));
      }
      return false;
    };
    const candidateProcess = launch(version);
    await appendFile(path.join(runtimeHome, 'upgrade.log'), `${new Date().toISOString()} candidate spawned pid=${candidateProcess.pid}\n`, { mode: 0o600 });
    if (await healthy(version, candidateProcess)) { process.exit(0); return; }
    if (candidateProcess.exitCode === null && candidateProcess.signalCode === null) {
      candidateProcess.kill();
      await Promise.race([new Promise(resolve => candidateProcess.once('exit', resolve)), new Promise(resolve => setTimeout(resolve, 2000))]);
    }
    await rm(endpointPath, { force: true });
    if (candidateProcess.exitCode === null && candidateProcess.signalCode === null) {
      await writeFile(path.join(runtimeHome, 'upgrade-failure.json'), JSON.stringify({ code: 'CANDIDATE_STILL_RUNNING', targetVersion: version, previousVersion: endpoint.version }), { mode: 0o600 });
      if (ownsUpgradeLock) { await rm(lockPath, { force: true }); ownsUpgradeLock = false; }
      process.exit(1);
    }
    let compatible = false;
    try { compatible = readDataLayout(dataHome) === DATA_LAYOUT_VERSION; } catch {}
    if (!compatible) {
      await writeFile(path.join(runtimeHome, 'upgrade-failure.json'), JSON.stringify({ code: 'ROLLBACK_DATA_LAYOUT_MISMATCH', targetVersion: version, previousVersion: endpoint.version }), { mode: 0o600 });
      await appendFile(path.join(runtimeHome, 'upgrade.log'), `${new Date().toISOString()} rollback blocked: incompatible data layout\n`, { mode: 0o600 });
      if (ownsUpgradeLock) { await rm(lockPath, { force: true }); ownsUpgradeLock = false; }
      process.exit(1);
    }
    launch(process.env.COSPACE_PREVIOUS_VERSION || endpoint.version);
    await healthy(process.env.COSPACE_PREVIOUS_VERSION || endpoint.version);
    process.exit(1);
  };
  if (process.env.COSPACE_UPDATE_RESULT === 'updated') setUpdateStatus({ state: 'updated' });
  if (process.env.COSPACE_UPDATE_RESULT === 'failed') setUpdateStatus({ state: 'failed', reason: 'switch' });
  return { ...endpoint, url: `http://${host}:${address.port}/`, uiToken: secrets.uiToken, rpcToken: secrets.rpcToken, close, setUpdateStatus };
}
