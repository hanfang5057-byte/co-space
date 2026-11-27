import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(appDir, '../..');
const targets = { darwin: ['app'], win32: ['msi', 'nsis'], linux: ['deb', 'appimage'] };
const supported = targets[process.platform];
if (!supported) throw new Error(`Unsupported Tauri platform: ${process.platform}`);
const bundles = (process.env.COSPACE_BUNDLES || supported.join(',')).split(',').map(value => value.trim()).filter(Boolean);
if (!bundles.length || bundles.some(bundle => !supported.includes(bundle))) {
  throw new Error(`Unsupported ${process.platform} bundle selection: ${bundles.join(',')}`);
}
const target = bundles.join(',');

const cli = path.join(repoRoot, 'node_modules/@tauri-apps/cli/tauri.js');
const config = path.join(appDir, 'src-tauri/tauri.conf.json');
const args = [cli, 'build', '--config', config, '--bundles', target];
const publicKey = process.env.COSPACE_UPDATER_PUBLIC_KEY;
const overlay = {};
if (publicKey) {
  if (!process.env.TAURI_SIGNING_PRIVATE_KEY) throw new Error('Signed updater builds require TAURI_SIGNING_PRIVATE_KEY');
  overlay.bundle = { createUpdaterArtifacts: true };
  overlay.plugins = { updater: { pubkey: publicKey, requireSignedVersion: true } };
} else if (process.env.COSPACE_RELEASE === '1') {
  throw new Error('Release builds require COSPACE_UPDATER_PUBLIC_KEY and TAURI_SIGNING_PRIVATE_KEY');
}
if (process.platform === 'win32' && process.env.COSPACE_RELEASE === '1') {
  const thumbprint = process.env.COSPACE_WINDOWS_CERT_THUMBPRINT;
  if (!/^[a-f0-9]{40}$/i.test(thumbprint || '')) throw new Error('Release builds require a Windows signing certificate thumbprint');
  overlay.bundle ??= {};
  overlay.bundle.windows = { certificateThumbprint: thumbprint, digestAlgorithm: 'sha256', timestampUrl: 'http://timestamp.digicert.com' };
}
if (Object.keys(overlay).length) args.push('--config', JSON.stringify(overlay));
const result = spawnSync(process.execPath, args, {
  cwd: repoRoot,
  stdio: 'inherit',
});
if (result.error) throw result.error;
if (result.status !== 0) process.exitCode = result.status ?? 1;
