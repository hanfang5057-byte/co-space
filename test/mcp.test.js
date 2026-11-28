import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SpaceService } from '../packages/review-core/src/space-service.js';
import { createMcpServer } from '../packages/transport-mcp/server.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

const payload = result => {
  const block = result?.content?.find(item => item.type === 'text');
  assert.ok(block, 'MCP result has a text block');
  return JSON.parse(block.text);
};

const call = async (client, name, args = {}) => {
  const result = await client.callTool({ name, arguments: args });
  const body = payload(result);
  assert.equal(result.isError, undefined, `${name}: ${JSON.stringify(body)}`);
  return body;
};

test('MCP tools await asynchronous Local Server services', async () => {
  const documents = new Map();
  const service = {
    async createDocument({ id, content }) { const document = { id, content, version: 0, title: 'Async', comments: [] }; documents.set(id, document); return document; },
    async readDocument(id) { return documents.get(id); },
    async propose(input) { return { suggestion: input }; },
    async listSuggestions(id) { return { id, suggestions: [{ id: 1, status: 'pending' }] }; },
    async completeCommentProcessing(input) { return { results: input.results, replay: false }; },
  };
  const server = createMcpServer(service, null, {
    reviewUrl: 'http://127.0.0.1:43127/',
    documentLinkFor: id => `dsh-resource://space/${encodeURIComponent(id)}`,
  });
  const client = new Client({ name: 'async-test', version: '1.0.0' });
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  try {
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    const created = await call(client, 'space_document_create', { text: '# Async', operationId: 'async-create' });
    assert.match(created.id, /^doc-[a-f0-9]{24}$/);
    assert.equal(created.reference, `space:${created.id}`);
    assert.equal(new URL(created.reviewUrl).searchParams.get('document'), created.id);
    assert.equal(created.documentLink, `dsh-resource://space/${encodeURIComponent(created.id)}`);
    const read = await call(client, 'space_document_read', { id: created.reference });
    assert.equal(read.content, '# Async');
    assert.equal(read.reviewUrl, created.reviewUrl);
    assert.equal(read.documentLink, created.documentLink);
    assert.equal((await call(client, 'space_suggestion_list', { docId: created.reference })).reference, created.reference);
    const proposed = await call(client, 'space_suggest', { docId: created.reference, baseVersion: 0, from: 0, to: 0, expected: '', replacement: 'x', operationId: 'async-suggest' });
    assert.equal(proposed.suggestion.replacement, 'x');
    assert.equal(proposed.reviewUrl, created.reviewUrl);
    assert.equal(proposed.documentLink, created.documentLink);
    assert.equal((await call(client, 'space_comment_complete', { docId: created.reference, operationId: 'async-comment', results: [{ commentId: 'c1', suggestionIds: [] }] })).replay, false);
  } finally {
    await client.close().catch(() => {});
    await server.close().catch(() => {});
  }
});

test('the Space MCP server scopes tools to named documents and processes comments', async () => {
  const home = mkdtempSync(path.join(tmpdir(), 'space-mcp-'));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('../test/fixtures/mcp-stdio-entry.js', import.meta.url))],
    env: { ...process.env, DSH_SPACE_HOME: home },
  });
  const client = new Client({ name: 'space-test', version: '1.0.0' });
  try {
    await client.connect(transport);

    const tools = await client.listTools();
    const names = tools.tools.map(tool => tool.name);
    for (const name of ['space_document_create', 'space_document_read', 'space_suggest', 'space_suggestion_list', 'space_comment_complete']) {
      assert.ok(names.includes(name), `missing ${name}`);
    }
    assert.equal(names.includes('space_list'), false);
    assert.equal(names.includes('space_documents'), false);

    const created = await call(client, 'space_document_create', {
      text: '# Agent document\n\nHello world',
      operationId: 'agent-create-1',
    });
    assert.match(created.id, /^doc-[a-f0-9]{24}$/);
    assert.equal(created.reference, `space:${encodeURIComponent(created.id)}`);
    assert.equal(created.documentLink, `dsh-resource://space/${encodeURIComponent(created.id)}`);
    assert.equal(created.title, 'Agent document');

    // Omitting the document id is deterministic: a retry replays the same one.
    const replayed = await call(client, 'space_document_create', {
      text: '# Agent document\n\nHello world',
      operationId: 'agent-create-1',
    });
    assert.equal(replayed.id, created.id);
    const commentService = new SpaceService(home);
    const comment = commentService.createComment({ docId: created.id, quote: 'world', body: 'Clarify the ending', anchor: { from: 24, to: 29, version: 0 } });
    commentService.close();

    const read = await call(client, 'space_document_read', { id: created.reference });
    assert.equal(read.version, 0);
    assert.match(read.content, /Hello world/);
    assert.equal(read.comments.length, 1);
    assert.equal(read.comments[0].id, comment.id);

    const from = read.content.indexOf('world');
    const proposed = await call(client, 'space_suggest', {
      docId: created.reference,
      baseVersion: read.version,
      from,
      to: from + 'world'.length,
      expected: 'world',
      replacement: 'Space',
      operationId: 'agent-suggest-1',
    });
    assert.equal(proposed.suggestion.expected, 'world');

    const completed = await call(client, 'space_comment_complete', {
      docId: created.id,
      operationId: 'agent-comment-complete-1',
      results: [{ commentId: comment.id, suggestionIds: [proposed.suggestion.id] }],
    });
    assert.equal(completed.results[0].commentId, comment.id);
    assert.equal(completed.replay, false);
    const completionReplay = await call(client, 'space_comment_complete', {
      docId: created.id,
      operationId: 'agent-comment-complete-1',
      results: [{ commentId: comment.id, suggestionIds: [proposed.suggestion.id] }],
    });
    assert.equal(completionReplay.replay, true);
    const withProcessing = await call(client, 'space_document_read', { id: created.id });
    assert.equal(withProcessing.comments[0].status, 'processed');
    assert.equal(withProcessing.comments[0].body, 'Clarify the ending');
    assert.equal(withProcessing.comments[0].quote, 'world');
    assert.equal('processing' in withProcessing.comments[0], false);
    assert.equal('requestId' in withProcessing.comments[0], false);

    const pending = await call(client, 'space_suggestion_list', { docId: created.id, status: 'pending' });
    assert.equal(pending.suggestions.length, 1);
    assert.equal(pending.suggestions[0].id, proposed.suggestion.id);
    assert.equal(pending.suggestions[0].status, 'pending');

    // The user accepts in the UI; the Agent can then observe the decision.
    const service = new SpaceService(home);
    try {
      service.decide({ docId: created.id, suggestionId: proposed.suggestion.id, decision: 'accept', operationId: 'user-accept-1' });
    } finally {
      service.close();
    }
    const decided = await call(client, 'space_suggestion_list', { docId: created.id });
    assert.equal(decided.suggestions[0].status, 'accepted');
    const accepted = await call(client, 'space_document_read', { id: created.id });
    assert.equal(accepted.content, '# Agent document\n\nHello Space');
    assert.equal(accepted.comments[0].status, 'processed');
    assert.equal('processing' in accepted.comments[0], false);
  } finally {
    await client.close().catch(() => {});
    rmSync(home, { recursive: true, force: true });
  }
});

