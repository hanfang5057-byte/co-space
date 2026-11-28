import { existsSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { DATA_LAYOUT_VERSION } from '../data-layout.js';

const REVIEW_SCHEMA = 'markdown-text-v3';
const DATA_LAYOUT = DATA_LAYOUT_VERSION;
const MIGRATION_ID = 'sqlite-schema-v3';
const LEGACY_COLLABORATION_ID = 'legacy-collaboration-v1';
const fail = (code, message, details = {}) => { throw Object.assign(new Error(message), { code, details }); };
const tables = new Set([
  'review_documents', 'review_suggestions', 'review_operations', 'review_changes',
  'space_comments', 'space_comment_sends', 'space_comment_completions', 'space_comment_results',
  'collaboration_instructions', 'collaboration_operations',
]);

function hasTable(db, name) {
  return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name));
}

function rows(db, name) {
  return hasTable(db, name) ? db.prepare(`SELECT * FROM "${name}"`).all() : [];
}

function schema(db) {
  db.exec(`
    CREATE TABLE review_documents (
      id TEXT PRIMARY KEY, version INTEGER NOT NULL CHECK(typeof(version)='integer' AND version >= 0), content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE review_suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_id TEXT NOT NULL REFERENCES review_documents(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK(status IN ('pending','accepted','rejected','conflicted')),
      base_version INTEGER NOT NULL CHECK(typeof(base_version)='integer' AND base_version >= 0),
      from_pos INTEGER NOT NULL CHECK(typeof(from_pos)='integer' AND from_pos >= 0), to_pos INTEGER NOT NULL CHECK(typeof(to_pos)='integer' AND to_pos >= from_pos),
      expected TEXT NOT NULL, replacement TEXT NOT NULL,
      before_context TEXT NOT NULL, after_context TEXT NOT NULL,
      created_order INTEGER NOT NULL CHECK(typeof(created_order)='integer' AND created_order > 0), author TEXT NOT NULL DEFAULT 'Agent',
      created_at TEXT NOT NULL DEFAULT '', explanation TEXT NOT NULL DEFAULT '',
      UNIQUE(doc_id, created_order)
    );
    CREATE TABLE review_operations (id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, result TEXT NOT NULL);
    CREATE TABLE review_changes (
      doc_id TEXT NOT NULL REFERENCES review_documents(id) ON DELETE CASCADE,
      version INTEGER NOT NULL CHECK(typeof(version)='integer' AND version > 0), from_pos INTEGER NOT NULL CHECK(typeof(from_pos)='integer' AND from_pos >= 0),
      to_pos INTEGER NOT NULL CHECK(typeof(to_pos)='integer' AND to_pos >= from_pos), inserted_length INTEGER NOT NULL CHECK(typeof(inserted_length)='integer' AND inserted_length >= 0),
      suggestion_order INTEGER NOT NULL DEFAULT 0 CHECK(typeof(suggestion_order)='integer' AND suggestion_order >= 0), PRIMARY KEY(doc_id, version)
    );
    CREATE TABLE space_comments (
      id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES review_documents(id) ON DELETE CASCADE,
      quote TEXT NOT NULL CHECK(length(quote) > 0), body TEXT NOT NULL CHECK(length(body) > 0),
      from_pos INTEGER NOT NULL CHECK(typeof(from_pos)='integer' AND from_pos >= 0), to_pos INTEGER NOT NULL CHECK(typeof(to_pos)='integer' AND to_pos > from_pos),
      doc_version INTEGER NOT NULL CHECK(typeof(doc_version)='integer' AND doc_version >= 0),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed','unknown','processed')),
      request_id TEXT REFERENCES space_comment_sends(id) ON DELETE SET NULL,
      context_before TEXT NOT NULL DEFAULT '', context_after TEXT NOT NULL DEFAULT '', created_at TEXT,
      UNIQUE(id, doc_id)
    );
    CREATE TABLE space_comment_sends (
      id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, session_id TEXT NOT NULL,
      doc_id TEXT NOT NULL REFERENCES review_documents(id) ON DELETE CASCADE,
      payload TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('sending','sent','failed','unknown')), error TEXT
    );
    CREATE TABLE space_comment_completions (
      id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL,
      doc_id TEXT NOT NULL REFERENCES review_documents(id) ON DELETE CASCADE,
      result TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE space_comment_results (
      comment_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL,
      suggestion_ids TEXT NOT NULL, operation_id TEXT NOT NULL, updated_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'processed' CHECK(status IN ('pending','processed','needs_clarification')),
      reason TEXT,
      FOREIGN KEY(comment_id, doc_id) REFERENCES space_comments(id, doc_id) ON DELETE CASCADE,
      FOREIGN KEY(doc_id) REFERENCES review_documents(id) ON DELETE CASCADE
    );
    CREATE TABLE collaboration_instructions (
      scope TEXT PRIMARY KEY, content TEXT NOT NULL, version INTEGER NOT NULL CHECK(typeof(version)='integer' AND version >= 0), updated_at TEXT NOT NULL
    );
    CREATE TABLE collaboration_operations (id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, result TEXT NOT NULL);
    CREATE TABLE space_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE cospace_data_layout (id INTEGER PRIMARY KEY CHECK(id=1), version INTEGER NOT NULL);
    CREATE TABLE cospace_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE INDEX review_suggestions_doc_status_order_idx ON review_suggestions(doc_id, status, created_order);
    CREATE INDEX review_suggestions_doc_order_idx ON review_suggestions(doc_id, created_order);
    CREATE INDEX space_comments_doc_status_idx ON space_comments(doc_id, status);
    CREATE INDEX space_comment_sends_doc_status_idx ON space_comment_sends(doc_id, status);
    CREATE INDEX space_comment_completions_doc_idx ON space_comment_completions(doc_id);
    CREATE INDEX space_comment_results_doc_idx ON space_comment_results(doc_id);
    CREATE INDEX space_comments_request_id_idx ON space_comments(request_id);
  `);
}

