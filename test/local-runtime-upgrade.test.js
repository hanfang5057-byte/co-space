import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { startLocalService } from '../packages/local-runtime/src/service.js';
import { ensureLocalDaemon, installRuntimeVersion } from '../packages/local-runtime/src/manager.js';

test('a previously staged runtime is checked for tampering before reuse', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'cospace-runtime-integrity-'));
  const source = path.join(root, 'source');
  const runtimeHome = path.join(root, 'runtime');
  try {
    await mkdir(path.join(source, 'web'), { recursive: true });
    await Promise.all(['daemon.cjs', 'web/index.html', 'web/app.js', 'web/app.css'].map(name => writeFile(path.join(source, name), name)));
    const installed = await installRuntimeVersion({ sourceVersionHome: source, runtimeHome, version: '2.0.0' });
    await writeFile(path.join(installed, 'web/app.js'), 'tampered');
    await assert.rejects(installRuntimeVersion({ sourceVersionHome: source, runtimeHome, version: '2.0.0' }), { code: 'RUNTIME_ASSETS_INVALID' });
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('runtime upgrade waits for active MCP sessions and rejects unstaged versions', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'cospace-runtime-upgrade-'));
  const runtimeHome = path.join(root, 'runtime');
  const versionHome = path.join(runtimeHome, 'versions', '1.0.0');
  await mkdir(path.join(versionHome, 'web'), { recursive: true });
  await Promise.all([
    writeFile(path.join(versionHome, 'daemon.cjs'), ''),
    writeFile(path.join(versionHome, 'web/index.html'), '<!doctype html><html><head></head><body><!--COSPACE_TOKEN--></body></html>'),
  ]);
  let updaterEnableCalls = 0;
  const service = await startLocalService({ dataHome: path.join(root, 'data'), runtimeHome, versionHome, version: '1.0.0', onEnableUpdater: () => { updaterEnableCalls += 1; } });
  const url = service.url.replace(/\/$/, '');
  const headers = { 'content-type': 'application/json', 'x-cospace-rpc-token': service.rpcToken };
  const request = (route, body) => fetch(`${url}${route}`, { method: 'POST', headers, body: JSON.stringify(body) });
  try {
    const missing = await request('/__cospace/control/upgrade', { version: '2.0.0' });
    assert.equal(missing.status, 404);

    const opened = await request('/__cospace/mcp/session', { action: 'open', id: 'session-id-long-enough' });
    assert.equal(opened.status, 200);
    const stagedHome = path.join(runtimeHome, 'versions', '2.0.0');
    await mkdir(stagedHome, { recursive: true });
    await writeFile(path.join(stagedHome, 'daemon.cjs'), '');
    const queued = await request('/__cospace/control/upgrade', { version: '2.0.0' });
    assert.equal(queued.status, 200);
    assert.deepEqual((await queued.json()).result, { scheduled: true, waitingForConnections: true });
    assert.deepEqual((await (await fetch(`${url}/__cospace/health`)).json()).update, { state: 'waiting', targetVersion: '2.0.0' });
    assert.equal((await request('/__cospace/control/upgrade', { version: '1.0.0' })).status, 409);

    const page = await fetch(`${url}/`);
    const html = await page.text();
    const id = html.match(/const id="([0-9a-f-]+)"/)?.[1];
    const uiToken = html.match(/window\.__COSPACE_LOCAL_TOKEN__="([^"]+)"/)?.[1];
    assert.ok(id);
    assert.ok(uiToken);
    assert.doesNotMatch(html, new RegExp(service.rpcToken));
    const unauthorizedHeartbeat = await fetch(`${url}/__cospace/ui/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-cospace-token': 'invalid-token' },
      body: JSON.stringify({ id, action: 'heartbeat' }),
    });
    assert.equal(unauthorizedHeartbeat.status, 403);
    const uiHeartbeat = await fetch(`${url}/__cospace/ui/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-cospace-token': uiToken },
      body: JSON.stringify({ id, action: 'heartbeat' }),
    });
    assert.equal(uiHeartbeat.status, 200);
    const closed = await request('/__cospace/mcp/session', { action: 'close', id: 'session-id-long-enough' });
    assert.equal(closed.status, 200);
    const uiOnlyWait = await request('/__cospace/control/upgrade', { version: '2.0.0' });
    assert.equal((await uiOnlyWait.json()).result.waitingForConnections, true);
    const health = await fetch(`${url}/__cospace/health`);
    const status = await health.json();
    assert.equal(status.version, '1.0.0');
    assert.equal(status.activeUiSessions, 1);
    assert.equal(status.updaterEnabled, false);
    const enabled = await fetch(`${url}/__cospace/control/updater/enable`, { method: 'POST', headers: { 'x-cospace-rpc-token': service.rpcToken } });
    assert.equal(enabled.status, 200);
    assert.equal(updaterEnableCalls, 1);
    assert.equal((await (await fetch(`${url}/__cospace/health`)).json()).updaterEnabled, true);
  } finally {
    await service.close();
    await rm(root, { recursive: true, force: true });
  }
});

