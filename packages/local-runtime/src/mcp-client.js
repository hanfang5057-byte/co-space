import { randomUUID } from 'node:crypto';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from '../../transport-mcp/server.js';

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
  const body = await response.json();
  if (!response.ok || body.error) throw Object.assign(new Error(body.error?.message || 'Local Server session failed'), body.error || { code: 'LOCAL_SERVER_SESSION_FAILED' });
  return body.result;
}

export async function startStdioMcp(endpoint, { packageVersion = endpoint?.version || '0.0.0' } = {}) {
  if (!endpoint?.url || !endpoint?.rpcToken) throw new TypeError('A ready Local Server endpoint is required');
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
    ? `This MCP package is ${packageVersion}, while the running Local Server is ${endpoint.version}. To upgrade the background service, run: npx -y @cospace/local-server@latest service restart, then reconnect the Agent.`
    : undefined;
  const server = createMcpServer(space, collaboration, { reviewUrl: endpoint.url, serverVersion: packageVersion, versionNotice });
  const sessionId = randomUUID();
  await sessionRequest(endpoint, 'open', sessionId);
  await server.connect(new StdioServerTransport());
  const heartbeat = setInterval(() => { void sessionRequest(endpoint, 'heartbeat', sessionId).catch(() => {}); }, 20_000);
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
