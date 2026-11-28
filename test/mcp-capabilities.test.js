import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '../packages/transport-mcp/server.js';
import { SpaceService } from '../packages/review-core/src/space-service.js';
import { CollaborationStore } from '../packages/review-core/src/collaboration-store.js';
import { startLocalService } from '../packages/local-runtime/src/service.js';
import { createRemoteServices } from '../packages/local-runtime/src/mcp-client.js';
import { TOOL_NAMES, desktopSkill } from '../packages/agent-contract/src/index.js';

for (const target of ['direct', 'local', 'dsh']) {
  test(`${target}: scoped reading, batch replay, and feedback`, async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'cospace-capabilities-'));
    let service, collaboration, daemon, server, client;
    try {
      const home = path.join(root, 'data');
      if (target === 'local') {
        daemon = await startLocalService({ dataHome: home, runtimeHome: path.join(root, 'run'), versionHome: root });
        ({ space: service, collaboration } = createRemoteServices(daemon));
      } else if (target === 'direct') {
        service = new SpaceService(home);
        collaboration = new CollaborationStore(home);
      }
      client = new Client({ name: 'capabilities-test', version: '1' });
      if (target === 'dsh') {
        await client.connect(new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL('../adapters/dsh/server/mcp-entry.js', import.meta.url))], env: { ...process.env, DSH_SPACE_HOME: home } }));
      } else {
        server = createMcpServer(service, collaboration, { reviewUrl: 'http://127.0.0.1:1234/' });
        const [a, b] = InMemoryTransport.createLinkedPair();
        await Promise.all([server.connect(a), client.connect(b)]);
      }
      assert.deepEqual((await client.listTools()).tools.map(tool => tool.name).sort(), [...TOOL_NAMES].sort());
      const invoke = async (name, args) => {
        const result = await client.callTool({ name, arguments: args });
        return { isError: !!result.isError, ...JSON.parse(result.content[0].text) };
      };
      const content = '# 一\n😀 hello hello\n```\n# no\n```\n## 二\nworld\n';
      const created = await invoke('space_document_create', { text: content, operationId: 'create' });
      const docId = created.reference;
      const outline = await invoke('space_document_outline', { docId, limit: 1 });
      assert.equal(outline.items[0].title, '一');
      assert.equal(outline.items[0].to, content.length);
      const second = await invoke('space_document_outline', { docId, limit: 1, cursor: outline.nextCursor });
      assert.equal(second.items[0].title, '二');
      assert.equal(second.items.length, 1);
      const from = content.indexOf('hello');
      const range = await invoke('space_document_read_range', { docId, version: 0, from, to: from + 5 });
      assert.equal(range.content, 'hello');
      assert.equal((await invoke('space_document_read_range', { docId, version: 0, from: content.indexOf('😀') + 1, to: from })).error.code, 'INVALID_RANGE');
      const found = await invoke('space_document_find', { docId, version: 0, query: 'hello', limit: 1 });
      assert.equal(found.items[0].from, from);
      assert.ok(found.nextCursor);
      assert.equal((await invoke('space_document_find', { docId, version: 0, query: 'world', cursor: found.nextCursor })).error.code, 'INVALID_CURSOR');
      const userService = new SpaceService(home);
      const comment = userService.createComment({ docId: created.id, quote: 'hello', body: 'Clarify', anchor: { from, to: from + 5, version: 0 } });
      userService.close();
      const comments = await invoke('space_comment_list', { docId, commentIds: [comment.id] });
      assert.equal(comments.items[0].id, comment.id);
      const input = { docId, baseVersion: 0, suggestions: [
        { operationId: 'first', from, to: from + 5, expected: 'hello', replacement: 'hi' },
        { operationId: 'overlap', from, to: from + 5, expected: 'hello', replacement: 'other' },
        { operationId: 'second', from: content.indexOf('world'), to: content.indexOf('world') + 5, expected: 'world', replacement: 'space' },
      ] };
      const batch = await invoke('space_suggest_batch', input);
      assert.deepEqual(batch.results.map(item => item.success), [true, false, true]);
      assert.equal(batch.results[1].error.code, 'OVERLAPPING_SUGGESTION');
      const replay = await invoke('space_suggest_batch', input);
      assert.equal(replay.results[0].suggestion.id, batch.results[0].suggestion.id);
      assert.equal(replay.results[2].suggestion.id, batch.results[2].suggestion.id);
      const changed = structuredClone(input); changed.suggestions[0].replacement = 'changed';
      assert.equal((await invoke('space_suggest_batch', changed)).results[0].error.code, 'OPERATION_ID_CONFLICT');
      const invalidBatch = structuredClone(input); invalidBatch.suggestions[0].commentId = comment.id;
      assert.equal((await client.callTool({ name: 'space_suggest_batch', arguments: invalidBatch })).isError, true);
      const raw = await client.callTool({ name: 'space_suggestion_get', arguments: { docId, suggestionId: batch.results[0].suggestion.id } });
      assert.equal(raw.structuredContent.suggestion.id, batch.results[0].suggestion.id);
      const one = await invoke('space_suggestion_get', { docId, suggestionId: batch.results[0].suggestion.id });
      assert.equal(one.suggestion.status, 'pending');
      assert.equal((await invoke('space_review_summary', { docId })).suggestions.pending, 2);
      if (target === 'dsh') assert.match(one.documentLink, /^dsh-resource:\/\/space\//);
      else assert.equal(new URL(one.reviewUrl).searchParams.get('document'), created.id);
      const human = new SpaceService(home);
      human.decide({ docId: created.id, suggestionId: batch.results[0].suggestion.id, decision: 'accept', operationId: 'accept' });
      human.close();
      assert.equal((await invoke('space_document_read_range', { docId, version: 0, from, to: from + 5 })).error.code, 'VERSION_CONFLICT');
      assert.equal((await invoke('space_suggestion_get', { docId, suggestionId: batch.results[0].suggestion.id })).suggestion.status, 'accepted');
    } finally {
      await client?.close(); await server?.close(); await daemon?.close();
      if (target === 'direct') { service?.close(); collaboration?.close(); }
      await rm(root, { recursive: true, force: true });
    }
  });
}

