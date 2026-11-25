import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(appDir, 'build/webapp');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(path.join(appDir, 'src/client/index.html'), path.join(out, 'index.html'));
await build({ entryPoints: [path.join(appDir, 'src/client/main.jsx')], outfile: path.join(out, 'app.js'), bundle: true, format: 'esm', platform: 'browser', target: 'es2020', jsx: 'automatic', minify: true, loader: { '.css': 'css', '.svg': 'dataurl' }, external: ['node:*'] });
