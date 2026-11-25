import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(appDir, '../..');
const targets = { darwin: 'app', win32: 'msi,nsis', linux: 'deb,appimage' };
const target = targets[process.platform];
if (!target) throw new Error(`Unsupported Tauri platform: ${process.platform}`);

const cli = path.join(repoRoot, 'node_modules/@tauri-apps/cli/tauri.js');
const config = path.join(appDir, 'src-tauri/tauri.conf.json');
const result = spawnSync(process.execPath, [cli, 'build', '--config', config, '--bundles', target], {
  cwd: repoRoot,
  stdio: 'inherit',
});
if (result.error) throw result.error;
if (result.status !== 0) process.exitCode = result.status ?? 1;