function pick(row, key, fallback) {
  return row?.[key] === undefined || row[key] === null ? fallback : row[key];
}

function validateSuggestionIds(value, details) {
  let suggestionIds;
  try { suggestionIds = JSON.parse(value); }
  catch { fail('DATA_MIGRATION_INVALID', 'Comment suggestion IDs are not valid JSON', details); }
  if (!Array.isArray(suggestionIds) || suggestionIds.some(id => !Number.isSafeInteger(id) || id <= 0)) fail('DATA_MIGRATION_INVALID', 'Comment suggestion IDs are invalid', details);
}

function verifySource(db, sourceVersion, snapshot) {
  const documents = new Set(snapshot.review_documents.map(row => row.id));
  const comments = new Map(snapshot.space_comments.map(row => [row.id, row.doc_id]));
  const sends = new Set(snapshot.space_comment_sends.map(row => row.id));
  const checkDoc = (table, row) => {
    if (!documents.has(row.doc_id)) fail('DATA_MIGRATION_INVALID', `${table} row references a missing document`, { table, id: row.id ?? row.comment_id, docId: row.doc_id });
  };
  for (const row of snapshot.review_documents) if (typeof row.id !== 'string' || !Number.isSafeInteger(row.version) || row.version < 0 || typeof row.content !== 'string') fail('DATA_MIGRATION_INVALID', 'Invalid document row', { id: row.id });
  for (const row of snapshot.review_suggestions) {
    checkDoc('review_suggestions', row);
    if (!['pending', 'accepted', 'rejected', 'conflicted'].includes(row.status) || !Number.isSafeInteger(row.base_version) || row.base_version < 0 || !Number.isSafeInteger(row.from_pos) || row.from_pos < 0 || !Number.isSafeInteger(row.to_pos) || row.to_pos < row.from_pos || !Number.isSafeInteger(row.created_order) || row.created_order <= 0) fail('DATA_MIGRATION_INVALID', 'Invalid suggestion row', { id: row.id });
  }
  for (const row of snapshot.review_changes) {
    checkDoc('review_changes', row);
    const suggestionOrder = pick(row, 'suggestion_order', 0);
    if (!Number.isSafeInteger(row.version) || row.version <= 0 || !Number.isSafeInteger(row.from_pos) || row.from_pos < 0 || !Number.isSafeInteger(row.to_pos) || row.to_pos < row.from_pos || !Number.isSafeInteger(row.inserted_length) || row.inserted_length < 0 || !Number.isSafeInteger(suggestionOrder) || suggestionOrder < 0) fail('DATA_MIGRATION_INVALID', 'Invalid change mapping row', { docId: row.doc_id, version: row.version });
  }
  for (const row of snapshot.space_comments) {
    checkDoc('space_comments', row);
    if (!['pending', 'sending', 'sent', 'failed', 'unknown', 'processed'].includes(row.status) || !Number.isSafeInteger(row.from_pos) || row.from_pos < 0 || !Number.isSafeInteger(row.to_pos) || row.to_pos <= row.from_pos || !Number.isSafeInteger(row.doc_version) || row.doc_version < 0 || !row.quote || !row.body) fail('DATA_MIGRATION_INVALID', 'Invalid comment row', { id: row.id });
    if (row.request_id && !sends.has(row.request_id)) fail('DATA_MIGRATION_INVALID', 'Comment references a missing send operation', { id: row.id, requestId: row.request_id });
  }
  for (const name of ['space_comment_sends', 'space_comment_completions']) for (const row of snapshot[name]) checkDoc(name, row);
  for (const row of snapshot.space_comment_sends) if (!['sending', 'sent', 'failed', 'unknown'].includes(row.status)) fail('DATA_MIGRATION_INVALID', 'Invalid comment send status', { id: row.id, status: row.status });
  for (const row of snapshot.space_comment_results) {
    checkDoc('space_comment_results', row);
    if (comments.get(row.comment_id) !== row.doc_id) fail('DATA_MIGRATION_INVALID', 'Comment result references a missing or different comment', { commentId: row.comment_id, docId: row.doc_id });
    validateSuggestionIds(row.suggestion_ids, { commentId: row.comment_id });
    if (row.status !== undefined && !['pending', 'processed', 'needs_clarification'].includes(row.status)) fail('DATA_MIGRATION_INVALID', 'Invalid comment processing status', { commentId: row.comment_id, status: row.status });
  }
  for (const row of snapshot.collaboration_instructions) if (typeof row.scope !== 'string' || typeof row.content !== 'string' || !Number.isSafeInteger(row.version) || row.version < 0) fail('DATA_MIGRATION_INVALID', 'Invalid collaboration instruction row', { scope: row.scope });
  if (sourceVersion === 'markdown-text-v1') {
    for (const row of snapshot.review_suggestions) {
      row.author ??= 'Agent'; row.created_at ??= ''; row.explanation ??= '';
    }
    for (const row of snapshot.review_documents) { row.created_at ??= ''; row.updated_at ??= ''; }
    for (const row of snapshot.space_comments) { row.context_before ??= ''; row.context_after ??= ''; row.created_at ??= null; }
  }
  const uniqueOrders = new Set();
  for (const row of snapshot.review_suggestions) {
    const key = `${row.doc_id}\u0000${row.created_order}`;
    if (uniqueOrders.has(key)) fail('DATA_MIGRATION_INVALID', 'Duplicate suggestion order within a document', { docId: row.doc_id, order: row.created_order });
    uniqueOrders.add(key);
  }
}

