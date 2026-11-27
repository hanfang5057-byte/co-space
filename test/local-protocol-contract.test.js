import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ensureLocalDaemon, localServiceStatus } from '../packages/local-runtime/src/manager.js';
import { LOCAL_PROTOCOL_VERSION } from '../packages/local-runtime/src/paths.js';

test('clients accept matching daemon protocols and reject old, new and missing versions before use', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'cospace-protocol-'));
  const runtimeHome = path.join(root, 'profile');
  await mkdir(runtimeHome);
  let protocolVersion = LOCAL_PROTOCOL_VERSION;
  const server = createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ready: true, runtimeId: 'profile', version: '0.1.0', protocolVersion }));
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  try {
    await writeFile(path.join(runtimeHome, 'endpoint.json'), JSON.stringify({ host: '127.0.0.1', port: server.address().port, runtimeId: 'profile' }));
    await writeFile(path.join(runtimeHome, 'secrets.json'), JSON.stringify({ rpcToken: 'rpc', uiToken: 'ui' }));
    const options = { dataHome: path.join(root, 'data'), runtimeHome, versionHome: root };
    assert.equal((await ensureLocalDaemon(options)).protocolVersion, LOCAL_PROTOCOL_VERSION);
    for (const version of [LOCAL_PROTOCOL_VERSION - 1, LOCAL_PROTOCOL_VERSION + 1, undefined]) {
      protocolVersion = version;
      await assert.rejects(ensureLocalDaemon(options), { code: 'LOCAL_SERVER_PROTOCOL_MISMATCH' });
      assert.equal((await localServiceStatus(options)).compatible, false);
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});

test('a cross-protocol upgrade is scheduled only by a layout-aware supervisor', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'cospace-safe-upgrade-'));
  const runtimeHome = path.join(root, 'profile');
  await mkdir(runtimeHome);
  let safe = false;
  let requests = 0;
  const server = createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    if (req.url === '/__cospace/control/upgrade') { requests++; res.end(JSON.stringify({ result: { scheduled: true } })); }
    else res.end(JSON.stringify({ ready: true, runtimeId: 'profile', version: '1.0.0', protocolVersion: LOCAL_PROTOCOL_VERSION - 1, ...(safe ? { safeUpgradeProtocol: 1 } : {}) }));
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  try {
    await writeFile(path.join(runtimeHome, 'endpoint.json'), JSON.stringify({ host: '127.0.0.1', port: server.address().port, runtimeId: 'profile' }));
    await writeFile(path.join(runtimeHome, 'secrets.json'), JSON.stringify({ rpcToken: 'rpc', uiToken: 'ui' }));
    const options = { dataHome: path.join(root, 'data'), runtimeHome, versionHome: root, version: '2.0.0', autoUpdate: true };
    await assert.rejects(ensureLocalDaemon(options), { code: 'LOCAL_SERVER_PROTOCOL_MISMATCH' });
    assert.equal(requests, 0);
    safe = true;
    await assert.rejects(ensureLocalDaemon(options), { code: 'LOCAL_SERVER_UPGRADE_PENDING' });
    assert.equal(requests, 1);
    await assert.rejects(ensureLocalDaemon({ ...options, scheduleUpgrade: false }), { code: 'LOCAL_SERVER_PROTOCOL_MISMATCH' });
    assert.equal(requests, 1);
  } finally { await new Promise(resolve => server.close(resolve)); await rm(root, { recursive: true, force: true }); }
});
