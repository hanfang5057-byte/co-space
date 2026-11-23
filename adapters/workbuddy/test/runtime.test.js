import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
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

    const page = await callTool('space_review_open', { docId: created.id });
    assert.match(page.reviewUrl, /^http:\/\/127\.0\.0\.1:\d+\/document\//);
    reviewDaemonPid = JSON.parse(readFileSync(path.join(temporaryHome, '.workbuddy/space/.review-http.json'), 'utf8')).pid;
    assert.equal(Number.isInteger(reviewDaemonPid), true);
    const html = await fetch(page.reviewUrl);
    assert.equal(html.status, 200);
    assert.match(html.headers.get('content-security-policy'), /default-src 'self'/);
    assert.match(await html.text(), /Space 文档审阅/);
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

    await request('decide', { docId: created.id, suggestionId: proposal.suggestion.id, decision: 'accept', operationId: 'wb-runtime-decide' });
    const decided = await callTool('space_suggestion_list', { docId: created.id, status: 'all' });
    assert.equal(decided.suggestions[0].status, 'accepted');
    const homeStatus = await callTool('space_status', {});
    assert.equal(homeStatus.storage, 'local-only');
    assert(!JSON.stringify(homeStatus).includes(temporaryHome));

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
