import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { CollaborationStore } from '../packages/review-core/src/collaboration-store.js';

function legacy(home) {
  const db = new DatabaseSync(path.join(home, 'collaboration.sqlite'));
  db.exec(`CREATE TABLE collaboration_instructions(scope TEXT PRIMARY KEY, content TEXT NOT NULL, version INTEGER NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE collaboration_operations(id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, result TEXT NOT NULL);`);
  const result = { scope: 'document', docId: 'd', content: 'Document style', version: 1, updatedAt: '2026-01-01' };
  const fingerprint = createHash('sha256').update(JSON.stringify({ key: 'doc:d', content: 'Document style', baseVersion: 0 })).digest('hex');
  db.prepare('INSERT INTO collaboration_instructions VALUES(?,?,?,?)').run('global', 'Global style', 2, '2026-01-01');
  db.prepare('INSERT INTO collaboration_instructions VALUES(?,?,?,?)').run('doc:d', result.content, 1, result.updatedAt);
  db.prepare('INSERT INTO collaboration_operations VALUES(?,?,?)').run('legacy-op', fingerprint, JSON.stringify(result));
  db.close();
  return result;
}

test('legacy preferences and retry records migrate once while retaining the source', () => {
  const home = mkdtempSync(path.join(os.tmpdir(), 'cospace-migrate-'));
  try {
    const expected = legacy(home);
    let store = new CollaborationStore(home);
    assert.equal(store.readInstructions('d').global.content, 'Global style');
    assert.equal(store.readInstructions('d').document.content, 'Document style');
    assert.deepEqual(store.saveInstructions({ scope: 'document', docId: 'd', content: 'Document style', baseVersion: 0, operationId: 'legacy-op' }), expected);
    store.saveInstructions({ scope: 'document', docId: 'd', content: 'New style', baseVersion: 1, operationId: 'new-op' });
    store.close();
    const source = new DatabaseSync(path.join(home, 'collaboration.sqlite'), { readOnly: true });
    assert.equal(source.prepare("SELECT content FROM collaboration_instructions WHERE scope='doc:d'").get().content, 'Document style');
    source.close();
    // After migration the backup is no longer needed for startup.
    writeFileSync(path.join(home, 'collaboration.sqlite'), 'not a database');
    store = new CollaborationStore(home);
    assert.equal(store.readInstructions('d').document.content, 'New style');
    store.close();
  } finally { rmSync(home, { recursive: true, force: true }); }
});

test('existing destination values win when a legacy database appears later', () => {
  const home = mkdtempSync(path.join(os.tmpdir(), 'cospace-migrate-existing-'));
  try {
    let store = new CollaborationStore(home);
    store.saveInstructions({ scope: 'global', content: 'Current', baseVersion: 0, operationId: 'current' });
    store.close();
    legacy(home);
    store = new CollaborationStore(home);
    assert.equal(store.readInstructions('d').global.content, 'Current');
    assert.equal(store.readInstructions('d').document.content, 'Document style');
    store.close();
  } finally { rmSync(home, { recursive: true, force: true }); }
});

test('failed migration rolls back rows and completion marker and is retried', () => {
  const home = mkdtempSync(path.join(os.tmpdir(), 'cospace-migrate-retry-'));
  try {
    let store = new CollaborationStore(home);
    store.db.exec("CREATE TRIGGER fail_migration BEFORE INSERT ON collaboration_operations BEGIN SELECT RAISE(ABORT, 'injected failure'); END;");
    store.close();
    legacy(home);
    assert.throws(() => new CollaborationStore(home), /injected failure/);
    const db = new DatabaseSync(path.join(home, 'review.sqlite'));
    assert.equal(db.prepare('SELECT count(*) AS n FROM collaboration_instructions').get().n, 0);
    assert.equal(db.prepare('SELECT count(*) AS n FROM cospace_migrations WHERE id=?').get('legacy-collaboration-v1').n, 0);
    db.exec('DROP TRIGGER fail_migration');
    db.close();
    store = new CollaborationStore(home);
    assert.equal(store.readInstructions('d').document.content, 'Document style');
    store.close();
  } finally { rmSync(home, { recursive: true, force: true }); }
});

test('concurrent processes serialize the one-time migration', async () => {
  const home = mkdtempSync(path.join(os.tmpdir(), 'cospace-migrate-race-'));
  try {
    legacy(home);
    const moduleUrl = new URL('../packages/review-core/src/collaboration-store.js', import.meta.url).href;
    const script = `import { CollaborationStore } from ${JSON.stringify(moduleUrl)}; const store = new CollaborationStore(process.argv[1]); if (store.readInstructions('d').document?.content !== 'Document style') process.exitCode = 1; store.close();`;
    await Promise.all(Array.from({ length: 4 }, () => promisify(execFile)(process.execPath, ['--input-type=module', '-e', script, home])));
    const db = new DatabaseSync(path.join(home, 'review.sqlite'));
    try {
      assert.equal(db.prepare('SELECT count(*) AS n FROM cospace_migrations WHERE id=?').get('legacy-collaboration-v1').n, 1);
      assert.equal(db.prepare('SELECT count(*) AS n FROM collaboration_instructions').get().n, 2);
    } finally { db.close(); }
  } finally { rmSync(home, { recursive: true, force: true }); }
});
