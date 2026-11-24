import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import brand from '../packages/brand/metadata.json' with { type: 'json' };
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist/site');
await rm(output, { recursive: true, force: true });
await mkdir(path.join(output, 'assets'), { recursive: true });
await Promise.all([
  cp(path.join(root, 'apps/site/index.html'), path.join(output, 'index.html')),
  cp(path.join(root, 'apps/site/styles.css'), path.join(output, 'styles.css')),
  cp(path.join(root, 'apps/site/site.js'), path.join(output, 'site.js')),
  cp(path.join(root, brand.icon), path.join(output, 'assets/cospace-icon.svg')),
]);
console.log(`Built static site at ${path.relative(root, output)}`);
