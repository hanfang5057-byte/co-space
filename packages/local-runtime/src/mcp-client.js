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
  if (response.status === 404) {
    throw Object.assign(new Error('The running CoSpace service does not support MCP sessions. Restart the desktop app and reconnect the Agent.'), { code: 'LOCAL_SERVER_UPGRADE_REQUIRED' });
  }
  const body = await response.json();
  if (!response.ok || body.error) throw Object.assign(new Error(body.error?.message || 'Local Server session failed'), body.error || { code: 'LOCAL_SERVER_SESSION_FAILED' });
  return body.result;
}

export function createRemoteServices(endpoint) {
  const call = (method, args) => remoteCall(endpoint, method, args);
  return {
    space: {
      createDocument: args => call('createDocument', args),
      readDocument: id => call('readDocument', { id }),
      propose: args => call('propose', args),
      listSuggestions: (id, status) => call('listSuggestions', { id, status }),
      completeCommentProcessing: args => call('completeCommentProcessing', args),
      listComments: id => call('listComments', { id }),
      linkCommentSuggestion: args => call('linkCommentSuggestion', args),
    },
    collaboration: { readInstructions: docId => call('readInstructions', { docId }) },
  };
}

export async function startStdioMcp(endpoint, { packageVersion = endpoint?.version || '0.0.0' } = {}) {
  if (!endpoint?.url || !endpoint?.rpcToken) throw new TypeError('A ready Local Server endpoint is required');
  const sessionId = randomUUID();
  await sessionRequest(endpoint, 'open', sessionId);
  const { space, collaboration } = createRemoteServices(endpoint);
  const server = createMcpServer(space, collaboration, { reviewUrl: endpoint.url, serverVersion: packageVersion });
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
