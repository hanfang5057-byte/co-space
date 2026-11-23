import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('client bundle uses the host React runtime and ships no React copy', async () => {
  const manifest = JSON.parse(await readFile(new URL('../adapters/dsh/package.json', import.meta.url), 'utf8'));
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    assert.equal(manifest[section]?.react, undefined, `${section}.react must stay host-provided`);
    assert.equal(manifest[section]?.['react-dom'], undefined, `${section}.react-dom must stay host-provided`);
  }
  const bundle = await readFile(new URL('../adapters/dsh/client.js', import.meta.url), 'utf8');
  // The module-loader id is the package name the Host resolves; keep them equal.
  assert.match(bundle, new RegExp(`load\\(\\{id:'${manifest.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`));
  // The module-loader `require` is the host module table; both entries must stay external.
  assert.match(bundle, /require\(["']react["']\)/);
  assert.match(bundle, /require\(["']react\/jsx-runtime["']\)/);
  assert.doesNotMatch(bundle, /react-dom/);
});
