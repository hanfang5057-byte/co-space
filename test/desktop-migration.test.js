import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import os from 'node:os';
import path from 'node:path';
import { migrateLocalProfile } from '../apps/desktop/src/migration.js';
import { endpointFile, resolveRuntimeHome } from '../packages/local-runtime/src/paths.js';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'cospace-migration-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const sourceHome = path.join(root, 'old');
  const destinationHome = path.join(root, 'desktop');
  const env = { XDG_DATA_HOME: path.join(root, 'runtime') };
  await mkdir(sourceHome);
  const db = new DatabaseSync(path.join(sourceHome, 'review.sqlite'));
  db.exec("PRAGMA journal_mode=WAL; CREATE TABLE documents(id TEXT, body TEXT); INSERT INTO documents VALUES ('1','private text')");
  t.after(() => db.close());
  return { root, sourceHome, destinationHome, env, platform: 'linux', db };
}

test('migration copies a WAL-backed database, keeps the source, and never overwrites a destination', async t => {
  const f = await fixture(t);
  await migrateLocalProfile(f);
  const copy = new DatabaseSync(path.join(f.destinationHome, 'review.sqlite'), { readOnly: true });
  try { assert.deepEqual({ ...copy.prepare('SELECT * FROM documents').get() }, { id: '1', body: 'private text' }); }
  finally { copy.close(); }
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM documents').get().n, 1);
  await assert.rejects(migrateLocalProfile(f), { code: 'DESTINATION_EXISTS' });
});

test('migration refuses running profiles and unsupported files without touching the source', async t => {
  const f = await fixture(t);
  const runtime = resolveRuntimeHome({ dataHome: f.sourceHome, env: f.env, platform: f.platform });
  await mkdir(runtime, { recursive: true });
  await writeFile(endpointFile(runtime), '{}');
  await assert.rejects(migrateLocalProfile(f), { code: 'PROFILE_BUSY' });
  await rm(endpointFile(runtime));
  await writeFile(path.join(f.sourceHome, 'unknown.txt'), 'keep');
  await assert.rejects(migrateLocalProfile(f), { code: 'UNSUPPORTED_SOURCE_FILE' });
  assert.equal(await readFile(path.join(f.sourceHome, 'unknown.txt'), 'utf8'), 'keep');
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM documents').get().n, 1);
});

test('migration refuses newer layouts and nested destinations without creating a destination', async t => {
  const f = await fixture(t);
  f.db.exec('CREATE TABLE cospace_data_layout(id INTEGER PRIMARY KEY, version INTEGER); INSERT INTO cospace_data_layout VALUES (1, 999)');
  await assert.rejects(migrateLocalProfile(f), { code: 'DATA_LAYOUT_MISMATCH' });
  await assert.rejects(readFile(path.join(f.destinationHome, 'review.sqlite')), { code: 'ENOENT' });
  await assert.rejects(migrateLocalProfile({ ...f, destinationHome: path.join(f.sourceHome, 'nested', 'profile') }), { code: 'INVALID_DESTINATION' });
  await assert.rejects(readFile(path.join(f.sourceHome, 'nested')), { code: 'ENOENT' });
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM documents').get().n, 1);
});
