import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import os from 'node:os';
import path from 'node:path';
import { backupBeforeVersionChange, recordHealthyVersion } from '../apps/desktop/src/runtime/backup.js';
import { ensureLocalDaemon } from '../packages/local-runtime/src/manager.js';
import { startLocalService } from '../packages/local-runtime/src/service.js';

test('desktop version changes retain a consistent backup before opening data', async t => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'cospace-version-backup-'));
  t.after(() => rm(home, { recursive: true, force: true }));
  const db = new DatabaseSync(path.join(home, 'review.sqlite'));
  db.exec("PRAGMA journal_mode=WAL; CREATE TABLE documents(id TEXT, content TEXT); INSERT INTO documents VALUES('doc','private text')");
  t.after(() => db.close());
  const first = await backupBeforeVersionChange(home, '1.0.0');
  const copy = new DatabaseSync(path.join(first, 'review.sqlite'), { readOnly: true });
  try { assert.equal(copy.prepare('SELECT content FROM documents').get().content, 'private text'); }
  finally { copy.close(); }
  await recordHealthyVersion(home, '1.0.0');
  assert.equal(await backupBeforeVersionChange(home, '1.0.0'), null);
  db.exec("UPDATE documents SET content='new text'");
  const second = await backupBeforeVersionChange(home, '2.0.0');
  assert.notEqual(first, second);
  assert.equal(JSON.parse(await readFile(path.join(second, 'metadata.json'), 'utf8')).previousVersion, '1.0.0');
  assert.equal((await readdir(path.join(home, 'backups'))).length, 2);
});

test('desktop refuses an invalid version marker or a newer data layout', async t => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'cospace-version-marker-'));
  t.after(() => rm(home, { recursive: true, force: true }));
  await writeFile(path.join(home, 'desktop-runtime.json'), 'bad json');
  await assert.rejects(backupBeforeVersionChange(home, '1.0.0'), { code: 'RUNTIME_MARKER_INVALID' });
  await rm(path.join(home, 'desktop-runtime.json'));
  const db = new DatabaseSync(path.join(home, 'review.sqlite'));
  db.exec('CREATE TABLE cospace_data_layout(id INTEGER PRIMARY KEY, version INTEGER); INSERT INTO cospace_data_layout VALUES(1,999)');
  db.close();
  await assert.rejects(backupBeforeVersionChange(home, '1.0.0'), { code: 'DATA_LAYOUT_MISMATCH' });
});

test('desktop does not start a second daemon when an existing endpoint is unresponsive but alive', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'cospace-runtime-uncertain-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const runtimeHome = path.join(root, 'profile');
  await mkdir(runtimeHome);
  const endpoint = JSON.stringify({ pid: process.pid, runtimeId: 'profile', host: '127.0.0.1', port: 1 });
  await writeFile(path.join(runtimeHome, 'endpoint.json'), endpoint);
  await assert.rejects(ensureLocalDaemon({ dataHome: path.join(root, 'data'), runtimeHome, versionHome: root, timeoutMs: 1000 }), { code: 'SERVICE_STATE_UNCERTAIN' });
  assert.equal(await readFile(path.join(runtimeHome, 'endpoint.json'), 'utf8'), endpoint);
  await assert.rejects(readFile(path.join(runtimeHome, 'start.lock')), { code: 'ENOENT' });
});

test('a failed pre-advertisement step never publishes a ready endpoint', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'cospace-before-ready-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const runtimeHome = path.join(root, 'runtime');
  await assert.rejects(startLocalService({ dataHome: path.join(root, 'data'), runtimeHome, versionHome: root, beforeAdvertise: () => { throw new Error('marker failed'); } }), /marker failed/);
  await assert.rejects(readFile(path.join(runtimeHome, 'endpoint.json')), { code: 'ENOENT' });
});
