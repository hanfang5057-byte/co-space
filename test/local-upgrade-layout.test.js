import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import os from 'node:os';
import path from 'node:path';
import { startLocalService } from '../packages/local-runtime/src/service.js';
import { LOCAL_PROTOCOL_VERSION, resolveRuntimeHome } from '../packages/local-runtime/src/paths.js';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

test('an old upgrade supervisor cannot cause migration before a manual restart', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'cospace-old-supervisor-'));
  try {
    const data = path.join(root, 'data');
    await mkdir(data);
    const source = new DatabaseSync(path.join(data, 'collaboration.sqlite'));
    source.exec('CREATE TABLE collaboration_instructions(scope TEXT PRIMARY KEY,content TEXT,version INTEGER,updated_at TEXT); CREATE TABLE collaboration_operations(id TEXT PRIMARY KEY,fingerprint TEXT,result TEXT); INSERT INTO collaboration_instructions VALUES (\'global\',\'legacy\',1,\'date\')');
    source.close();
    await assert.rejects(promisify(execFile)(process.execPath, ['apps/local-server/src/daemon-entry.js'], { cwd: path.resolve(import.meta.dirname, '..'), env: { ...process.env, COSPACE_DATA_HOME: data, COSPACE_RUNTIME_HOME: path.join(root, 'runtime'), COSPACE_VERSION_HOME: root, COSPACE_UPDATE_RESULT: 'updated', COSPACE_UPGRADE_SUPERVISOR: '' } }), error => /manual service restart/.test(error.stderr));
    await assert.rejects(readFile(path.join(data, 'review.sqlite')), { code: 'ENOENT' });
    const check = new DatabaseSync(path.join(data, 'collaboration.sqlite'), { readOnly: true });
    try { assert.equal(check.prepare('SELECT content FROM collaboration_instructions').get().content, 'legacy'); } finally { check.close(); }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('manual rollback rejects incompatible layout before stopping the running service', { timeout: 20000 }, async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'cospace-manual-rollback-'));
  const data = path.join(root, 'data');
  const env = { ...process.env, COSPACE_WEB_HOME: data, XDG_DATA_HOME: path.join(root, 'xdg') };
  const runtime = resolveRuntimeHome({ dataHome: data, env, platform: process.platform });
  const build = path.join(root, 'build');
  const target = path.join(runtime, 'versions', '0.0.1');
  let service;
  try {
    await promisify(execFile)(process.execPath, ['apps/local-server/scripts/build.mjs'], { cwd: path.resolve(import.meta.dirname, '..'), env: { ...env, COSPACE_BUILD_OUTPUT: build } });
    await mkdir(target, { recursive: true });
    await writeFile(path.join(target, 'runtime.json'), JSON.stringify({ version: '0.0.1', protocolVersion: LOCAL_PROTOCOL_VERSION, dataLayoutVersion: 1 }));
    service = await startLocalService({ dataHome: data, runtimeHome: runtime, versionHome: build, version: '2.0.0' });
    await assert.rejects(promisify(execFile)(process.execPath, [path.join(build, 'cli.js'), 'service', 'rollback', '0.0.1'], { env }), error => /not installed/.test(error.stderr));
    assert.equal((await (await fetch(`${service.url}__cospace/health`)).json()).ready, true);
  } finally { await service?.close(); await rm(root, { recursive: true, force: true }); }
});

test('failed candidate with newer data layout never restarts the incompatible old runtime', { timeout: 20000 }, async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'cospace-layout-rollback-'));
  const data = path.join(root, 'data');
  const runtime = path.join(root, 'runtime');
  const old = path.join(runtime, 'versions', '1.0.0');
  const candidate = path.join(runtime, 'versions', '2.0.0');
  await Promise.all([mkdir(path.join(old, 'web'), { recursive: true }), mkdir(candidate, { recursive: true })]);
  const serviceUrl = new URL('../packages/local-runtime/src/service.js', import.meta.url).href;
  const oldScript = `(async()=>{const fs=await import('node:fs/promises');await fs.appendFile(process.env.COSPACE_RUNTIME_HOME+'/launches','old\\n');const {startLocalService}=await import(${JSON.stringify(serviceUrl)});const s=await startLocalService({dataHome:process.env.COSPACE_DATA_HOME,runtimeHome:process.env.COSPACE_RUNTIME_HOME,versionHome:process.env.COSPACE_VERSION_HOME,version:process.env.COSPACE_PACKAGE_VERSION});console.log(JSON.stringify({url:s.url,token:s.rpcToken}));process.on('SIGTERM',()=>s.close().finally(()=>process.exit(0)))})().catch(()=>process.exit(1));`;
  await writeFile(path.join(old, 'daemon.cjs'), oldScript);
  await writeFile(path.join(candidate, 'daemon.cjs'), `const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(process.env.COSPACE_DATA_HOME+'/review.sqlite');db.prepare('UPDATE cospace_data_layout SET version=3 WHERE id=1').run();db.close();process.exit(1);`);
  const runner = spawn(process.execPath, [path.join(old, 'daemon.cjs')], { env: { ...process.env, COSPACE_DATA_HOME: data, COSPACE_RUNTIME_HOME: runtime, COSPACE_VERSION_HOME: old, COSPACE_PACKAGE_VERSION: '1.0.0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  runner.stdout.on('data', chunk => { output += chunk; });
  try {
    let endpoint;
    for (let i = 0; i < 100 && !endpoint; i++) { const line = output.split('\n').find(value => value.startsWith('{')); if (line) endpoint = JSON.parse(line); else await delay(50); }
    assert.ok(endpoint);
    const response = await fetch(`${endpoint.url}__cospace/control/upgrade`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cospace-rpc-token': endpoint.token }, body: JSON.stringify({ version: '2.0.0' }) });
    assert.equal(response.status, 200);
    let failure;
    for (let i = 0; i < 200 && !failure; i++) { try { failure = JSON.parse(await readFile(path.join(runtime, 'upgrade-failure.json'), 'utf8')); } catch { await delay(50); } }
    assert.equal(failure?.code, 'ROLLBACK_DATA_LAYOUT_MISMATCH');
    assert.equal(await readFile(path.join(runtime, 'launches'), 'utf8'), 'old\n');
    const db = new DatabaseSync(path.join(data, 'review.sqlite'), { readOnly: true });
    try { assert.equal(db.prepare('SELECT version FROM cospace_data_layout').get().version, 3); } finally { db.close(); }
  } finally { if (runner.exitCode === null && runner.signalCode === null) runner.kill('SIGTERM'); await rm(root, { recursive: true, force: true }); }
});