test('space_suggest links a comment and settles it one suggestion at a time', async () => {
  const home = mkdtempSync(path.join(tmpdir(), 'space-mcp-link-'));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('../test/fixtures/mcp-stdio-entry.js', import.meta.url))],
    env: { ...process.env, DSH_SPACE_HOME: home },
  });
  const client = new Client({ name: 'space-link-test', version: '1.0.0' });
  try {
    await client.connect(transport);
    const created = await call(client, 'space_document_create', { text: '# Link\n\nOne two', operationId: 'link-create' });
    const service = new SpaceService(home);
    let comment;
    try {
      comment = service.createComment({ docId: created.id, quote: 'One', body: 'Be specific', anchor: { from: 8, to: 11, version: 0 } });
    } finally { service.close(); }

    const first = await call(client, 'space_suggest', {
      docId: created.reference, baseVersion: 0, from: 8, to: 11, expected: 'One', replacement: 'First',
      operationId: 'link-suggest-1', commentId: comment.id,
    });
    assert.equal(first.comment.commentId, comment.id);
    assert.deepEqual(first.comment.suggestionIds, [first.suggestion.id]);
    assert.equal(first.comment.replay, false);

    // A comment that needs two edits settles through two suggestions.
    const second = await call(client, 'space_suggest', {
      docId: created.reference, baseVersion: 0, from: 12, to: 15, expected: 'two', replacement: 'Second',
      operationId: 'link-suggest-2', commentId: comment.id,
    });
    assert.deepEqual(second.comment.suggestionIds, [first.suggestion.id, second.suggestion.id].sort((a, b) => a - b));

    // Retrying the same suggestion is a replay, not a duplicate link.
    const replay = await call(client, 'space_suggest', {
      docId: created.reference, baseVersion: 0, from: 8, to: 11, expected: 'One', replacement: 'First',
      operationId: 'link-suggest-1', commentId: comment.id,
    });
    assert.equal(replay.suggestion.id, first.suggestion.id);
    assert.equal(replay.comment.replay, true);
    assert.deepEqual(replay.comment.suggestionIds, second.comment.suggestionIds);

    const check = new SpaceService(home);
    try {
      const [linked] = check.listComments(created.id);
      assert.equal(linked.status, 'processed');
      assert.deepEqual(linked.processing.suggestionIds, second.comment.suggestionIds);
    } finally { check.close(); }

    const read = await call(client, 'space_document_read', { id: created.reference });
    assert.equal(read.comments.length, 1);
    assert.equal(read.comments[0].status, 'processed');

    const before = (await call(client, 'space_suggestion_list', { docId: created.id })).suggestions.length;
    const missing = await client.callTool({ name: 'space_suggest', arguments: {
      docId: created.reference, baseVersion: 0, from: 0, to: 0, expected: '', replacement: 'X',
      operationId: 'link-suggest-3', commentId: 'comment-that-does-not-exist',
    } });
    assert.equal(missing.isError, true);
    assert.equal(payload(missing).error.code, 'COMMENT_NOT_FOUND');
    const after = (await call(client, 'space_suggestion_list', { docId: created.id })).suggestions.length;
    assert.equal(after, before);
  } finally {
    await client.close().catch(() => {});
    rmSync(home, { recursive: true, force: true });
  }
});