test('packaged Desktop skill matches its contract source', async () => {
  assert.equal(await readFile(new URL('../apps/desktop/src/agent/skill/SKILL.md', import.meta.url), 'utf8'), desktopSkill());
});

test('comment link failure reveals the committed suggestion and a retry recovers', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'cospace-link-failure-'));
  const service = new SpaceService(root);
  const actualLink = service.linkCommentSuggestion.bind(service);
  let loseReply = true;
  service.linkCommentSuggestion = input => {
    const result = actualLink(input);
    if (loseReply) { loseReply = false; throw new Error('simulated response lost'); }
    return result;
  };
  const document = service.createDocument({ id: 'd', content: '# Hello', operationId: 'create' });
  const comment = service.createComment({ docId: document.id, quote: 'Hello', body: 'Change', anchor: { from: 2, to: 7, version: 0 } });
  const server = createMcpServer(service);
  const client = new Client({ name: 'failure-test', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  try {
    await Promise.all([server.connect(a), client.connect(b)]);
    const args = { docId: 'd', baseVersion: 0, from: 2, to: 7, expected: 'Hello', replacement: 'Hi', commentId: comment.id, operationId: 'suggest' };
    const invoke = async () => JSON.parse((await client.callTool({ name: 'space_suggest', arguments: args })).content[0].text);
    const first = await invoke();
    assert.equal(first.commentLink.status, 'unknown');
    assert.ok(first.suggestion.id);
    const replay = await invoke();
    assert.equal(replay.suggestion.id, first.suggestion.id);
    assert.equal(replay.comment.replay, true);
    assert.deepEqual(replay.comment.suggestionIds, [first.suggestion.id]);
    assert.equal(service.listSuggestions('d').suggestions.length, 1);
  } finally {
    await client.close(); await server.close(); service.close();
    await rm(root, { recursive: true, force: true });
  }
});
