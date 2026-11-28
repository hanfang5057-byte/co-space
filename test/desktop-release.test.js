import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { assembleRelease } from '../apps/desktop/scripts/assemble-release.mjs';
import { verifyRelease } from '../apps/desktop/scripts/verify-release.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'cospace-release-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const input = path.join(root, 'input');
  const output = path.join(root, 'output');
  const targets = {
    'macos-arm64': ['CoSpace.app.tar.gz', 'CoSpace.app.tar.gz.sig', 'CoSpace_arm.dmg'],
    'windows-x64': ['CoSpace.msi', 'CoSpace.msi.sig', 'CoSpace.exe', 'CoSpace.exe.sig'],
    'linux-x64': ['CoSpace.AppImage', 'CoSpace.AppImage.sig', 'CoSpace.deb'],
  };
  for (const [target, names] of Object.entries(targets)) {
    const directory = path.join(input, `cospace-desktop-${target}`, 'bundle');
    await mkdir(directory, { recursive: true });
    for (const name of names) await writeFile(path.join(directory, name), name.endsWith('.sig') ? 'YWJjZA==' : `${target}:${name}`);
  }
  return { root, input, output, version: '1.2.3', repository: 'example/co-space' };
}

test('release assembly creates independent platform URLs, signatures and checksums', async t => {
  const f = await fixture(t);
  const result = await assembleRelease(f);
  assert.equal(Object.keys(result.platforms).length, 4);
  assert.match(result.platforms['darwin-aarch64-app'].url, /desktop-v1\.2\.3\/macos-arm64--CoSpace\.app\.tar\.gz$/);
  assert.equal(result.platforms['darwin-x86_64-app'], undefined);
  assert.equal(result.platforms['windows-x86_64-nsis'].signature, 'YWJjZA==');
  assert.match(await readFile(path.join(f.output, 'SHA256SUMS'), 'utf8'), /linux-x64--CoSpace\.deb/);
  const manifest = JSON.parse(await readFile(path.join(f.output, 'latest.json'), 'utf8'));
  assert.deepEqual(manifest.platforms, result.platforms);
});

test('release assembly fails closed when a platform signature or installer is absent', async t => {
  const f = await fixture(t);
  await rm(path.join(f.input, 'cospace-desktop-linux-x64', 'bundle', 'CoSpace.AppImage.sig'));
  await assert.rejects(assembleRelease(f), /Missing signature/);
  await assert.rejects(assembleRelease({ ...f, version: '1.2.3-beta' }), /stable version/);
});

test('release verification validates all platform signatures and rejects altered assets', async t => {
  const f = await fixture(t);
  await assembleRelease(f);
  let checked = 0;
  const verifySignature = async (_artifact, _signature, version) => { assert.equal(version, f.version); checked++; };
  const manifest = await verifyRelease({ directory: f.output, repository: f.repository, verifySignature });
  assert.equal(manifest.version, f.version);
  assert.equal(checked, 4);
  await writeFile(path.join(f.output, 'linux-x64--CoSpace.deb'), 'modified');
  await assert.rejects(verifyRelease({ directory: f.output, repository: f.repository, verifySignature }), /Checksum mismatch/);
});