function snapshotTables(db) {
  const snapshot = Object.fromEntries([...tables].map(name => [name, rows(db, name)]));
  snapshot.cospace_migrations = hasTable(db, 'cospace_migrations') ? rows(db, 'cospace_migrations') : [];
  if (hasTable(db, 'space_comment_processing')) snapshot.space_comment_processing = rows(db, 'space_comment_processing');
  return snapshot;
}

function migrateLegacyProcessing(snapshot) {
  for (const row of snapshot.space_comment_processing ?? []) {
    const comment = snapshot.space_comments.find(item => item.id === row.comment_id && item.doc_id === row.doc_id);
    if (!comment) fail('DATA_MIGRATION_INVALID', 'Legacy comment processing row has no matching comment', { commentId: row.comment_id, docId: row.doc_id });
    if (!['processed', 'needs_clarification'].includes(row.status)) fail('DATA_MIGRATION_INVALID', 'Unknown legacy comment processing status', { commentId: row.comment_id, status: row.status });
    validateSuggestionIds(row.suggestion_ids, { commentId: row.comment_id });
    const status = row.status === 'processed' ? 'processed' : row.status === 'needs_clarification' ? 'needs_clarification' : 'pending';
    if (status === 'processed') comment.status = 'processed';
    snapshot.space_comment_results.push({
      comment_id: row.comment_id, doc_id: row.doc_id, suggestion_ids: row.suggestion_ids,
      operation_id: row.operation_id, updated_at: row.updated_at,
      status, reason: row.reason ?? null,
    });
  }
}

