import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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
  cp(path.join(root, 'assets/preview.png'), path.join(output, 'assets/preview.png')),
]);
const [installerShell, installerJs, skill] = await Promise.all([
  readFile(path.join(root, 'apps/local-server/installer/install.sh'), 'utf8'),
  readFile(path.join(root, 'apps/local-server/installer/install.cjs'), 'utf8'),
  readFile(path.join(root, 'apps/local-server/skills/cospace-review/SKILL.md'), 'utf8'),
]);
const installer = installerShell.replace('/* COSPACE_INSTALLER_SOURCE */', () => installerJs.replace('/* COSPACE_SKILL_CONTENT */', () => JSON.stringify(skill)));
await writeFile(path.join(output, 'install.sh'), installer);
console.log(`Built static site at ${path.relative(root, output)}`);
