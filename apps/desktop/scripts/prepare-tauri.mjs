import { build } from 'esbuild';
import { chmod, cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(appDir, '../..');
const tauri = path.join(appDir, 'src-tauri');
const resources = path.join(tauri, 'resources');
const binaries = path.join(tauri, 'binaries');
const target = {
  darwin: { arm64: 'aarch64-apple-darwin', x64: 'x86_64-apple-darwin' },
  win32: { arm64: 'aarch64-pc-windows-msvc', x64: 'x86_64-pc-windows-msvc' },
  linux: { arm64: 'aarch64-unknown-linux-gnu', x64: 'x86_64-unknown-linux-gnu' },
}[process.platform]?.[process.arch];
if (!target) throw new Error(`Unsupported desktop build target: ${process.platform}-${process.arch}`);
const suffix = process.platform === 'win32' ? '.exe' : '';

await rm(resources, { recursive: true, force: true });
await rm(binaries, { recursive: true, force: true });
await mkdir(path.join(resources, 'desktop'), { recursive: true });
await mkdir(path.join(resources, 'desktop/local-server'), { recursive: true });
await mkdir(path.join(resources, 'dist'), { recursive: true });
await mkdir(path.join(resources, 'node_modules'), { recursive: true });
await mkdir(binaries, { recursive: true });

const bundleOptions = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node24',
  external: ['jsonc-parser'],
  define: { 'import.meta.url': '__bundleFileUrl' },
  banner: { js: 'const __bundleFileUrl = require("node:url").pathToFileURL(__filename).href;' },
  sourcemap: false,
};
await build({
  entryPoints: [path.join(appDir, 'src/server/index.js')],
  outfile: path.join(resources, 'desktop/server.bundle.cjs'),
  ...bundleOptions,
});
await build({
  entryPoints: [path.join(appDir, 'src/mcp/index.js')],
  outfile: path.join(resources, 'desktop/mcp-entry.bundle.cjs'),
  ...bundleOptions,
});
await cp(path.join(appDir, 'src/agent/skill'), path.join(resources, 'desktop/skill'), { recursive: true });
await cp(path.join(repoRoot, 'apps/local-server/dist/daemon.cjs'), path.join(resources, 'desktop/local-server/daemon.cjs'));
await cp(path.join(repoRoot, 'apps/local-server/dist/web'), path.join(resources, 'desktop/local-server/web'), { recursive: true });
await cp(path.join(repoRoot, 'node_modules/jsonc-parser'), path.join(resources, 'node_modules/jsonc-parser'), { recursive: true });
await cp(path.join(appDir, 'build/webapp'), path.join(resources, 'dist/webapp'), { recursive: true });
const runtime = process.platform === 'win32' ? 'cospace-node.exe' : 'cospace-node';
await cp(process.execPath, path.join(binaries, `${runtime}-${target}${suffix}`));
if (process.platform !== 'win32') await chmod(path.join(binaries, `${runtime}-${target}`), 0o755);
console.log(`Prepared Tauri resources for ${target}`);
