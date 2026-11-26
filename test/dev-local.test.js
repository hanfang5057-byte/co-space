import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(predicate, message) {
  for (let i = 0; i < 150; i++) { if (await predicate()) return; await delay(100); }
  throw new Error(`Timed out: ${message}`);
}

test('development service rebuilds, waits for MCP clients, and stops cleanly', { timeout: 45000 }, async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'cospace-dev-test-'));
  const marker = path.join(root, 'assets', `.dev-test-${process.pid}.js`);
  const child = spawn(process.execPath, ['scripts/dev-local.mjs'], { cwd: root, env: { ...process.env, COSPACE_DEV_HOME: home, COSPACE_DEV_NO_OPEN: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  try {
    await waitFor(() => /\[dev:local\] http:\/\/127\.0\.0\.1:\d+\//.test(output), `initial startup: ${output}`);
    const endpoint = JSON.parse(await readFile(path.join(home, '.runtime', 'endpoint.json'), 'utf8'));
    const secrets = JSON.parse(await readFile(path.join(home, '.runtime', 'secrets.json'), 'utf8'));
    const url = `http://127.0.0.1:${endpoint.port}`;
    const health = await (await fetch(`${url}/__cospace/health`)).json();
    assert.equal(health.updaterEnabled, false);
    const session = randomUUID();
    const uiSession = randomUUID();
    assert.equal((await fetch(`${url}/__cospace/ui/session`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cospace-token': secrets.uiToken }, body: JSON.stringify({ action: 'open', id: uiSession }) })).status, 200);
    const send = action => fetch(`${url}/__cospace/mcp/session`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cospace-rpc-token': secrets.rpcToken }, body: JSON.stringify({ action, id: session }) });
    assert.equal((await send('open')).status, 200);
    await writeFile(marker, '// development watcher test\n');
    await waitFor(() => output.includes('Restart deferred:'), 'restart deferred');
    assert.equal((await (await fetch(`${url}/__cospace/health`)).json()).version, endpoint.version);
    assert.equal((await send('close')).status, 200);
    await waitFor(async () => {
      try { return JSON.parse(await readFile(path.join(home, '.runtime', 'endpoint.json'), 'utf8')).version !== endpoint.version; } catch { return false; }
    }, 'rebuild after disconnect');
    const updated = JSON.parse(await readFile(path.join(home, '.runtime', 'endpoint.json'), 'utf8'));
    assert.equal(updated.port, endpoint.port);
    assert.equal((await fetch(`${url}/`)).status, 200);
  } finally {
    await rm(marker, { force: true });
    child.kill('SIGTERM');
    let timeout;
    await Promise.race([new Promise(resolve => child.once('exit', resolve)), new Promise(resolve => { timeout = setTimeout(resolve, 8000); })]);
    clearTimeout(timeout);
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    await rm(home, { recursive: true, force: true });
  }
  assert.match(output, /stopped; data preserved/);
});
