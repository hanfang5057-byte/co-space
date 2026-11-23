import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { SpaceService } from '../../../packages/review-core/src/space-service.js';
import { createWorkBuddyApi } from '../runtime/api.js';

test('WorkBuddy browser API uses the shared local review service', async () => {
  const home = mkdtempSync(path.join(os.tmpdir(), 'space-workbuddy-api-'));
  const service = new SpaceService(home);
  const api = createWorkBuddyApi(service);
  try {
    const created = await api.dispatch('createDocument', { title: 'WorkBuddy test', operationId: 'wb-api-doc' });
    const document = await api.dispatch('readDocument', { docId: created.id });
    const suggestion = await service.propose({
      docId: created.id,
      baseVersion: document.version,
      from: 0,
      to: document.content.length,
      expected: document.content,
      replacement: '# Revised\n\n',
      operationId: 'wb-api-suggest',
    });
    const comment = await api.dispatch('createComment', { docId: created.id, quote: '#', body: 'Review title', anchor: { from: 0, to: 1, version: 0 } });
    assert.equal((await api.dispatch('listComments', { docId: created.id })).length, 1);
    assert.equal((await api.dispatch('readDocument', { docId: created.id })).suggestions[0].id, suggestion.id);
    await api.dispatch('decide', { docId: created.id, suggestionId: suggestion.id, decision: 'accept', operationId: 'wb-api-decide' });
    assert.equal((await api.dispatch('readDocument', { docId: created.id })).content, '# Revised\n\n');
    await api.dispatch('deleteComment', { docId: created.id, commentId: comment.id });
    assert.equal((await api.dispatch('listComments', { docId: created.id })).length, 0);
    assert.deepEqual(await api.dispatch('serviceStatus'), { name: 'Space', storage: 'local-only', available: true });
    await assert.rejects(api.dispatch('sendComments', {}), error => error.code === 'METHOD_NOT_FOUND');
  } finally {
    service.close();
    rmSync(home, { recursive: true, force: true });
  }
});
