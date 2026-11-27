/**
 * Insert picked documents into one Session's composer.
 *
 * The picker reports a result instead of throwing so the dialog can stay open
 * and explain a closed Session or a composer that is currently read-only.
 */
import { referenceInsertFor } from './documents.js';

/**
 * Insertion is deliberately silent: the appended chips are the confirmation,
 * so the composer shows no transient notice of its own.
 * @param {object} options - host access and side effects.
 * @param {(name: string) => any} options.service - lazily reads a DSH client service.
 * @param {() => void} [options.invalidate] - drops the document cache after a successful insert.
 * @returns {(sessionId: string, documents: Array<object>) => {ok: boolean, reason?: 'closed'|'failed'}} inserter.
 */
export function createDocumentInserter({ service, invalidate } = {}) {
  return (sessionId, chosen) => {
    const binding = service?.('sessions')?.binding?.(sessionId);
    if (!binding) return { ok: false, reason: 'closed' };
    const rows = (chosen ?? []).filter(doc => doc && typeof doc.id === 'string' && doc.id !== '');
    if (rows.length === 0) return { ok: false, reason: 'failed' };
    const input = service?.('conversation')?.input?.for(binding.ctx);
    if (!input) return { ok: false, reason: 'failed' };
    try {
      if (typeof input.canInsertReferences === 'function' && input.canInsertReferences() !== true) {
        return { ok: false, reason: 'failed' };
      }
      if (typeof input.addReferences !== 'function' || input.addReferences(rows.map(referenceInsertFor)) !== true) {
        return { ok: false, reason: 'failed' };
      }
    } catch {
      return { ok: false, reason: 'failed' };
    }
    invalidate?.();
    return { ok: true };
  };
}
