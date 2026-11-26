import { randomUUID } from 'node:crypto';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from '../../transport-mcp/server.js';
import { enableLocalUpdater, requestRuntimeUpgrade } from './manager.js';

function remoteCall({ url, rpcToken }, method, args) {
  return fetch(`${url.replace(/\/$/, '')}/__cospace/mcp/rpc`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-cospace-rpc-token': rpcToken },
    body: JSON.stringify({ method, args }),
    signal: AbortSignal.timeout(15000),
  }).then(async response => {
    const body = await response.json();
    if (!response.ok || body.error) throw Object.assign(new Error(body.error?.message || 'Local Server request failed'), body.error || { code: 'LOCAL_SERVER_REQUEST_FAILED' });
    return body.result;
  });
}

async function sessionRequest(endpoint, action, id) {
  const response = await fetch(`${endpoint.url.replace(/\/$/, '')}/__cospace/mcp/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-cospace-rpc-token': endpoint.rpcToken },
    body: JSON.stringify({ action, id }),
    signal: AbortSignal.timeout(3000),
  });
  if (response.status === 404) {
    throw Object.assign(new Error('The running CoSpace Local Server does not support MCP sessions. Run `npx -y @hanfang5057/co-space@latest service restart`, then reconnect the Agent.'), { code: 'LOCAL_SERVER_UPGRADE_REQUIRED' });
  }
  const body = await response.json();
  if (!response.ok || body.error) throw Object.assign(new Error(body.error?.message || 'Local Server session failed'), body.error || { code: 'LOCAL_SERVER_SESSION_FAILED' });
  return body.result;
}

export async function startStdioMcp(endpoint, { packageVersion = endpoint?.version || '0.0.0' } = {}) {
  if (!endpoint?.url || !endpoint?.rpcToken) throw new TypeError('A ready Local Server endpoint is required');
  const sessionId = randomUUID();
  await sessionRequest(endpoint, 'open', sessionId);
  if (endpoint.runtimeHome && /^\d+\.\d+\.\d+$/.test(packageVersion) && /^\d+\.\d+\.\d+$/.test(endpoint.version || '') && packageVersion.localeCompare(endpoint.version, 'en', { numeric: true }) > 0) {
    try { const result = await requestRuntimeUpgrade(endpoint.runtimeHome, packageVersion); endpoint.upgradeNotice = result.scheduled ? 'scheduled' : 'restart-required'; }
    catch { endpoint.upgradeNotice = 'restart-required'; }
  }
  if (endpoint.runtimeHome) await enableLocalUpdater(endpoint.runtimeHome).catch(() => false);
  const call = (method, args) => remoteCall(endpoint, method, args);
  const space = {
    createDocument: args => call('createDocument', args),
    readDocument: id => call('readDocument', { id }),
    propose: args => call('propose', args),
    listSuggestions: (id, status) => call('listSuggestions', { id, status }),
    completeCommentProcessing: args => call('completeCommentProcessing', args),
  };
  const collaboration = { readInstructions: docId => call('readInstructions', { docId }) };
  const versionNotice = endpoint.version && endpoint.version !== packageVersion
    ? endpoint.upgradeNotice === 'scheduled' || endpoint.updaterEnabled
      ? `This MCP package is ${packageVersion}, while the running Local Server is ${endpoint.version}. The update waits until review pages and Agent connections close. Current service status: npx -y @hanfang5057/co-space@latest service status.`
      : `This MCP package is ${packageVersion}, while the running Local Server is ${endpoint.version} and does not support automatic updates. After all Agents disconnect, run: npx -y @hanfang5057/co-space@latest service restart.`
    : undefined;
  const server = createMcpServer(space, collaboration, { reviewUrl: endpoint.url, serverVersion: packageVersion, versionNotice });
  await server.connect(new StdioServerTransport());
  const heartbeat = setInterval(() => { void sessionRequest(endpoint, 'heartbeat', sessionId).catch(error => { if (error.code === 'INVALID_SESSION') return sessionRequest(endpoint, 'open', sessionId); }).catch(() => {}); }, 20_000);
  heartbeat.unref?.();
  let closing;
  const release = () => {
    clearInterval(heartbeat);
    process.stdin.off('end', close);
    void sessionRequest(endpoint, 'close', sessionId).catch(() => {});
  };
  server.onclose = release;
  const close = () => closing ??= server.close().catch(() => {}).finally(release);
  process.stdin.once('end', close);
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
  return server;
}
