import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentIdFromUrl, documentUrlFor } from '../packages/review-ui/src/document-navigation.js';

test('Local Server document links encode IDs and preserve the service URL', () => {
  const href = 'http://127.0.0.1:43127/?keep=1';
  const id = '文档 / one?x=1';
  const url = documentUrlFor(href, id);
  assert.equal(url.origin, 'http://127.0.0.1:43127');
  assert.equal(url.searchParams.get('keep'), '1');
  assert.equal(url.searchParams.get('document'), id);
  assert.equal(documentIdFromUrl(url.toString()), id);
});

test('Local Server home navigation removes only the document locator', () => {
  const url = documentUrlFor('http://127.0.0.1:43127/?keep=1&document=old', null);
  assert.equal(url.searchParams.has('document'), false);
  assert.equal(url.searchParams.get('keep'), '1');
  assert.equal(documentIdFromUrl(url.toString()), null);
});

test('invalid URLs do not produce a document selection', () => {
  assert.equal(documentIdFromUrl('not a URL'), null);
});
