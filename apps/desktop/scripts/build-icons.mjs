import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, readdir, rm, copyFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(appDir, '../..');
const require = createRequire(import.meta.url);
const tauriCli = require.resolve('@tauri-apps/cli/tauri.js');
const source = path.join(repoRoot, 'assets/cospace-icon.svg');
const output = await mkdtemp(path.join(os.tmpdir(), 'cospace-desktop-icons-'));
const iconDir = path.join(appDir, 'src-tauri/icons');
const requiredIcons = ['32x32.png', '128x128.png', '128x128@2x.png', 'icon.icns', 'icon.ico'];

try {
  execFileSync(process.execPath, [tauriCli, 'icon', source, '--output', output], { cwd: appDir, stdio: 'inherit' });
  const generated = new Set(await readdir(output));
  for (const name of requiredIcons) {
    if (!generated.has(name)) throw new Error(`Tauri did not generate required desktop icon: ${name}`);
  }
  await rm(iconDir, { recursive: true, force: true });
  await mkdir(iconDir, { recursive: true });
  await Promise.all(requiredIcons.map(name => copyFile(path.join(output, name), path.join(iconDir, name))));
  console.log(`Generated ${requiredIcons.length} desktop icons from assets/cospace-icon.svg`);
} finally {
  await rm(output, { recursive: true, force: true });
}
