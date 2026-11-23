import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const serverFile = path.join(repoDir, 'dist/workbuddy-connector/runtime-package/server.js');
const timeout = (promise, label) => {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`stdio MCP response timed out: ${label}`)), 8000); })])
    .finally(() => clearTimeout(timer));
};

test('bundled WorkBuddy MCP and review web complete the local review loop', { skip: process.env.WORKBUDDY_LOOPBACK_TEST !== '1' }, async () => {
  const temporaryHome = mkdtempSync(path.join(os.tmpdir(), 'space-workbuddy-runtime-'));
  const child = spawn(process.execPath, [serverFile], { env: { ...process.env, HOME: temporaryHome }, stdio: ['pipe', 'pipe', 'pipe'] });
  const lines = createInterface({ input: child.stdout });
  const pending = new Map();
  let stderr = '';
  child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
  lines.on('line', line => {
    let message;
    try { message = JSON.parse(line); }
    catch { for (const resolve of pending.values()) resolve({ parseError: line }); return; }
    if (message.id !== undefined && pending.has(message.id)) {
      const resolve = pending.get(message.id);
      pending.delete(message.id);
      resolve(message);
    }
  });
  let nextId = 1;
  let reviewDaemonPid;
  const rpc = (method, params = {}) => timeout(new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, resolve);
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`, error => { if (error) reject(error); });
  }), method);
  const callTool = async (name, args) => {
    let response;
    try { response = await rpc('tools/call', { name, arguments: args }); }
    catch (error) { error.message = `${name}: ${error.message}`; throw error; }
    assert.equal(response.error, undefined, JSON.stringify(response.error));
    assert.equal(response.result?.isError, undefined, response.result?.content?.[0]?.text);
    return JSON.parse(response.result.content[0].text);
  };

  const reservePort = async () => {
    const listener = createServer();
    await new Promise((resolve, reject) => listener.once('error', reject).listen(0, '127.0.0.1', resolve));
    const { port } = listener.address();
    await new Promise(resolve => listener.close(resolve));
    return port;
  };
  const waitForHealth = async (port, token) => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/health`, { headers: { 'x-workbuddy-review-token': token } });
        if (response.ok) return;
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error('WorkBuddy loopback review server did not start');
  };

  try {
    assert.equal(child.pid > 0, true);
    const initialized = await rpc('initialize', {
      protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'workbuddy-smoke', version: '1.0.0' },
    });
    assert.equal(initialized.error, undefined, JSON.stringify(initialized.error));
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
    const toolList = await rpc('tools/list');
    const toolNames = toolList.result.tools.map(tool => tool.name);
    assert(toolNames.includes('space_review_open'));
    assert(toolNames.includes('space_document_create'));
    assert(toolNames.includes('space_suggest'));
    assert(toolNames.includes('space_comment_complete'));
    assert.equal(toolNames.length, 6);
    assert(!toolNames.includes('space_status'));
    assert(!toolNames.includes('space_documents'));
    assert(!toolNames.includes('space_list'));

    const created = await callTool('space_document_create', { text: '# Runtime check\n\nOriginal text.\n', operationId: 'wb-runtime-create' });
    const read = await callTool('space_document_read', { id: created.id });
    const start = read.content.indexOf('Original text.');
    const proposal = await callTool('space_suggest', {
      docId: created.id,
      baseVersion: read.version,
      from: start,
      to: start + 'Original text.'.length,
      expected: 'Original text.',
      replacement: 'Revised text.',
      operationId: 'wb-runtime-suggest',
    });
    assert.equal(proposal.docId, created.id);

    // Run the real bundled loopback server directly and seed its runtime state.
    // This exercises the actual MCP/UI/database path without requiring launchd
    // bootstrap privileges in the test sandbox.
    const port = await reservePort();
    const token = randomBytes(32).toString('hex');
    const stateFile = path.join(temporaryHome, '.workbuddy/space/.review-http.json');
    const sidecar = spawn(process.execPath, [serverFile, '--review-daemon'], {
      env: { ...process.env, HOME: temporaryHome, WORKBUDDY_REVIEW_TOKEN: token, WORKBUDDY_REVIEW_PORT: String(port) },
      stdio: 'ignore',
    });
    reviewDaemonPid = sidecar.pid;
    writeFileSync(stateFile, `${JSON.stringify({ port, token, pid: reviewDaemonPid })}\n`, { mode: 0o600 });
    await waitForHealth(port, token);

    const page = await callTool('space_review_open', { docId: created.reference });
    assert.match(page.reviewUrl, /^http:\/\/127\.0\.0\.1:\d+\/document\//);
    assert.ok(page.reviewUrl.endsWith(`/document/${encodeURIComponent(created.id)}`));
    reviewDaemonPid = JSON.parse(readFileSync(path.join(temporaryHome, '.workbuddy/space/.review-http.json'), 'utf8')).pid;
    assert.equal(Number.isInteger(reviewDaemonPid), true);
    const html = await fetch(page.reviewUrl);
    assert.equal(html.status, 200);
    assert.match(html.headers.get('content-security-policy'), /default-src 'self'/);
    assert.match(await html.text(), /智联文档空间（CoSpace）文档审阅/);
    const client = await fetch(new URL('/client.js', page.reviewUrl));
    assert.equal(client.status, 200);
    assert.match(client.headers.get('content-type'), /javascript/);

    const endpoint = new URL('/api', page.reviewUrl);
    const request = (method, args = {}, origin = endpoint.origin) => fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ method, args }),
    });
    assert.equal((await request('listDocuments')).status, 200);
    assert.equal((await request('serviceStatus')).status, 200);
    assert.equal((await request('listDocuments', {}, 'http://attacker.invalid')).status, 403);

    const commentResponse = await request('createComment', { docId: created.id, quote: 'Original text.', body: 'Make this clearer', anchor: { from: start, to: start + 'Original text.'.length, version: 0 } });
    assert.equal(commentResponse.status, 200);
    const comment = (await commentResponse.json()).result;
    const commentRead = await callTool('space_document_read', { id: created.id });
    assert.equal(commentRead.comments[0].id, comment.id);
    await callTool('space_comment_complete', { docId: created.id, operationId: 'wb-runtime-complete', results: [{ commentId: comment.id, suggestionIds: [proposal.suggestion.id] }] });
    const completedComment = await callTool('space_document_read', { id: created.id });
    assert.equal(completedComment.comments[0].status, 'processed');

    await request('decide', { docId: created.id, suggestionId: proposal.suggestion.id, decision: 'accept', operationId: 'wb-runtime-decide' });
    const decided = await callTool('space_suggestion_list', { docId: created.id, status: 'all' });
    assert.equal(decided.suggestions[0].status, 'accepted');
    assert.equal(page.storage, 'local-only');
    assert(!JSON.stringify(page).includes(temporaryHome));

    const workbuddyDatabase = path.join(temporaryHome, '.workbuddy/space/review.sqlite');
    assert.equal(readFileSync(workbuddyDatabase).length > 0, true);
    assert.notEqual(path.join(temporaryHome, '.dsh/space/review.sqlite'), workbuddyDatabase);
  } catch (error) {
    error.message += stderr ? `\nConnector stderr: ${stderr}` : '';
    throw error;
  } finally {
    if (reviewDaemonPid) {
      try { process.kill(reviewDaemonPid, 'SIGTERM'); } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    child.kill('SIGTERM');
    await Promise.race([
      new Promise(resolve => child.once('exit', resolve)),
      new Promise(resolve => setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 2500)),
    ]);
    rmSync(temporaryHome, { recursive: true, force: true });
  }
});
