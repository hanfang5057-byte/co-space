import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resolveRuntimeHome } from '../packages/local-runtime/src/paths.js';

test('runtime home stays stable when a symlinked data home is created', { skip: process.platform === 'win32' }, () => {
  const root = mkdtempSync(path.join(tmpdir(), 'cospace-runtime-path-'));
  const alias = path.join(root, 'alias');
  const dataHome = path.join(alias, 'profile', 'webapp');
  try {
    symlinkSync(root, alias, 'dir');
    const beforeCreation = resolveRuntimeHome({ dataHome });
    mkdirSync(dataHome, { recursive: true });
    const afterCreation = resolveRuntimeHome({ dataHome });
    const canonical = resolveRuntimeHome({ dataHome: realpathSync.native(dataHome) });
    assert.equal(beforeCreation, afterCreation);
    assert.equal(afterCreation, canonical);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the runtime home honors the passed env on every platform', () => {
  const env = { HOME: '/smoke-home', LOCALAPPDATA: 'C:\\smoke-home', XDG_DATA_HOME: '/smoke-home' };
  const darwin = resolveRuntimeHome({ dataHome: '/data/webapp', env, platform: 'darwin' });
  assert.ok(darwin.startsWith('/smoke-home/Library/Application Support/CoSpace/local-server/profiles/'), darwin);
  assert.ok(resolveRuntimeHome({ dataHome: 'D:/data/webapp', env, platform: 'win32' }).startsWith('C:\\smoke-home'));
  assert.ok(resolveRuntimeHome({ dataHome: '/data/webapp', env, platform: 'linux' }).startsWith('/smoke-home/CoSpace'));
});
