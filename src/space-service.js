import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { ReviewStore } from './review-core.js';

export const SPACE_ID = 'personal';

function titleFor(content, id) {
  const heading = content.match(/^#{1,6}\s+(.+)$/m)?.[1];
  return (heading || content.trim().split(/\r?\n/)[0] || id).replace(/[*_`~\[\]#>]/g, '').slice(0, 100);
}

export function documentFromMarkdown(text) {
  if (typeof text !== 'string') throw Object.assign(new Error('text must be a string'), { code: 'INVALID_INPUT' });
  return text;
}

// A new human-created document carries its title as the leading heading; the
// body stays empty and later changes still go through suggestions.
export function documentWithTitle(title) {
  if (typeof title !== 'string' || !title.trim()) throw Object.assign(new Error('title must be a non-empty string'), { code: 'INVALID_INPUT' });
  const text = title.trim().slice(0, 100);
  return `# ${text}\n\n`;
}

export class SpaceService {
  constructor(home) {
    if (typeof home !== 'string' || !home) throw new Error('Space home is required');
    this.home = path.resolve(home);
    mkdirSync(this.home, { recursive: true, mode: 0o700 });
    this.store = new ReviewStore(path.join(this.home, 'review.sqlite'));
  }
  close() { this.store.close(); }
  listSpaces() { return [{ id: SPACE_ID, name: 'Space' }]; }
  listDocuments() {
    return this.store.db.prepare("SELECT id FROM review_documents ORDER BY COALESCE(NULLIF(updated_at,''), NULLIF(created_at,'')) DESC, rowid DESC").all().map(({ id }) => {
      const doc = this.store.readDocument(id);
      return { id, title: titleFor(doc.content, id), version: doc.version, pending: doc.suggestions.length, createdAt: doc.createdAt, updatedAt: doc.updatedAt };
    });
  }
  createDocument({ id, content, operationId }) {
    const created = this.store.createDocument({ id, content, operationId });
    return { ...created, title: titleFor(created.content, id) };
  }
  readDocument(id) {
    const doc = this.store.readDocument(id);
    return { ...doc, title: titleFor(doc.content, id) };
  }
  /**
   * Read the complete suggestion history, including decisions the UI already
   * applied. `readDocument` intentionally returns pending/conflicted records
   * only; an Agent needs the decided rows to know whether a proposal was
   * accepted or rejected.
   */
  listSuggestions(id, status = 'all') {
    const doc = this.store.readDocument(id);
    const allowed = new Set(['all', 'pending', 'accepted', 'rejected', 'conflicted']);
    if (!allowed.has(status)) throw Object.assign(new Error('Invalid suggestion status'), { code: 'INVALID_INPUT' });
    const rows = this.store.db.prepare('SELECT id,status,base_version,from_pos,to_pos,expected,replacement,author,created_at,created_order FROM review_suggestions WHERE doc_id=? ORDER BY created_order').all(id);
    return {
      id,
      version: doc.version,
      suggestions: rows
        .filter(row => status === 'all' || row.status === status)
        .map(row => ({
          id: row.id,
          status: row.status,
          baseVersion: row.base_version,
          from: row.from_pos,
          to: row.to_pos,
          expected: row.expected,
          replacement: row.replacement,
          author: row.author,
          createdAt: row.created_at || null,
          order: row.created_order,
        })),
    };
  }
  deleteDocument(id) {
    if (typeof id !== 'string' || !id) throw Object.assign(new Error('Document ID is required'), { code: 'INVALID_INPUT' });
    const db = this.store.db;
    db.exec('BEGIN IMMEDIATE');
    try {
      if (!db.prepare('SELECT id FROM review_documents WHERE id=?').get(id)) {
        throw Object.assign(new Error('Document not found'), { code: 'DOCUMENT_NOT_FOUND' });
      }
      db.prepare('DELETE FROM review_suggestions WHERE doc_id=?').run(id);
      db.prepare('DELETE FROM review_changes WHERE doc_id=?').run(id);
      for (const operation of db.prepare('SELECT id,result FROM review_operations').all()) {
        try {
          const result = JSON.parse(operation.result);
          if (result?.id === id && typeof result.content === 'string') db.prepare('DELETE FROM review_operations WHERE id=?').run(operation.id);
        } catch {}
      }
      db.prepare('DELETE FROM review_documents WHERE id=?').run(id);
      db.exec('COMMIT');
      return { id, deleted: true };
    } catch (error) {
      try { db.exec('ROLLBACK'); } catch {}
      throw error;
    }
  }
  propose(input) { return this.store.propose(input); }
  decide(input) { return this.store.decide(input); }
}
