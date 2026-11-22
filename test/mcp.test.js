import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SpaceService } from '../src/space-service.js';

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

test('the Space MCP server supports the full create/read/suggest/status loop', async () => {
  const home = mkdtempSync(path.join(tmpdir(), 'space-mcp-'));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('../server/mcp.js', import.meta.url))],
    env: { ...process.env, DSH_SPACE_HOME: home },
  });
  const client = new Client({ name: 'space-test', version: '1.0.0' });
  try {
    await client.connect(transport);

    const tools = await client.listTools();
    const names = tools.tools.map(tool => tool.name);
    for (const name of ['space_list', 'space_documents', 'space_document_create', 'space_document_read', 'space_suggest', 'space_suggestion_list']) {
      assert.ok(names.includes(name), `missing ${name}`);
    }

    const created = await call(client, 'space_document_create', {
      text: '# Agent document\n\nHello world',
      operationId: 'agent-create-1',
    });
    assert.match(created.id, /^doc-[a-f0-9]{24}$/);
    assert.equal(created.reference, `space:${encodeURIComponent(created.id)}`);
    assert.equal(created.title, 'Agent document');

    // Omitting the document id is deterministic: a retry replays the same one.
    const replayed = await call(client, 'space_document_create', {
      text: '# Agent document\n\nHello world',
      operationId: 'agent-create-1',
    });
    assert.equal(replayed.id, created.id);
    const list = await call(client, 'space_documents');
    assert.equal(list.documents.filter(document => document.id === created.id).length, 1);

    const read = await call(client, 'space_document_read', { id: created.reference });
    assert.equal(read.version, 0);
    assert.match(read.content, /Hello world/);

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
    assert.equal((await call(client, 'space_document_read', { id: created.id })).content, '# Agent document\n\nHello Space');
  } finally {
    await client.close().catch(() => {});
    rmSync(home, { recursive: true, force: true });
  }
});
