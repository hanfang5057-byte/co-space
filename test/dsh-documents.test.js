import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createDocumentCache,
  documentCandidate,
  filterDocuments,
  referenceInsertFor,
} from '../adapters/dsh/client/documents.js';
import { createDocumentPicker } from '../adapters/dsh/client/picker-store.js';
import { createDocumentInserter } from '../adapters/dsh/client/insert-documents.js';

const documents = [
  { id: 'doc-a', title: '季度复盘', pending: 3 },
  { id: 'doc-b', title: 'Architecture notes', pending: 0 },
  { id: 'doc-c', title: '' },
];

test('the @ menu lists every document and narrows by title or id', () => {
  assert.deepEqual(filterDocuments(documents).map(doc => doc.id), ['doc-a', 'doc-b', 'doc-c']);
  assert.deepEqual(filterDocuments(documents, '复盘').map(doc => doc.id), ['doc-a']);
  assert.deepEqual(filterDocuments(documents, 'ARCH').map(doc => doc.id), ['doc-b']);
  assert.deepEqual(filterDocuments(documents, 'doc-c').map(doc => doc.id), ['doc-c']);
  assert.deepEqual(filterDocuments(documents, 'missing'), []);
  assert.deepEqual(filterDocuments(documents, '  ').map(doc => doc.id), ['doc-a', 'doc-b', 'doc-c']);
});

test('the @ menu skips malformed rows and caps the candidate count', () => {
  const rows = [...documents, { title: 'no id' }, null, { id: '' }];
  assert.deepEqual(filterDocuments(rows).map(doc => doc.id), ['doc-a', 'doc-b', 'doc-c']);
  assert.equal(filterDocuments(documents, '', 2).length, 2);
});

test('a picked document becomes the reference the composer stores', () => {
  assert.deepEqual(referenceInsertFor({ id: 'doc-a', title: '季度复盘' }), {
    source: 'CoSpace',
    ref: 'space:doc-a',
    label: '季度复盘',
    appearance: 'file',
    clipboardText: 'space:doc-a',
  });
  assert.equal(referenceInsertFor({ id: 'a b&c' }).ref, 'space:a%20b%26c');
  assert.equal(referenceInsertFor({ id: 'doc-c', title: '' }).label, 'doc-c');
});

test('a candidate carries identity, title, and a pending hint only when pending', () => {
  assert.deepEqual(documentCandidate({ id: 'doc-a', title: '季度复盘', pending: 3 }), {
    name: 'doc-a',
    label: '季度复盘',
    value: 'doc-a',
    icon: 'file',
    hint: '3',
  });
  assert.deepEqual(documentCandidate({ id: 'doc-b', title: 'Architecture notes', pending: 0 }), {
    name: 'doc-b',
    label: 'Architecture notes',
    value: 'doc-b',
    icon: 'file',
  });
  assert.equal(documentCandidate({ id: 'doc-c', title: '' }).label, 'doc-c');
});

test('the document cache reuses one request inside its window and shares in-flight work', async () => {
  let clock = 0;
  let calls = 0;
  let release;
  let gateOpen = false;
  const gate = new Promise(resolve => { release = resolve; });
  const cache = createDocumentCache(async () => {
    calls += 1;
    if (calls === 1) return documents;
    if (!gateOpen) { await gate; gateOpen = true; }
    return [{ id: 'doc-new', title: 'new' }];
  }, { ttlMs: 1_000, now: () => clock });

  assert.deepEqual((await cache.load()).map(doc => doc.id), ['doc-a', 'doc-b', 'doc-c']);
  assert.equal(calls, 1);

  // Inside the lifetime: no second call.
  clock = 500;
  assert.deepEqual((await cache.load()).map(doc => doc.id), ['doc-a', 'doc-b', 'doc-c']);
  assert.equal(calls, 1);

  // Expired: one in-flight request is shared by both callers.
  clock = 1_500;
  const first = cache.load();
  const second = cache.load();
  release();
  assert.deepEqual((await first).map(doc => doc.id), ['doc-new']);
  assert.deepEqual((await second).map(doc => doc.id), ['doc-new']);
  assert.equal(calls, 2);

  // Explicit invalidation forces the next read.
  cache.invalidate();
  clock = 2_000;
  await cache.load();
  assert.equal(calls, 3);
  assert.deepEqual(cache.peek().map(doc => doc.id), ['doc-new']);
});

