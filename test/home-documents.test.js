import test from 'node:test';
import assert from 'node:assert/strict';
import { sortHomeDocuments } from '../packages/review-ui/src/home-documents.js';

test('home documents sort by latest update first and keep missing dates last', () => {
  const documents = [
    { id: 'created', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'older', updatedAt: '2026-01-02T00:00:00.000Z' },
    { id: 'newer', updatedAt: '2026-01-03T00:00:00.000Z' },
    { id: 'undated' },
  ];

  assert.deepEqual(sortHomeDocuments(documents).map(item => item.id), ['newer', 'older', 'created', 'undated']);
  assert.deepEqual(documents.map(item => item.id), ['created', 'older', 'newer', 'undated']);
});

test('home title sorting remains numeric and stable', () => {
  const documents = [{ id: 'b', title: 'Document 10' }, { id: 'a', title: 'Document 2' }];
  assert.deepEqual(sortHomeDocuments(documents, 'title').map(item => item.id), ['a', 'b']);
});
