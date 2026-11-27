import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toolArgs, toolCardModel, toolResultPayload } from '../adapters/dsh/client/tool-view-model.js';

const textBlock = value => [{ type: 'text', text: JSON.stringify(value) }];

test('a document read card keeps the title, version and pending count', () => {
  const payload = {
    id: 'doc-1',
    title: ' 周报 ',
    version: 7,
    suggestions: [{ status: 'pending' }, { status: 'accepted' }, { status: 'conflicted' }],
    comments: [{}, {}],
  };
  const model = toolCardModel('mcp__space__space_document_read', { argsRaw: '{"docId":"doc-1"}', content: textBlock(payload) });
  assert.deepEqual(model, {
    kind: 'document', titleKey: 'tool.read.title', docId: 'doc-1', title: '周报', version: 7, pending: 2, comments: 2,
  });
});

test('a suggestion card renders the call arguments as a diff', () => {
  const model = toolCardModel('mcp__space__space_suggest', {
    argsRaw: JSON.stringify({ docId: 'doc-1', expected: 'old', replacement: 'new' }),
    content: textBlock({ id: 'sug-1' }),
  });
  assert.deepEqual(model, {
    kind: 'suggestion', titleKey: 'tool.suggest.title', docId: 'doc-1', expected: 'old', replacement: 'new', suggestionId: 'sug-1',
  });
});

test('a suggestion list card counts only open suggestions', () => {
  const model = toolCardModel('mcp__space__space_suggestion_list', {
    argsRaw: '{"docId":"doc-1"}',
    content: textBlock({ suggestions: [{ status: 'pending' }, { status: 'rejected' }] }),
  });
  assert.equal(model.pending, 1);
  assert.equal(model.total, 2);
});

test('unreadable data falls back without throwing', () => {
  assert.equal(toolArgs('{'), null);
  assert.deepEqual(toolArgs('[]'), null);
  assert.equal(toolResultPayload([{ type: 'text', text: 'not json' }]), null);
  assert.equal(toolResultPayload(null), null);
  assert.equal(toolCardModel('other_tool', {}), null);
  // A partial argument stream still renders the title-only card.
  const model = toolCardModel('mcp__space__space_document_read', { argsRaw: '{"doc' });
  assert.equal(model.titleKey, 'tool.read.title');
  assert.equal(model.docId, null);
});

test('a failed call shows a failure title instead of document fields', () => {
  const model = toolCardModel('mcp__space__space_document_read', { argsRaw: '{}', isError: true });
  assert.deepEqual(model, { kind: 'document', titleKey: 'tool.read.failed', failed: true });
});
