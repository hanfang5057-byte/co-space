import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import brand from '../packages/brand/metadata.json' with { type: 'json' };

const root = path.resolve(import.meta.dirname, '..');
const adapter = path.join(root, 'adapters/dsh');
const output = path.join(root, 'dist/dsh-plugin');

await rm(output, { recursive: true, force: true });
await Promise.all([
  mkdir(path.join(output, 'server'), { recursive: true }),
  mkdir(path.join(output, 'locale'), { recursive: true }),
  mkdir(path.join(output, 'assets'), { recursive: true }),
]);
await build({
  entryPoints: [
    path.join(adapter, 'index.js'),
    path.join(adapter, 'server/mcp-entry.js'),
  ],
  outdir: output,
  outbase: adapter,
  entryNames: '[dir]/[name]',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  packages: 'bundle',
  external: ['@modelcontextprotocol/sdk', 'zod'],
  sourcemap: false,
  logLevel: 'info',
});

const manifest = JSON.parse(await readFile(path.join(adapter, 'package.json'), 'utf8'));
manifest.description = brand.description.en;
delete manifest.private;
await writeFile(path.join(output, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);

for (const [locale, language] of [['zh', 'zh'], ['en', 'en']]) {
  const data = JSON.parse(await readFile(path.join(adapter, 'locale', `${locale}.json`), 'utf8'));
  data.meta = {
    ...data.meta,
    title: brand.name[language],
    description: brand.description[language],
  };
  await writeFile(path.join(output, 'locale', `${locale}.json`), `${JSON.stringify(data, null, 2)}\n`);
}

await Promise.all([
  cp(path.join(adapter, 'cordis.patch.yml'), path.join(output, 'cordis.patch.yml')),
  cp(path.join(root, brand.icon), path.join(output, 'icon.svg')),
  cp(path.join(root, 'assets/preview.png'), path.join(output, 'assets/preview.png')),
  cp(path.join(root, 'LICENSE'), path.join(output, 'LICENSE')),
  cp(path.join(adapter, 'README.md'), path.join(output, 'README.md')),
  cp(path.join(root, 'docs'), path.join(output, 'docs'), {
    recursive: true,
    filter: source => !/^docs\/(?:10-workbuddy-connector-development-plan|11-comment-driven-revision-plan)\.md$/.test(path.relative(root, source)),
  }),
  cp(path.join(adapter, 'client.js'), path.join(output, 'client.js')),
  cp(path.join(adapter, 'adapter.json'), path.join(output, 'adapter.json')),
]);