function restoreRows(db, snapshot) {
  const insert = (table, columns, row) => db.prepare(`INSERT INTO "${table}" (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`).run(...columns.map(column => pick(row, column, null)));
  for (const row of snapshot.review_documents) insert('review_documents', ['id', 'version', 'content', 'created_at', 'updated_at'], { ...row, created_at: pick(row, 'created_at', ''), updated_at: pick(row, 'updated_at', '') });
  for (const row of snapshot.review_suggestions) insert('review_suggestions', ['id', 'doc_id', 'status', 'base_version', 'from_pos', 'to_pos', 'expected', 'replacement', 'before_context', 'after_context', 'created_order', 'author', 'created_at', 'explanation'], { ...row, author: pick(row, 'author', 'Agent'), created_at: pick(row, 'created_at', ''), explanation: pick(row, 'explanation', '') });
  for (const row of snapshot.review_operations) insert('review_operations', ['id', 'fingerprint', 'result'], row);
  for (const row of snapshot.review_changes) insert('review_changes', ['doc_id', 'version', 'from_pos', 'to_pos', 'inserted_length', 'suggestion_order'], { ...row, suggestion_order: pick(row, 'suggestion_order', 0) });
  for (const row of snapshot.space_comment_sends) insert('space_comment_sends', ['id', 'fingerprint', 'session_id', 'doc_id', 'payload', 'status', 'error'], row);
  for (const row of snapshot.space_comments) insert('space_comments', ['id', 'doc_id', 'quote', 'body', 'from_pos', 'to_pos', 'doc_version', 'status', 'request_id', 'context_before', 'context_after', 'created_at'], { ...row, request_id: pick(row, 'request_id', null), context_before: pick(row, 'context_before', ''), context_after: pick(row, 'context_after', ''), created_at: pick(row, 'created_at', null) });
  for (const row of snapshot.space_comment_completions) insert('space_comment_completions', ['id', 'fingerprint', 'doc_id', 'result', 'created_at'], row);
  for (const row of snapshot.space_comment_results) insert('space_comment_results', ['comment_id', 'doc_id', 'suggestion_ids', 'operation_id', 'updated_at', 'status', 'reason'], { ...row, status: pick(row, 'status', 'processed'), reason: pick(row, 'reason', null) });
  for (const row of snapshot.collaboration_instructions) insert('collaboration_instructions', ['scope', 'content', 'version', 'updated_at'], row);
  for (const row of snapshot.collaboration_operations) insert('collaboration_operations', ['id', 'fingerprint', 'result'], row);
  for (const row of snapshot.cospace_migrations ?? []) db.prepare('INSERT OR IGNORE INTO cospace_migrations(id) VALUES(?)').run(row.id);
}

