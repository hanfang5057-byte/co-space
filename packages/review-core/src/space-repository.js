import { ReviewStore } from './review-core.js';
import { CommentStore } from './comments.js';

const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };

/** Persistence boundary for document review data. All SQL stays behind this class. */
export class SpaceRepository {
  constructor(databaseFile) {
    this.store = new ReviewStore(databaseFile);
    this.comments = new CommentStore(this.store.db);
  }
  close() { this.comments.close(); this.store.close(); }
  createDocument(input) { return this.store.createDocument(input); }
  readDocument(id) { return this.store.readDocument(id); }
  propose(input) { return this.store.propose(input); }
  decide(input) { return this.store.decide(input); }
  updateContent(input) { return this.store.updateContent(input); }
  createComment(input) { return this.comments.create(input); }
  deleteComment(input) { return this.comments.delete(input); }
  listComments(docId) { return this.comments.list(docId); }
  completeCommentProcessing(input) { return this.comments.completeProcessing(input); }
  findSend(id) { return this.comments.findSend(id); }
  prepareSend(input) { return this.comments.prepareSend(input); }
  finishSend(input) { return this.comments.finishSend(input); }
  markInterruptedUnknown() { return this.comments.markInterruptedUnknown(); }
  listDocuments() {
    return this.store.db.prepare("SELECT id,content,version,created_at,updated_at,(SELECT COUNT(*) FROM review_suggestions s WHERE s.doc_id=d.id AND s.status IN ('pending','conflicted')) AS pending FROM review_documents d ORDER BY COALESCE(NULLIF(updated_at,''), NULLIF(created_at,'')) DESC, rowid DESC").all();
  }
  listSuggestions(id, status) {
    const doc = this.readDocument(id);
    const allowed = new Set(['all', 'pending', 'accepted', 'rejected', 'conflicted']);
    if (!allowed.has(status)) fail('INVALID_INPUT', 'Invalid suggestion status');
    const rows = this.store.db.prepare('SELECT id,status,base_version,from_pos,to_pos,expected,replacement,author,created_at,created_order FROM review_suggestions WHERE doc_id=? ORDER BY created_order').all(id);
    return { id, version: doc.version, suggestions: rows.filter(row => status === 'all' || row.status === status).map(row => ({ id: row.id, status: row.status, baseVersion: row.base_version, from: row.from_pos, to: row.to_pos, expected: row.expected, replacement: row.replacement, author: row.author, createdAt: row.created_at || null, order: row.created_order })) };
  }
  deleteDocument(id) {
    if (typeof id !== 'string' || !id) fail('INVALID_INPUT', 'Document ID is required');
    const db = this.store.db;
    db.exec('BEGIN IMMEDIATE');
    try {
      if (!db.prepare('SELECT id FROM review_documents WHERE id=?').get(id)) fail('DOCUMENT_NOT_FOUND', 'Document not found');
      if (db.prepare("SELECT id FROM space_comments WHERE doc_id=? AND status='sending' LIMIT 1").get(id)) fail('COMMENT_BUSY', 'A comment for this document is being sent');
      db.prepare('DELETE FROM space_comments WHERE doc_id=?').run(id);
      db.prepare('DELETE FROM space_comment_sends WHERE doc_id=?').run(id);
      db.prepare('DELETE FROM space_comment_results WHERE doc_id=?').run(id);
      db.prepare('DELETE FROM space_comment_completions WHERE doc_id=?').run(id);
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
}
