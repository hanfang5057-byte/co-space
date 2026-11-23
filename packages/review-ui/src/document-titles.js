/**
 * Document-title cache shared by the sent-message cards and the Sidebar tab chip.
 *
 * A reference token carries only the document id. Titles come from
 * `listDocuments` once per page load and are remembered after any document
 * read, so a card opened later renders the current title without another list
 * request. Failures stay silent: the card falls back to the id it already has.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { api } from './api.js';

/** @type {Map<string, string>} */
const titles = new Map();
/** @type {Set<() => void>} */
const listeners = new Set();
/** @type {Promise<void> | null} */
let loading = null;

function publish() {
  for (const listener of listeners) listener();
}

function subscribe(listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/**
 * Read a remembered title without subscribing.
 * @param {string} docId - document id.
 * @returns {string | undefined} the last known title.
 */
export function documentTitle(docId) {
  return titles.get(docId);
}

/**
 * Remember a title read through any API call.
 * @param {string} docId - document id.
 * @param {string} title - display title.
 */
export function rememberDocumentTitle(docId, title) {
  if (typeof docId !== 'string' || typeof title !== 'string' || title === '') return;
  if (titles.get(docId) === title) return;
  titles.set(docId, title);
  publish();
}

/** Load every title once per page load; concurrent callers share the request. */
export function loadDocumentTitles() {
  if (loading !== null) return loading;
  loading = api('listDocuments')
    .then(list => {
      for (const doc of list) {
        if (typeof doc?.id === 'string' && typeof doc.title === 'string' && doc.title !== '') titles.set(doc.id, doc.title);
      }
    })
    .catch(() => {
      // The first successful read or the next mount retries; a card still shows its id.
    })
    .finally(() => {
      loading = null;
      publish();
    });
  return loading;
}

/**
 * Subscribe to one document's cached title.
 * @param {string | null | undefined} docId - document id carried by a reference or tab.
 * @returns {string | null} the title once known.
 */
export function useDocumentTitle(docId) {
  useEffect(() => {
    if (typeof docId === 'string' && docId !== '' && !titles.has(docId)) void loadDocumentTitles();
  }, [docId]);
  return useSyncExternalStore(subscribe, () => titles.get(docId) ?? null, () => null);
}
