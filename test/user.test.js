import { test } from 'node:test';
import assert from 'node:assert/strict';
import manifest from '../adapters/dsh/package.json' with { type: 'json' };
import { createUserResolver } from '../adapters/dsh/server/user.js';

const ctxWith = account => ({ get: name => name === 'deepseekAccount' ? account : undefined });

test('a signed-in profile exposes only the display name and safe avatar', async () => {
  const seen = [];
  const user = createUserResolver(ctxWith({
    getState: async () => ({ status: 'credential-stored' }),
    getProfile: async client => {
      seen.push(client);
      return { status: 'ready', value: { id: 'u1', name: '  Ada  ', contact: 'a***@example.com', avatarUrl: 'https://example.com/a.png' } };
    },
  }), { version: '9.9.9', locale: 'en' });
  const expected = { signedIn: true, name: 'Ada', avatarUrl: 'https://example.com/a.png' };

  assert.deepEqual(await user(), expected);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].version, '9.9.9');
  assert.equal(seen[0].locale, 'en');
  assert.equal(typeof seen[0].timezoneOffsetSeconds, 'number');

  // The same language is served from the short-lived cache.
  assert.deepEqual(await user('en-GB'), expected);
  assert.equal(seen.length, 1);

  // A different UI language is a different Platform payload, so it rereads.
  assert.deepEqual(await user('zh'), expected);
  assert.equal(seen.length, 2);
  assert.equal(seen[1].locale, 'zh');
});

test('the shipped account client identifies this package version and a default language', async () => {
  const seen = [];
  const user = createUserResolver(ctxWith({
    getState: async () => ({ status: 'credential-stored' }),
    getProfile: async client => { seen.push(client); return { status: 'failed' }; },
  }));

  await user();

  assert.equal(seen[0].version, manifest.version);
  assert.equal(seen[0].locale, 'zh');
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