test('the cache normalizes a failed or malformed listing to an empty array', async () => {
  const cache = createDocumentCache(async () => ({ not: 'a list' }), { ttlMs: 0 });
  assert.deepEqual(await cache.load(), []);
});

test('the picker store opens one Session at a time and notifies subscribers', () => {
  const picker = createDocumentPicker();
  let notifications = 0;
  const unsubscribe = picker.subscribe(() => { notifications += 1; });

  assert.deepEqual(picker.getSnapshot(), { open: false, sessionId: null });
  picker.open('session-1');
  assert.deepEqual(picker.getSnapshot(), { open: true, sessionId: 'session-1' });
  picker.open('');
  assert.deepEqual(picker.getSnapshot(), { open: true, sessionId: 'session-1' });
  picker.close();
  assert.deepEqual(picker.getSnapshot(), { open: false, sessionId: null });
  assert.equal(notifications, 2);

  unsubscribe();
  picker.open('session-2');
  assert.equal(notifications, 2);
});

test('the inserter adds references and reports closed or read-only composers', () => {
  const inserted = [];
  const notices = [];
  const input = {
    canInsertReferences: () => true,
    addReferences: references => { inserted.push(references); return true; },
    notify: (level, text) => { notices.push({ level, text }); },
  };
  const service = name => name === 'sessions'
    ? { binding: () => ({ ctx: {} }) }
    : name === 'conversation' ? { input: { for: () => input } } : undefined;
  let invalidated = false;
  const insert = createDocumentInserter({ service, invalidate: () => { invalidated = true; } });

  assert.deepEqual(insert('session-1', [{ id: 'doc-a', title: 'A' }, { id: '' }, { id: 'doc-b' }]), { ok: true });
  assert.deepEqual(inserted[0].map(reference => reference.ref), ['space:doc-a', 'space:doc-b']);
  assert.deepEqual(inserted[0][0], { source: 'CoSpace', ref: 'space:doc-a', label: 'A', appearance: 'file', clipboardText: 'space:doc-a' });
  assert.equal(invalidated, true);
  // The appended chips are the confirmation; the composer stays silent.
  assert.deepEqual(notices, []);

  const closed = createDocumentInserter({ service: name => name === 'sessions' ? { binding: () => undefined } : undefined });
  assert.deepEqual(closed('session-1', [{ id: 'doc-a' }]), { ok: false, reason: 'closed' });

  const readOnly = createDocumentInserter({
    service: name => name === 'sessions'
      ? { binding: () => ({ ctx: {} }) }
      : { input: { for: () => ({ canInsertReferences: () => false, addReferences: () => true }) } },
  });
  assert.deepEqual(readOnly('session-1', [{ id: 'doc-a' }]), { ok: false, reason: 'failed' });

  const refusing = createDocumentInserter({
    service: name => name === 'sessions'
      ? { binding: () => ({ ctx: {} }) }
      : { input: { for: () => ({ addReferences: () => false }) } },
  });
  assert.deepEqual(refusing('session-1', [{ id: 'doc-a' }]), { ok: false, reason: 'failed' });

  const throwing = createDocumentInserter({
    service: name => name === 'sessions'
      ? { binding: () => ({ ctx: {} }) }
      : { input: { for: () => ({ addReferences: () => { throw new Error('editor disposed'); } }) } },
  });
  assert.deepEqual(throwing('session-1', [{ id: 'doc-a' }]), { ok: false, reason: 'failed' });
  assert.deepEqual(insert('session-1', []), { ok: false, reason: 'failed' });
});