test('a connection arriving during the upgrade grace period prevents a switch', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'cospace-upgrade-race-'));
  const runtimeHome = path.join(root, 'runtime');
  const dataHome = path.join(root, 'data');
  const oldHome = path.join(runtimeHome, 'versions', '1.0.0');
  const nextHome = path.join(runtimeHome, 'versions', '2.0.0');
  await mkdir(path.join(oldHome, 'web'), { recursive: true });
  await mkdir(nextHome, { recursive: true });
  await writeFile(path.join(nextHome, 'daemon.cjs'), '');
  const service = await startLocalService({ dataHome, runtimeHome, versionHome: oldHome, version: '1.0.0' });
  const headers = { 'content-type': 'application/json', 'x-cospace-rpc-token': service.rpcToken };
  const request = (route, body) => fetch(`${service.url.replace(/\/$/, '')}${route}`, { method: 'POST', headers, body: JSON.stringify(body) });
  try {
    const scheduled = await ensureLocalDaemon({ dataHome, runtimeHome, versionHome: nextHome, version: '2.0.0', autoUpdate: true });
    assert.equal(scheduled.upgradeNotice, 'scheduled');
    assert.equal((await request('/__cospace/mcp/session', { action: 'open', id: 'race-session-long-enough' })).status, 200);
    await new Promise(resolve => setTimeout(resolve, 750));
    const health = await (await fetch(`${service.url}__cospace/health`)).json();
    assert.equal(health.version, '1.0.0');
    assert.equal(health.activeMcpClients, 1);
    assert.deepEqual(health.update, { state: 'waiting', targetVersion: '2.0.0' });
  } finally {
    await service.close();
    await rm(root, { recursive: true, force: true });
  }
});

