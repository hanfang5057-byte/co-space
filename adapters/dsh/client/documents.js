/**
 * Pure helpers behind the document picker and the `@` reference menu.
 *
 * Kept out of the plugin entry so the filtering, candidate shape, reference
 * payload, and cache lifetime can be tested without React or a DSH page.
 */

/** Reference source id; must equal the registered input-trigger source name. */
export const REFERENCE_SOURCE = 'CoSpace';

const referenceFor = docId => `space:${encodeURIComponent(String(docId))}`;

const titleOf = doc => (typeof doc?.title === 'string' && doc.title.trim() !== '' ? doc.title.trim() : String(doc?.id ?? ''));

/**
 * Documents matching a live query, in host order.
 * @param {ReadonlyArray<object>} documents - rows from `listDocuments`.
 * @param {string} [query] - menu query typed after `@`.
 * @param {number} [limit] - maximum candidates.
 * @returns {Array<object>} matching documents.
 */
export function filterDocuments(documents, query = '', limit = 50) {
  const needle = String(query ?? '').trim().toLocaleLowerCase();
  const rows = [];
  for (const doc of documents ?? []) {
    if (!doc || typeof doc.id !== 'string' || doc.id === '') continue;
    const title = titleOf(doc);
    if (needle && !title.toLocaleLowerCase().includes(needle) && !doc.id.toLocaleLowerCase().includes(needle)) continue;
    rows.push(doc);
    if (rows.length >= limit) break;
  }
  return rows;
}

/**
 * The value the composer stores for one document reference.
 * @param {{id: string, title?: string}} doc - document row.
 * @returns {{source: string, ref: string, label: string, appearance: 'file', clipboardText: string}}
 */
export function referenceInsertFor(doc) {
  const reference = referenceFor(doc.id);
  return { source: REFERENCE_SOURCE, ref: reference, label: titleOf(doc), appearance: 'file', clipboardText: reference };
}

/**
 * One `@` menu candidate. `name` is the identity the menu searches and the
 * exact-match key; `value` carries the document id back through `onPick`.
 * @param {object} doc - document row.
 * @returns {object} input-trigger candidate.
 */
export function documentCandidate(doc) {
  return {
    name: doc.id,
    label: titleOf(doc),
    value: doc.id,
    icon: 'file',
    ...(Number.isFinite(doc.pending) && doc.pending > 0 ? { hint: String(doc.pending) } : {}),
  };
}

/**
 * Cache one `listDocuments` call for a short window so typing in the `@` menu
 * does not call the host on every keystroke. Concurrent callers share one
 * in-flight request.
 * @param {() => Promise<unknown>} load - performs the host call.
 * @param {{ttlMs?: number, now?: () => number}} [options] - lifetime controls.
 * @returns {{load: (options?: {signal?: AbortSignal}) => Promise<Array<object>>, peek: () => Array<object>, invalidate: () => void}}
 */
export function createDocumentCache(load, { ttlMs = 3_000, now = Date.now } = {}) {
  let fetchedAt = -Infinity;
  let value = [];
  let pending = null;
  return {
    async load() {
      if (now() - fetchedAt < ttlMs) return value;
      if (pending !== null) return pending;
      // Start the request in this tick so a caller that awaits immediately sees
      // the same in-flight promise the next caller joins.
      let started;
      try {
        started = load();
      } catch (error) {
        pending = null;
        throw error;
      }
      pending = Promise.resolve(started)
        .then(list => {
          value = Array.isArray(list) ? list : [];
          fetchedAt = now();
          return value;
        })
        .finally(() => { pending = null; });
      return pending;
    },
    peek() { return value; },
    invalidate() { fetchedAt = -Infinity; },
  };
}
