import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
const MAX_INSTRUCTIONS = 12000;

/** User-owned global and document-level style preferences. */
export class CollaborationStore {
  constructor(home) {
    mkdirSync(home, { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path.join(home, 'review.sqlite'), { timeout: 5000 });
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS collaboration_instructions (
        scope TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        version INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS collaboration_operations (
        id TEXT PRIMARY KEY,
        fingerprint TEXT NOT NULL,
        result TEXT NOT NULL
      );
    `);
  }

  close() {
    this.db.close();
  }

  readInstructions(docId) {
    const global = this.db.prepare("SELECT content,version,updated_at FROM collaboration_instructions WHERE scope='global'").get();
    const local = this.db.prepare('SELECT content,version,updated_at FROM collaboration_instructions WHERE scope=?').get(`doc:${docId}`);
    return {
      global: global ? { content: global.content, version: global.version, updatedAt: global.updated_at } : null,
      document: local ? { content: local.content, version: local.version, updatedAt: local.updated_at } : null,
    };
  }

  saveInstructions({ scope = 'global', docId, content, baseVersion, operationId }) {
    if (!['global', 'document'].includes(scope) || (scope === 'document' && (!docId || typeof docId !== 'string'))) fail('INVALID_INPUT', 'Invalid instruction scope');
    if (typeof content !== 'string' || content.length > MAX_INSTRUCTIONS) fail('INVALID_INPUT', `Instructions must be text under ${MAX_INSTRUCTIONS} characters`);
    if (!Number.isInteger(baseVersion) || baseVersion < 0) fail('INVALID_INPUT', 'Instruction version required');
    if (typeof operationId !== 'string' || !operationId) fail('INVALID_INPUT', 'Operation ID required');
    const key = scope === 'global' ? 'global' : `doc:${docId}`;
    const fingerprint = createHash('sha256').update(JSON.stringify({ key, content, baseVersion })).digest('hex');
    const next = content.trim();
    const updatedAt = new Date().toISOString();
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const replay = this.db.prepare('SELECT fingerprint,result FROM collaboration_operations WHERE id=?').get(operationId);
      if (replay) {
        if (replay.fingerprint !== fingerprint) fail('OPERATION_ID_CONFLICT', 'Operation ID reused with different input');
        this.db.exec('COMMIT');
        return JSON.parse(replay.result);
      }
      const row = this.db.prepare('SELECT version FROM collaboration_instructions WHERE scope=?').get(key);
      const version = row?.version ?? 0;
      if (version !== baseVersion) fail('VERSION_CONFLICT', 'Instructions changed; reload before saving');
      this.db.prepare(`
        INSERT INTO collaboration_instructions(scope,content,version,updated_at) VALUES(?,?,?,?)
        ON CONFLICT(scope) DO UPDATE SET content=excluded.content,version=excluded.version,updated_at=excluded.updated_at
      `).run(key, next, version + 1, updatedAt);
      const result = { scope, ...(scope === 'document' ? { docId } : {}), content: next, version: version + 1, updatedAt };
      this.db.prepare('INSERT INTO collaboration_operations(id,fingerprint,result) VALUES(?,?,?)').run(operationId, fingerprint, JSON.stringify(result));
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      try { this.db.exec('ROLLBACK'); } catch {}
      throw error;
    }
  }

  deleteDocument(docId) {
    this.db.prepare('DELETE FROM collaboration_instructions WHERE scope=?').run(`doc:${docId}`);
  }
}
