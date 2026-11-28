import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { promisify } from 'node:util';
import { ReviewStore } from '../packages/review-core/src/review-core.js';
import { CommentStore } from '../packages/review-core/src/comments.js';

test('v2 migration preserves comments and converts legacy processing rows', () => {
  const home = mkdtempSync(path.join(tmpdir(), 'cospace-schema-v2-'));
  let store;
  try {
    const file = path.join(home, 'review.sqlite');
    store = new ReviewStore(file);
    store.createDocument({ id: 'doc', content: 'abc', operationId: 'create' });
    store.db.prepare(`INSERT INTO space_comments(id,doc_id,quote,body,from_pos,to_pos,doc_version,status)
      VALUES('comment','doc','a','clarify',0,1,0,'pending')`).run();
    store.db.exec(`CREATE TABLE space_comment_processing(
      comment_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL, status TEXT NOT NULL,
      suggestion_ids TEXT NOT NULL, reason TEXT, operation_id TEXT NOT NULL, updated_at TEXT NOT NULL
    );`);
    store.db.prepare('INSERT INTO space_comment_processing VALUES(?,?,?,?,?,?,?)')
      .run('comment', 'doc', 'needs_clarification', '[]', 'Need context', 'process-op', '2026-01-01T00:00:00.000Z');
    store.db.prepare("UPDATE space_meta SET value='markdown-text-v2' WHERE key='schema'").run();
    store.close(); store = null;

    store = new ReviewStore(file);
    assert.equal(existsSync(`${file}.pre-v3.bak`), true);
    const result = store.db.prepare('SELECT * FROM space_comment_results WHERE comment_id=?').get('comment');
    assert.equal(result.status, 'needs_clarification');
    assert.equal(result.reason, 'Need context');
    assert.equal(result.operation_id, 'process-op');
    assert.equal(store.db.prepare('SELECT status FROM space_comments WHERE id=?').get('comment').status, 'pending');
    const comments = new CommentStore(store.db);
    const migratedComment = comments.list('doc').find(item => item.id === 'comment');
    assert.equal(migratedComment.processing.status, 'needs_clarification');
    assert.equal(migratedComment.processing.reason, 'Need context');
    assert.equal(store.db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='space_comment_processing'").get(), undefined);
    assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(), []);
    assert.equal(store.db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  } finally { store?.close(); rmSync(home, { recursive: true, force: true }); }
});

test('v3 schema enforces relations and states and exposes document query indexes', () => {
  const store = new ReviewStore(':memory:');
  try {
    assert.equal(store.db.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
    const indexes = new Set(store.db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map(row => row.name));
    assert.ok(indexes.has('review_suggestions_doc_status_order_idx'));
    assert.ok(indexes.has('review_suggestions_doc_order_idx'));
    assert.ok(indexes.has('space_comments_doc_status_idx'));
    store.createDocument({ id: 'doc', content: 'abc', operationId: 'create' });
    assert.throws(() => store.db.prepare(`INSERT INTO review_suggestions
      (doc_id,status,base_version,from_pos,to_pos,expected,replacement,before_context,after_context,created_order)
      VALUES('doc','unknown',0,0,1,'a','A','','',1)`).run());
    assert.throws(() => store.db.prepare(`INSERT INTO review_suggestions
      (doc_id,status,base_version,from_pos,to_pos,expected,replacement,before_context,after_context,created_order)
      VALUES('missing','pending',0,0,1,'a','A','','',1)`).run());
    const plan = store.db.prepare(`EXPLAIN QUERY PLAN SELECT id FROM review_suggestions
      WHERE doc_id=? AND status IN ('pending','conflicted') ORDER BY created_order`).all('doc').map(row => row.detail).join(' ');
    assert.match(plan, /review_suggestions_doc_(?:status_)?order_idx/);
    store.db.prepare(`INSERT INTO space_comments(id,doc_id,quote,body,from_pos,to_pos,doc_version)
      VALUES('comment','doc','a','note',0,1,0)`).run();
    store.db.prepare('DELETE FROM review_documents WHERE id=?').run('doc');
    assert.equal(store.db.prepare('SELECT id FROM space_comments WHERE id=?').get('comment'), undefined);
  } finally { store.close(); }
});

test('concurrent first opens serialize v2 migration and keep one verified backup', async () => {
  const home = mkdtempSync(path.join(tmpdir(), 'cospace-schema-race-'));
  const file = path.join(home, 'review.sqlite');
  let store;
  try {
    store = new ReviewStore(file);
    store.createDocument({ id: 'doc', content: 'body', operationId: 'create' });
    store.db.prepare("UPDATE space_meta SET value='markdown-text-v2' WHERE key='schema'").run();
    store.close(); store = null;
    const moduleUrl = new URL('../packages/review-core/src/review-core.js', import.meta.url).href;
    const script = `import {ReviewStore} from ${JSON.stringify(moduleUrl)}; const store=new ReviewStore(process.argv[1]); if(store.readDocument('doc').content!=='body') process.exitCode=1; store.close();`;
    await Promise.all(Array.from({ length: 4 }, () => promisify(execFile)(process.execPath, ['--input-type=module', '-e', script, file])));
    const verify = new DatabaseSync(file, { readOnly: true });
    try {
      assert.equal(verify.prepare("SELECT value FROM space_meta WHERE key='schema'").get().value, 'markdown-text-v3');
      assert.equal(verify.prepare('SELECT count(*) AS n FROM review_documents').get().n, 1);
      assert.equal(verify.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    } finally { verify.close(); }
    assert.equal(existsSync(`${file}.pre-v3.bak`), true);
  } finally { store?.close(); rmSync(home, { recursive: true, force: true }); }
});
