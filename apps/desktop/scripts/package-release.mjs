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
  // Tauri signs before generating updater archives; re-signing here would
  // make the downloadable app differ from the signed updater artifact.
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
  for (const name of await readdir(path.join(bundle, 'macos'))) {
    if (name.endsWith('.app.tar.gz') || name.endsWith('.app.tar.gz.sig')) await cp(path.join(bundle, 'macos', name), path.join(releaseDir, name));
  }
} else {
  const supported = process.platform === 'win32' ? ['msi', 'nsis'] : ['deb', 'appimage'];
  const formats = (process.env.COSPACE_BUNDLES || supported.join(',')).split(',').map(value => value.trim()).filter(Boolean);
  if (!formats.length || formats.some(format => !supported.includes(format))) {
    throw new Error(`Unsupported ${platformName} bundle selection: ${formats.join(',')}`);
  }
  for (const format of formats) {
    const sourceDir = path.join(bundle, format);
    for (const name of await readdir(sourceDir).catch(() => [])) {
      if (!name.includes(config.version)) continue;
      await cp(path.join(sourceDir, name), path.join(releaseDir, name), { recursive: true });
    }
  }
}

const outputs = await readdir(releaseDir);
if (!outputs.length) throw new Error(`Tauri build produced no release artifacts for ${platformName}`);
console.log(`Prepared ${outputs.map(name => path.relative(repoRoot, path.join(releaseDir, name))).join(', ')}`);
