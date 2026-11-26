import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(appDir, '../..');
const manifest = JSON.parse(await readFile(path.join(appDir, 'package.json'), 'utf8'));
const out = path.join(root, 'dist/npm-packages');
execFileSync(process.execPath, [path.join(appDir, 'scripts/build.mjs')], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [path.join(appDir, 'scripts/verify-package.mjs')], { cwd: root, stdio: 'inherit' });
await mkdir(out, { recursive: true });
const tarball = path.join(out, `hanfang5057-co-space-${manifest.version}.tgz`);
await rm(tarball, { force: true });
const npmCache = await mkdtemp(path.join(tmpdir(), 'cospace-npm-pack-cache-'));
try {
  execFileSync('npm', ['pack', appDir, '--cache', npmCache, '--pack-destination', out], { cwd: root, stdio: 'inherit' });
} finally { await rm(npmCache, { recursive: true, force: true }); }
console.log(`Packed ${manifest.name}@${manifest.version} at ${tarball}`);
