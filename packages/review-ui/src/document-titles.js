/**
 * Document-title caches scoped to one adapter API. A host may use a separate
 * local database with IDs that match another adapter, so titles never share a
 * cache across core API instances.
 */
import { useEffect, useSyncExternalStore } from 'react';

const caches = new WeakMap();
const emptyCache = createCache(null);

function createCache(request) {
  const titles = new Map();
  const listeners = new Set();
  let loading = null;
  const publish = () => { for (const listener of listeners) listener(); };
  return {
    titles,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    documentTitle(docId) { return titles.get(docId); },
    remember(docId, title) {
      if (typeof docId !== 'string' || typeof title !== 'string' || title === '' || titles.get(docId) === title) return;
      titles.set(docId, title);
      publish();
    },
    load() {
      if (loading !== null) return loading;
      if (typeof request !== 'function') return Promise.resolve();
      loading = request('listDocuments')
        .then(list => {
          for (const doc of list) {
            if (typeof doc?.id === 'string' && typeof doc.title === 'string' && doc.title !== '') titles.set(doc.id, doc.title);
          }
        })
        .catch(() => {
          // A missing list operation is non-fatal; callers still have the ID as a label.
        })
        .finally(() => { loading = null; publish(); });
      return loading;
    },
  };
}

function cacheFor(request) {
  if (typeof request !== 'function') return emptyCache;
  let cache = caches.get(request);
  if (!cache) { cache = createCache(request); caches.set(request, cache); }
  return cache;
}

export function documentTitle(docId, request) {
  return cacheFor(request).documentTitle(docId);
}

export function rememberDocumentTitle(docId, title, request) {
  cacheFor(request).remember(docId, title);
}

export function loadDocumentTitles(request) {
  return cacheFor(request).load();
}

export function useDocumentTitle(docId, request) {
  const cache = cacheFor(request);
  useEffect(() => {
    if (typeof docId === 'string' && docId !== '' && !cache.titles.has(docId)) void cache.load();
  }, [cache, docId]);
  return useSyncExternalStore(cache.subscribe, () => cache.documentTitle(docId) ?? null, () => null);
}