function makePreMigrationBackup(db, databasePath) {
  if (!databasePath || databasePath === ':memory:' || !existsSync(databasePath)) return;
  const backupPath = `${databasePath}.pre-v3.bak`;
  if (existsSync(backupPath)) {
    const backup = new DatabaseSync(backupPath, { readOnly: true, timeout: 5000 });
    try {
      if (backup.prepare('PRAGMA integrity_check').get()?.integrity_check !== 'ok') fail('DATA_MIGRATION_INVALID', 'Existing pre-v3 backup failed integrity validation', { backupPath });
      const count = (connection, table) => hasTable(connection, table) ? connection.prepare(`SELECT count(*) AS n FROM "${table}"`).get().n : 0;
      const sourceCounts = ['review_documents', 'review_suggestions', 'space_comments'].map(table => count(db, table));
      const backupCounts = ['review_documents', 'review_suggestions', 'space_comments'].map(table => count(backup, table));
      if (sourceCounts.some((value, index) => value !== backupCounts[index])) fail('DATA_MIGRATION_INVALID', 'Existing pre-v3 backup row counts do not match the source database', { backupPath });
    } finally { backup.close(); }
    return;
  }
  const escaped = backupPath.replaceAll("'", "''");
  try { db.exec(`VACUUM INTO '${escaped}'`); }
  catch (error) { if (!existsSync(backupPath)) throw error; }
  const backup = new DatabaseSync(backupPath, { readOnly: true, timeout: 5000 });
  try {
    if (backup.prepare('PRAGMA integrity_check').get()?.integrity_check !== 'ok') fail('DATA_MIGRATION_INVALID', 'Pre-v3 backup failed integrity validation', { backupPath });
    const count = (connection, table) => hasTable(connection, table) ? connection.prepare(`SELECT count(*) AS n FROM "${table}"`).get().n : 0;
    const sourceCounts = ['review_documents', 'review_suggestions', 'space_comments'].map(table => count(db, table));
    const backupCounts = ['review_documents', 'review_suggestions', 'space_comments'].map(table => count(backup, table));
    if (sourceCounts.some((count, index) => count !== backupCounts[index])) fail('DATA_MIGRATION_INVALID', 'Pre-v3 backup row counts do not match the source database', { backupPath });
  } finally { backup.close(); }
}

function migrateReviewSchema(db, databasePath) {
  const hasDocuments = hasTable(db, 'review_documents');
  const hasMeta = hasTable(db, 'space_meta');
  const version = hasMeta ? db.prepare("SELECT value FROM space_meta WHERE key='schema'").get()?.value : null;
  const supported = ['markdown-text-v1', 'markdown-text-v2', REVIEW_SCHEMA];
  if ((hasDocuments || hasMeta) && !supported.includes(version)) {
    fail('UNSUPPORTED_SCHEMA', 'Unmarked or unsupported review database; original data was preserved', { schema: version ?? null });
  }
  const oldLayout = hasTable(db, 'cospace_data_layout') ? db.prepare('SELECT version FROM cospace_data_layout WHERE id=1').get()?.version : null;
  if (hasTable(db, 'cospace_data_layout') && (!Number.isInteger(oldLayout) || oldLayout < 1)) fail('DATA_LAYOUT_MISMATCH', 'Invalid CoSpace data layout marker');
  if (Number.isInteger(oldLayout) && oldLayout > DATA_LAYOUT) fail('DATA_LAYOUT_MISMATCH', 'CoSpace data was created by a newer runtime');
  if (version === REVIEW_SCHEMA && Number(oldLayout) === DATA_LAYOUT) return;
  if (version === 'markdown-text-v1' || version === 'markdown-text-v2') makePreMigrationBackup(db, databasePath);

  db.exec('BEGIN IMMEDIATE');
  try {
    const lockedVersion = hasTable(db, 'space_meta') ? db.prepare("SELECT value FROM space_meta WHERE key='schema'").get()?.value : null;
    const lockedLayout = hasTable(db, 'cospace_data_layout') ? db.prepare('SELECT version FROM cospace_data_layout WHERE id=1').get()?.version : null;
    if (lockedVersion === REVIEW_SCHEMA && Number(lockedLayout) === DATA_LAYOUT) {
      db.exec('COMMIT');
      return;
    }
    const sourceVersion = version ?? 'new';
    const snapshot = snapshotTables(db);
    if (version === 'markdown-text-v1' || version === 'markdown-text-v2') {
      verifySource(db, version, snapshot);
      migrateLegacyProcessing(snapshot);
    }
    for (const name of [...tables, 'space_meta', 'cospace_data_layout', 'cospace_migrations', 'space_comment_processing']) {
      if (hasTable(db, name)) db.exec(`DROP TABLE "${name}"`);
    }
    schema(db);
    restoreRows(db, snapshot);
    db.prepare("INSERT INTO space_meta(key,value) VALUES('schema',?)").run(REVIEW_SCHEMA);
    db.prepare('INSERT INTO cospace_data_layout(id,version) VALUES(1,?)').run(DATA_LAYOUT);
    db.prepare('INSERT OR IGNORE INTO cospace_migrations(id) VALUES(?)').run(MIGRATION_ID);
    db.exec('PRAGMA foreign_key_check');
    const fk = db.prepare('PRAGMA foreign_key_check').all();
    if (fk.length) fail('DATA_MIGRATION_INVALID', 'Foreign key validation failed after migration', { violations: fk.slice(0, 20) });
    const integrity = db.prepare('PRAGMA integrity_check').get()?.integrity_check;
    if (integrity !== 'ok') fail('DATA_MIGRATION_INVALID', 'SQLite integrity validation failed after migration', { result: integrity ?? null });
    db.exec('COMMIT');
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch {}
    throw error;
  }
}

