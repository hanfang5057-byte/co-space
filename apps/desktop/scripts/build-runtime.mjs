import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { LOCAL_DATA_LAYOUT_VERSION, LOCAL_PROTOCOL_VERSION } from '../../../packages/local-runtime/src/paths.js';

const appDir = path.resolve(import.meta.dirname, '..');
const output = path.join(appDir, 'build/runtime');
const web = path.join(output, 'web');
await rm(output, { recursive: true, force: true });
await mkdir(web, { recursive: true });
await cp(path.join(appDir, 'src/runtime/client/index.html'), path.join(web, 'index.html'));
await build({ entryPoints: [path.join(appDir, 'src/runtime/client/main.jsx')], outfile: path.join(web, 'app.js'), bundle: true, format: 'esm', platform: 'browser', target: 'es2020', jsx: 'automatic', minify: true, loader: { '.css': 'css', '.svg': 'dataurl' } });
await build({ entryPoints: [path.join(appDir, 'src/runtime/daemon.js')], outfile: path.join(output, 'daemon.cjs'), bundle: true, packages: 'bundle', platform: 'node', format: 'cjs', target: 'node22' });
const manifest = JSON.parse(await readFile(path.join(appDir, 'package.json'), 'utf8'));
await writeFile(path.join(output, 'package.json'), `${JSON.stringify({ version: manifest.version, protocolVersion: LOCAL_PROTOCOL_VERSION, dataLayoutVersion: LOCAL_DATA_LAYOUT_VERSION }, null, 2)}\n`);
