import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { installRuntimeVersion } from '../packages/local-runtime/src/manager.js';

test('a staged desktop runtime is checked for tampering before reuse', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'cospace-runtime-integrity-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'source');
  const runtimeHome = path.join(root, 'runtime');
  await mkdir(path.join(source, 'web'), { recursive: true });
  await Promise.all(['daemon.cjs', 'web/index.html', 'web/app.js', 'web/app.css'].map(name => writeFile(path.join(source, name), name)));
  const installed = await installRuntimeVersion({ sourceVersionHome: source, runtimeHome, version: '2.0.0' });
  await writeFile(path.join(installed, 'web/app.js'), 'tampered');
  await assert.rejects(installRuntimeVersion({ sourceVersionHome: source, runtimeHome, version: '2.0.0' }), { code: 'RUNTIME_ASSETS_INVALID' });
});