function migrateLegacyCollaboration(home, db) {
  if (!home) return;
  const file = path.join(home, 'collaboration.sqlite');
  if (!existsSync(file) || db.prepare('SELECT 1 FROM cospace_migrations WHERE id=?').get(LEGACY_COLLABORATION_ID)) return;
  const legacy = new DatabaseSync(file, { readOnly: true, timeout: 5000 });
  try {
    const has = name => Boolean(legacy.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name));
    if (!has('collaboration_instructions') || !has('collaboration_operations')) fail('DATA_MIGRATION_INVALID', 'Legacy collaboration database has an unsupported schema');
    legacy.exec('BEGIN');
    db.exec('BEGIN IMMEDIATE');
    try {
      if (db.prepare('SELECT 1 FROM cospace_migrations WHERE id=?').get(LEGACY_COLLABORATION_ID)) {
        db.exec('COMMIT'); legacy.exec('COMMIT');
        return;
      }
      const instructions = legacy.prepare('SELECT scope,content,version,updated_at FROM collaboration_instructions').all();
      const operations = legacy.prepare('SELECT id,fingerprint,result FROM collaboration_operations').all();
      const putInstruction = db.prepare('INSERT OR IGNORE INTO collaboration_instructions(scope,content,version,updated_at) VALUES(?,?,?,?)');
      const putOperation = db.prepare('INSERT OR IGNORE INTO collaboration_operations(id,fingerprint,result) VALUES(?,?,?)');
      for (const row of instructions) putInstruction.run(row.scope, row.content, row.version, row.updated_at);
      for (const row of operations) putOperation.run(row.id, row.fingerprint, row.result);
      db.prepare('INSERT INTO cospace_migrations(id) VALUES(?)').run(LEGACY_COLLABORATION_ID);
      db.exec('COMMIT'); legacy.exec('COMMIT');
    } catch (error) {
      try { db.exec('ROLLBACK'); } catch {}
      try { legacy.exec('ROLLBACK'); } catch {}
      throw error;
    }
  } finally { legacy.close(); }
}

export function migrateDatabase(db, home, { journalMode = false, databasePath = null } = {}) {
  db.exec('PRAGMA foreign_keys=OFF; PRAGMA busy_timeout=5000; PRAGMA synchronous=FULL');
  if (journalMode) db.exec('PRAGMA journal_mode=WAL');
  migrateReviewSchema(db, databasePath);
  migrateLegacyCollaboration(home, db);
  db.exec('PRAGMA foreign_keys=ON');
}
