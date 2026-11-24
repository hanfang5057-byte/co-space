import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const release = JSON.parse(await readFile(path.join(repoDir, 'release/npm-version.json'), 'utf8'));
const manifestPath = path.join(repoDir, 'adapters/dsh/package.json');
const adapterPath = path.join(repoDir, 'adapters/dsh/adapter.json');
const lockPath = path.join(repoDir, 'package-lock.json');
const packDir = path.join(repoDir, 'dist/npm-packages');
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(release.version)) {
  throw new Error(`Invalid npm release version: ${release.version}`);
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const adapter = JSON.parse(await readFile(adapterPath, 'utf8'));
const lock = JSON.parse(await readFile(lockPath, 'utf8'));
manifest.version = release.version;
adapter.version = release.version;
lock.packages['adapters/dsh'].version = release.version;
await Promise.all([
  writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`),
  writeFile(adapterPath, `${JSON.stringify(adapter, null, 2)}\n`),
  writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`),
]);

const run = (command, args) => execFileSync(command, args, { cwd: repoDir, stdio: 'inherit' });
run(process.execPath, ['scripts/build-client.mjs']);
run(process.execPath, ['scripts/build-dsh.mjs']);
run(process.execPath, ['scripts/verify-dsh-package.mjs']);
await mkdir(packDir, { recursive: true });
await rm(path.join(packDir, `dsh-plugin-space-${release.version}.tgz`), { force: true });
run('npm', ['pack', './dist/dsh-plugin', '--pack-destination', packDir]);
console.log(`Packed dsh-plugin-space ${release.version} into ${packDir}`);
