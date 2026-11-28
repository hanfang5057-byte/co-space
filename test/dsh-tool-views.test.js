import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardMeta, toolArgs, toolCardModel, toolResultPayload } from '../adapters/dsh/client/tool-view-model.js';

const textBlock = value => [{ type: 'text', text: JSON.stringify(value) }];

test('a document read card keeps the title, version and pending count', () => {
  const payload = {
    id: 'doc-1',
    title: ' 周报 ',
    version: 7,
    suggestions: [{ status: 'pending' }, { status: 'accepted' }, { status: 'conflicted' }],
    comments: [{}, {}],
  };
  const model = toolCardModel('space_document_read', { argsRaw: '{"docId":"doc-1"}', content: textBlock(payload) });
  assert.deepEqual(model, {
    kind: 'document', titleKey: 'tool.read.title', docId: 'doc-1', title: '周报', version: 7, pending: 2, comments: 2,
  });
});

test('a suggestion card renders the call arguments as a diff', () => {
  const model = toolCardModel('space_suggest', {
    argsRaw: JSON.stringify({ docId: 'doc-1', expected: 'old', replacement: 'new' }),
    content: textBlock({ id: 'sug-1' }),
  });
  assert.deepEqual(model, {
    kind: 'suggestion', titleKey: 'tool.suggest.title', docId: 'doc-1', expected: 'old', replacement: 'new', suggestionId: 'sug-1',
  });
});

test('a suggestion list card counts only open suggestions and keeps the version', () => {
  const model = toolCardModel('space_suggestion_list', {
    argsRaw: '{"docId":"doc-1"}',
    content: textBlock({ id: 'doc-1', version: 4, suggestions: [{ status: 'pending' }, { status: 'rejected' }] }),
  });
  assert.equal(model.version, 4);
  assert.equal(model.pending, 1);
  assert.equal(model.total, 2);
});

test('a card without a numeric version reports null so the row hides it', () => {
  const model = toolCardModel('space_suggestion_list', {
    argsRaw: '{"docId":"doc-1"}',
    content: textBlock({ suggestions: [] }),
  });
  assert.equal(model.version, null);
  assert.notEqual(model.version, undefined);
});

test('unreadable data falls back without throwing', () => {
  assert.equal(toolArgs('{'), null);
  assert.deepEqual(toolArgs('[]'), null);
  assert.equal(toolResultPayload([{ type: 'text', text: 'not json' }]), null);
  assert.equal(toolResultPayload(null), null);
  assert.equal(toolCardModel('other_tool', {}), null);
  // A partial argument stream still renders the title-only card.
  const model = toolCardModel('space_document_read', { argsRaw: '{"doc' });
  assert.equal(model.titleKey, 'tool.read.title');
  assert.equal(model.docId, null);
});

test('a failed call shows a failure title instead of document fields', () => {
  const model = toolCardModel('space_document_read', { argsRaw: '{}', isError: true });
  assert.deepEqual(model, { kind: 'document', titleKey: 'tool.read.failed', failed: true });
});

test('meta chips never fill a placeholder with an undefined value', () => {
  const payloads = [
    ['space_document_read', { argsRaw: '{"docId":"doc-1"}', content: textBlock({ id: 'doc-1', title: 'T', version: 6, suggestions: [{ status: 'pending' }], comments: [{}, {}] }) }],
    ['space_suggestion_list', { argsRaw: '{"docId":"doc-1"}', content: textBlock({ id: 'doc-1', version: 6, suggestions: [{ status: 'accepted' }] }) }],
    // A kind that carries no numeric field at all must not invent one.
    ['space_suggest', { argsRaw: '{"docId":"doc-1","expected":"a","replacement":"b"}', content: textBlock({ id: 'sug-1' }) }],
    // An unreadable result leaves every count unknown.
    ['space_document_read', { argsRaw: '{', content: [] }],
    ['space_document_read', { argsRaw: '{}', isError: true }],
  ];
  for (const [tool, data] of payloads) {
    const model = toolCardModel(tool, data);
    for (const { key, vars } of cardMeta(model)) {
      for (const value of Object.values(vars)) {
        assert.equal(typeof value, 'number', `${tool} ${key} must carry a number`);
        assert.ok(Number.isFinite(value), `${tool} ${key} must be finite`);
        // A `{placeholder}` template stringifies its argument, so any value that
        // reaches it becomes literal text in the card.
        assert.notEqual(String(value), 'undefined', `${tool} ${key}`);
      }
    }
  }
});

test('a card with nothing to report renders no meta row', () => {
  const model = toolCardModel('space_suggest', {
    argsRaw: '{"docId":"doc-1","expected":"a","replacement":"b"}',
    content: textBlock({ id: 'sug-1' }),
  });
  assert.deepEqual(cardMeta(model), []);
});

test('a failed card never renders meta chips', () => {
  const model = toolCardModel('space_document_read', { argsRaw: '{}', isError: true });
  assert.deepEqual(cardMeta(model), []);
});
