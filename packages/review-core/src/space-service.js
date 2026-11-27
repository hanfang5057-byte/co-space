import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { SpaceRepository } from './space-repository.js';

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
  return `# ${text}\n\n\n`;
}

export class SpaceService {
  constructor(home) {
    if (typeof home !== 'string' || !home) throw new Error('Space home is required');
    this.home = path.resolve(home);
    mkdirSync(this.home, { recursive: true, mode: 0o700 });
    const databaseFile = path.join(this.home, 'review.sqlite');
    this.repository = new SpaceRepository(databaseFile);
  }
  close() { this.repository.close(); }
  listSpaces() { return [{ id: SPACE_ID, name: 'Space' }]; }
  listDocuments() {
    return this.repository.listDocuments().map(row => ({ id: row.id, title: titleFor(row.content, row.id), version: row.version, pending: row.pending, createdAt: row.created_at || null, updatedAt: row.updated_at || null }));
  }
  createDocument({ id, content, operationId }) {
    const created = this.repository.createDocument({ id, content, operationId });
    return { ...created, title: titleFor(created.content, id) };
  }
  readDocument(id) {
    const doc = this.repository.readDocument(id);
    return { ...doc, title: titleFor(doc.content, id), comments: this.repository.listComments(id) };
  }
  /**
   * Read the complete suggestion history, including decisions the UI already
   * applied. `readDocument` intentionally returns pending/conflicted records
   * only; an Agent needs the decided rows to know whether a proposal was
   * accepted or rejected.
   */
  listSuggestions(id, status = 'all') {
    return this.repository.listSuggestions(id, status);
  }
  deleteDocument(id) {
    return this.repository.deleteDocument(id);
  }
  propose(input) { return this.repository.propose(input); }
  decide(input) { return this.repository.decide(input); }
  updateContent(input) { return this.repository.updateContent(input); }
  createComment(input) { return this.repository.createComment(input); }
  deleteComment(input) { return this.repository.deleteComment(input); }
  listComments(docId) { return this.repository.listComments(docId); }
  completeCommentProcessing(input) { return this.repository.completeCommentProcessing(input); }
  linkCommentSuggestion(input) { return this.repository.linkCommentSuggestion(input); }
  findSend(id) { return this.repository.findSend(id); }
  prepareSend(input) { return this.repository.prepareSend(input); }
  finishSend(input) { return this.repository.finishSend(input); }
  markInterruptedUnknown() { return this.repository.markInterruptedUnknown(); }
}
