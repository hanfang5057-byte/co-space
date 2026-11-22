import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUserResolver } from '../server/user.js';

const ctxWith = account => ({ get: name => name === 'deepseekAccount' ? account : undefined });

test('a signed-in profile exposes only the display name and safe avatar', async () => {
  let profileCalls = 0;
  const user = createUserResolver(ctxWith({
    getState: async () => ({ status: 'credential-stored' }),
    getProfile: async client => {
      profileCalls++;
      assert.equal(client.version, '0.1.0');
      assert.equal(typeof client.timezoneOffsetSeconds, 'number');
      return { status: 'ready', value: { id: 'u1', name: '  Ada  ', contact: 'a***@example.com', avatarUrl: 'https://example.com/a.png' } };
    },
  }));
  assert.deepEqual(await user(), { signedIn: true, name: 'Ada', avatarUrl: 'https://example.com/a.png' });
  // The second call is served from the short-lived cache.
  assert.deepEqual(await user(), { signedIn: true, name: 'Ada', avatarUrl: 'https://example.com/a.png' });
  assert.equal(profileCalls, 1);
});

test('an unsigned-in account has no comment identity', async () => {
  const user = createUserResolver(ctxWith({
    getState: async () => ({ status: 'signed-out' }),
    getProfile: async () => { throw new Error('must not be called'); },
  }));
  assert.equal(await user(), null);
});

test('a failed profile read keeps the signed-in fact but no private fields', async () => {
  const user = createUserResolver(ctxWith({
    getState: async () => ({ status: 'credential-stored' }),
    getProfile: async () => ({ status: 'failed' }),
  }));
  assert.deepEqual(await user(), { signedIn: true, name: null, avatarUrl: null });
});

test('non-http avatar values are discarded and a missing account plugin is null', async () => {
  const user = createUserResolver(ctxWith({
    getState: async () => ({ status: 'credential-stored' }),
    getProfile: async () => ({ status: 'ready', value: { id: 'u', name: 'Ada', avatarUrl: 'javascript:alert(1)' } }),
  }));
  assert.deepEqual(await user(), { signedIn: true, name: 'Ada', avatarUrl: null });
  assert.equal(await createUserResolver({ get: () => undefined })(), null);
});
