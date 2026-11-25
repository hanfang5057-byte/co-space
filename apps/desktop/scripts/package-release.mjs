import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(appDir, '../..');
const tauri = path.join(appDir, 'src-tauri');
const bundle = path.join(tauri, 'target/release/bundle');
const config = JSON.parse(await readFile(path.join(tauri, 'tauri.conf.json'), 'utf8'));
const platformName = { darwin: 'macos', win32: 'windows', linux: 'linux' }[process.platform];
if (!platformName) throw new Error(`Unsupported Tauri release platform: ${process.platform}`);
const releaseDir = path.join(repoRoot, 'dist/releases/desktop', platformName);
await rm(releaseDir, { recursive: true, force: true });
await mkdir(releaseDir, { recursive: true });

if (process.platform === 'darwin') {
  const app = path.join(bundle, 'macos/CoSpace.app');
  const arch = process.arch === 'arm64' ? 'aarch64' : 'x64';
  const dmgDir = path.join(bundle, 'dmg');
  const dmg = path.join(dmgDir, `CoSpace_${config.version}_${arch}.dmg`);
  const signingIdentity = process.env.APPLE_SIGNING_IDENTITY;
  const signingArgs = ['--force', '--deep'];
  if (signingIdentity) signingArgs.push('--options', 'runtime', '--timestamp', '--sign', signingIdentity);
  else signingArgs.push('--sign', '-', '--timestamp=none');
  execFileSync('codesign', [...signingArgs, app], { stdio: 'inherit' });
  execFileSync('codesign', ['--verify', '--deep', '--strict', app], { stdio: 'inherit' });
  const staging = await mkdtemp(path.join(os.tmpdir(), 'cospace-dmg-'));
  try {
    await mkdir(dmgDir, { recursive: true });
    await rm(dmg, { force: true });
    await cp(app, path.join(staging, 'CoSpace.app'), { recursive: true });
    await symlink('/Applications', path.join(staging, 'Applications'), 'dir');
    execFileSync('hdiutil', ['create', '-volname', 'CoSpace', '-srcfolder', staging, '-ov', '-format', 'UDZO', dmg], { stdio: 'inherit' });
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
  await cp(dmg, path.join(releaseDir, path.basename(dmg)));
} else {
  const formats = process.platform === 'win32' ? ['msi', 'nsis'] : ['deb', 'appimage'];
  for (const format of formats) {
    const sourceDir = path.join(bundle, format);
    for (const name of await readdir(sourceDir).catch(() => [])) {
      await cp(path.join(sourceDir, name), path.join(releaseDir, name), { recursive: true });
    }
  }
}

const outputs = await readdir(releaseDir);
if (!outputs.length) throw new Error(`Tauri build produced no release artifacts for ${platformName}`);
console.log(`Prepared ${outputs.map(name => path.relative(repoRoot, path.join(releaseDir, name))).join(', ')}`);
