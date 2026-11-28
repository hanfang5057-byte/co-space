import { test } from 'node:test';
import assert from 'node:assert/strict';
import { outline, findMatches, page, readRange, requireVersion } from '../packages/transport-mcp/document-tools.js';

test('outline follows CommonMark headings and absolute CRLF offsets', () => {
  const text = '# Top\r\n```md\r\n# Not a heading\r\n```\r\nChild\r\n-----\r\nText\r\n# Next\r\n';
  const headings = outline(text);
  assert.deepEqual(headings.map(item => [item.title, item.level]), [['Top', 1], ['Child', 2], ['Next', 1]]);
  assert.equal(headings[1].from, text.indexOf('Child'));
  assert.equal(headings[0].to, text.indexOf('# Next'));
  assert.equal(headings[1].to, text.indexOf('# Next'));
  assert.deepEqual(outline('```\n# no\n```\n'), []);
});

test('literal search uses UTF-16 source offsets and safe emoji boundaries', () => {
  const text = '😀 A.b 😀 a.B';
  const matches = findMatches(text, 'a.b', false);
  assert.deepEqual(matches.map(item => item.from), [3, 10]);
  assert.deepEqual(matches.map(item => item.text), ['A.b', 'a.B']);
  assert.equal(findMatches('aXb', 'a.b', false).length, 0);
  assert.throws(() => readRange(text, 1, 2), { code: 'INVALID_RANGE' });
  assert.equal(readRange(text, 0, 2), '😀');
  assert.throws(() => requireVersion({ version: 2 }, 1), { code: 'VERSION_CONFLICT' });
});

test('pagination rejects changed snapshot and invalid cursors', () => {
  const first = page(['a', 'b'], { limit: 1 }, ['doc', 1, ['a', 'b']]);
  assert.deepEqual(first.items, ['a']);
  assert.deepEqual(page(['a', 'b'], { limit: 1, cursor: first.nextCursor }, ['doc', 1, ['a', 'b']]).items, ['b']);
  assert.throws(() => page(['a', 'c'], { cursor: first.nextCursor }, ['doc', 1, ['a', 'c']]), { code: 'INVALID_CURSOR' });
  assert.throws(() => page([], { cursor: 'invalid' }, ['doc']), { code: 'INVALID_CURSOR' });
});
