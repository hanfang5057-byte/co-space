import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { SpaceService } from '../packages/review-core/src/space-service.js';
import { createMcpServer } from '../packages/transport-mcp/server.js';
import { startLocalService } from '../packages/local-runtime/src/service.js';
import { createRemoteServices } from '../packages/local-runtime/src/mcp-client.js';

for (const target of ['dsh', 'local']) {
  test(`${target} MCP preserves the shared review contract`, async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), `cospace-contract-${target}-`));
    const dataHome = path.join(root, 'data');
    const client = new Client({ name: 'contract-test', version: '1.0.0' });
    let server, daemon;
    try {
      if (target === 'dsh') {
        await client.connect(new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL('../adapters/dsh/server/mcp-entry.js', import.meta.url))], env: { ...process.env, DSH_SPACE_HOME: dataHome } }));
      } else {
        daemon = await startLocalService({ dataHome, runtimeHome: path.join(root, 'runtime'), versionHome: root });
        const { space, collaboration } = createRemoteServices(daemon);
        server = createMcpServer(space, collaboration);
        const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
        await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
      }
      const invoke = async (name, args) => {
        const result = await client.callTool({ name, arguments: args });
        return { error: result.isError === true, body: JSON.parse(result.content[0].text) };
      };
      const create = { text: '# Contract\n\nHello world', operationId: 'create' };
      const created = await invoke('space_document_create', create);
      assert.equal(created.error, false);
      assert.equal((await invoke('space_document_create', create)).body.id, created.body.id);
      const ref = created.body.reference;
      const read = await invoke('space_document_read', { id: ref });
      assert.equal(read.body.content, create.text);
      const from = read.body.content.indexOf('world');
      const input = { docId: ref, baseVersion: 0, from, to: from + 5, expected: 'world', replacement: 'Space', operationId: 'suggest' };
      const proposed = await invoke('space_suggest', input);
      assert.equal(proposed.error, false);
      assert.equal((await invoke('space_suggest', input)).body.suggestion.id, proposed.body.suggestion.id);
      const overlap = await invoke('space_suggest', { ...input, operationId: 'overlap' });
      assert.equal(overlap.body.error.code, 'OVERLAPPING_SUGGESTION');
      const human = new SpaceService(dataHome);
      try { human.decide({ docId: created.body.id, suggestionId: proposed.body.suggestion.id, decision: 'accept', operationId: 'accept' }); }
      finally { human.close(); }
      assert.equal((await invoke('space_document_read', { id: ref })).body.content, '# Contract\n\nHello Space');
      assert.equal((await invoke('space_suggestion_list', { docId: ref })).body.suggestions[0].status, 'accepted');
      const stale = await invoke('space_suggest', { ...input, operationId: 'stale' });
      assert.equal(stale.body.error.code, 'VERSION_CONFLICT');
    } finally {
      await client.close().catch(() => {});
      await server?.close().catch(() => {});
      await daemon?.close();
      await rm(root, { recursive: true, force: true });
    }
  });
}
