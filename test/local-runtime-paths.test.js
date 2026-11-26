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
