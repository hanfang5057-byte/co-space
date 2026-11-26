import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(appDir, '../..');
const output = process.env.COSPACE_BUILD_OUTPUT ? path.resolve(process.env.COSPACE_BUILD_OUTPUT) : path.join(appDir, 'dist');
const web = path.join(output, 'web');
await rm(output, { recursive: true, force: true });
await mkdir(web, { recursive: true });
await cp(path.join(appDir, 'src/client/index.html'), path.join(web, 'index.html'));
await build({
  entryPoints: [path.join(appDir, 'src/client/main.jsx')],
  outfile: path.join(web, 'app.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  jsx: 'automatic',
  minify: true,
  loader: { '.css': 'css', '.svg': 'dataurl' },
});
await build({
  entryPoints: [path.join(appDir, 'src/daemon-entry.js')],
  outfile: path.join(output, 'daemon.cjs'),
  bundle: true,
  packages: 'bundle',
  platform: 'node',
  format: 'cjs',
  target: 'node24',
  sourcemap: false,
});
await build({
  entryPoints: [path.join(root, 'packages/local-runtime/src/mcp-client.js')],
  outfile: path.join(output, 'mcp.cjs'),
  bundle: true,
  packages: 'bundle',
  platform: 'node',
  format: 'cjs',
  target: 'node24',
  sourcemap: false,
});
await build({
  entryPoints: [path.join(appDir, 'src/cli.js')],
  outfile: path.join(output, 'cli.js'),
  bundle: true,
  packages: 'bundle',
  platform: 'node',
  format: 'esm',
  target: 'node24',
  sourcemap: false,
});
const manifest = JSON.parse(await readFile(path.join(appDir, 'package.json'), 'utf8'));
await writeFile(path.join(output, 'package.json'), `${JSON.stringify({ name: manifest.name, version: manifest.version, type: 'module', protocolVersion: 1 }, null, 2)}\n`);
await cp(path.join(root, 'LICENSE'), path.join(appDir, 'LICENSE'));
console.log(`Built Local Server ${manifest.version} at ${output}`);