test('an expired session is swept without requests and the daemon switches to the staged candidate', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'cospace-runtime-switch-'));
  const runtimeHome = path.join(root, 'runtime');
  const dataHome = path.join(root, 'data');
  const oldHome = path.join(runtimeHome, 'versions', '1.0.0');
  const candidateHome = path.join(runtimeHome, 'versions', '2.0.0');
  await Promise.all([mkdir(path.join(oldHome, 'web'), { recursive: true }), mkdir(path.join(candidateHome, 'web'), { recursive: true })]);
  const serviceModule = new URL('../packages/local-runtime/src/service.js', import.meta.url).href;
  const runnerPath = path.join(root, 'runner.mjs');
  const candidatePath = path.join(candidateHome, 'daemon.cjs');
  await writeFile(path.join(oldHome, 'daemon.cjs'), '');
  await writeFile(path.join(oldHome, 'web/index.html'), '');
  await writeFile(path.join(candidateHome, 'web/index.html'), '');
  await writeFile(candidatePath, `(async()=>{const fs=await import('node:fs/promises');await fs.writeFile(process.env.COSPACE_RUNTIME_HOME+'/candidate-started',process.env.COSPACE_PACKAGE_VERSION);await new Promise(resolve=>setTimeout(resolve,1000));try{const {startLocalService}=await import(process.env.COSPACE_TEST_SERVICE_MODULE);const service=await startLocalService({dataHome:process.env.COSPACE_DATA_HOME,runtimeHome:process.env.COSPACE_RUNTIME_HOME,versionHome:process.env.COSPACE_VERSION_HOME,version:process.env.COSPACE_PACKAGE_VERSION,port:Number(process.env.COSPACE_UPDATE_PORT||0),fallbackPort:true});process.once('SIGTERM',()=>service.close().finally(()=>process.exit(0)));}catch(error){await fs.writeFile(process.env.COSPACE_RUNTIME_HOME+'/candidate-error',error.stack||error.message);process.exit(1)}})();`);
  await writeFile(runnerPath, `import {startLocalService} from ${JSON.stringify(serviceModule)};const service=await startLocalService({dataHome:process.env.COSPACE_TEST_DATA,runtimeHome:process.env.COSPACE_TEST_RUNTIME,versionHome:process.env.COSPACE_TEST_OLD_HOME,version:'1.0.0',mcpSessionTtlMs:300,sessionSweepIntervalMs:50});console.log(JSON.stringify({url:service.url,rpcToken:service.rpcToken}));process.once('SIGTERM',()=>service.close().finally(()=>process.exit(0)));`);
  const runner = spawn(process.execPath, [runnerPath], { env: { ...process.env, COSPACE_TEST_SERVICE_MODULE: serviceModule, COSPACE_TEST_DATA: dataHome, COSPACE_TEST_RUNTIME: runtimeHome, COSPACE_TEST_OLD_HOME: oldHome }, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  runner.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; });
  runner.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
  let endpoint;
  const startDeadline = Date.now() + 10000;
  try {
    while (!endpoint && Date.now() < startDeadline && runner.exitCode === null && runner.signalCode === null) {
      const line = stdout.split(/\r?\n/).find(value => value.startsWith('{'));
      if (line) endpoint = JSON.parse(line);
      else await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.ok(endpoint, `old service did not start: ${stderr}`);
    const base = endpoint.url.replace(/\/$/, '');
    const opened = await fetch(`${base}/__cospace/mcp/session`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cospace-rpc-token': endpoint.rpcToken }, body: JSON.stringify({ action: 'open', id: 'expired-session-long-enough' }) });
    assert.equal(opened.status, 200);
    const response = await fetch(`${base}/__cospace/control/upgrade`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-cospace-rpc-token': endpoint.rpcToken }, body: JSON.stringify({ version: '2.0.0' }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).result, { scheduled: true, waitingForConnections: true });
    const deadline = Date.now() + 12000;
    let health;
    while (Date.now() < deadline) {
      try {
        const endpointData = JSON.parse(await (await import('node:fs/promises')).readFile(path.join(runtimeHome, 'endpoint.json'), 'utf8'));
        if (endpointData.version === '2.0.0') {
          const current = await fetch(`http://${endpointData.host}:${endpointData.port}/__cospace/health`);
          const body = await current.json();
          if (body.version === '2.0.0') { health = body; break; }
        }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(health?.version, '2.0.0', `candidate did not become healthy; launch: ${await (await import('node:fs/promises')).readFile(path.join(runtimeHome, 'candidate-started'), 'utf8').catch(error => error.message)}; error: ${await (await import('node:fs/promises')).readFile(path.join(runtimeHome, 'candidate-error'), 'utf8').catch(error => error.message)}; spawn: ${await (await import('node:fs/promises')).readFile(path.join(runtimeHome, 'upgrade.log'), 'utf8').catch(error => error.message)}; runner stderr: ${stderr}`);
    assert.equal(health?.updaterEnabled, false);
    const currentEndpoint = JSON.parse(await (await import('node:fs/promises')).readFile(path.join(runtimeHome, 'endpoint.json'), 'utf8'));
    assert.equal(currentEndpoint.port, new URL(endpoint.url).port * 1);
  } finally {
    try {
      const endpointData = JSON.parse(await (await import('node:fs/promises')).readFile(path.join(runtimeHome, 'endpoint.json'), 'utf8'));
      await fetch(`http://${endpointData.host}:${endpointData.port}/__cospace/control/stop`, { method: 'POST', headers: { 'x-cospace-rpc-token': endpoint.rpcToken } });
    } catch {}
    if (runner.exitCode === null && runner.signalCode === null) {
      const exited = new Promise(resolve => runner.once('exit', resolve));
      runner.kill('SIGTERM');
      let timeout;
      await Promise.race([exited, new Promise(resolve => { timeout = setTimeout(resolve, 3000); })]);
      clearTimeout(timeout);
    }
    await rm(root, { recursive: true, force: true });
  }
});

test('a failed candidate restarts the previous runtime without replacing user data', { timeout: 30000 }, async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'cospace-upgrade-rollback-'));
  const runtimeHome = path.join(root, 'runtime');
  const dataHome = path.join(root, 'data');
  const oldHome = path.join(runtimeHome, 'versions', '1.0.0');
  const candidateHome = path.join(runtimeHome, 'versions', '2.0.0');
  await Promise.all([mkdir(path.join(oldHome, 'web'), { recursive: true }), mkdir(candidateHome, { recursive: true }), mkdir(dataHome, { recursive: true })]);
  await writeFile(path.join(dataHome, 'keep.txt'), 'user data');
  const serviceModule = new URL('../packages/local-runtime/src/service.js', import.meta.url).href;
  const oldDaemon = path.join(oldHome, 'daemon.cjs');
  await writeFile(oldDaemon, `(async()=>{const {startLocalService}=await import(${JSON.stringify(serviceModule)});const s=await startLocalService({dataHome:process.env.COSPACE_DATA_HOME,runtimeHome:process.env.COSPACE_RUNTIME_HOME,versionHome:process.env.COSPACE_VERSION_HOME,version:process.env.COSPACE_PACKAGE_VERSION,port:Number(process.env.COSPACE_UPDATE_PORT||0),fallbackPort:true});console.log(JSON.stringify({url:s.url,rpcToken:s.rpcToken}));process.on('SIGTERM',()=>s.close().finally(()=>process.exit(0)))})().catch(()=>process.exit(1));`);
  await writeFile(path.join(candidateHome, 'daemon.cjs'), 'process.exit(1);');
  const runner = spawn(process.execPath, [oldDaemon], { env: { ...process.env, COSPACE_DATA_HOME: dataHome, COSPACE_RUNTIME_HOME: runtimeHome, COSPACE_VERSION_HOME: oldHome, COSPACE_PACKAGE_VERSION: '1.0.0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  runner.stdout.setEncoding('utf8').on('data', chunk => { output += chunk; });
  let endpoint;
  try {
    const startDeadline = Date.now() + 10000;
    while (!endpoint && Date.now() < startDeadline && runner.exitCode === null && runner.signalCode === null) {
      const line = output.split(/\r?\n/).find(value => value.startsWith('{'));
      if (line) endpoint = JSON.parse(line); else await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.ok(endpoint, 'old service did not start');
    const secrets = JSON.parse(await (await import('node:fs/promises')).readFile(path.join(runtimeHome, 'secrets.json'), 'utf8'));
    const api = (url, method, args) => fetch(`${url}cospace-api`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cospace-token': secrets.uiToken }, body: JSON.stringify({ method, args }) });
    const created = await api(endpoint.url, 'createDocument', { title: 'Rollback preservation', operationId: 'rollback-test-create' });
    assert.equal(created.status, 200);
    const response = await fetch(`${endpoint.url}__cospace/control/upgrade`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cospace-rpc-token': endpoint.rpcToken }, body: JSON.stringify({ version: '2.0.0' }) });
    assert.equal(response.status, 200);
    const deadline = Date.now() + 5000;
    let restored;
    while (Date.now() < deadline) {
      try {
        const current = JSON.parse(await (await import('node:fs/promises')).readFile(path.join(runtimeHome, 'endpoint.json'), 'utf8'));
        if (current.version === '1.0.0' && current.pid !== runner.pid) {
          const health = await (await fetch(`http://${current.host}:${current.port}/__cospace/health`)).json();
          if (health.ready && health.version === '1.0.0') { restored = current; break; }
        }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(restored, 'previous service did not recover');
    assert.equal(await (await import('node:fs/promises')).readFile(path.join(dataHome, 'keep.txt'), 'utf8'), 'user data');
    const documents = await (await api(`http://${restored.host}:${restored.port}/`, 'listDocuments', {})).json();
    assert.ok(documents.result.some(item => item.title === 'Rollback preservation'));
  } finally {
    try {
      const current = JSON.parse(await (await import('node:fs/promises')).readFile(path.join(runtimeHome, 'endpoint.json'), 'utf8'));
      await fetch(`http://${current.host}:${current.port}/__cospace/control/stop`, { method: 'POST', headers: { 'x-cospace-rpc-token': endpoint?.rpcToken || '' } });
    } catch {}
    if (runner.exitCode === null && runner.signalCode === null) runner.kill('SIGTERM');
    await rm(root, { recursive: true, force: true });
  }
});
