import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const adapterDir = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.resolve(adapterDir, '../..');
const outputDir = path.join(repoDir, 'dist/workbuddy-connector');
const runtimeDir = path.join(outputDir, 'runtime-package');
const publicDir = path.join(runtimeDir, 'public');
const marketDir = path.join(outputDir, 'market');

await rm(outputDir, { recursive: true, force: true });
await mkdir(publicDir, { recursive: true });
await mkdir(path.join(marketDir, 'skills/space-review'), { recursive: true });

await build({
  entryPoints: [path.join(adapterDir, 'runtime/entry.js')],
  outfile: path.join(runtimeDir, 'server.js'),
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  packages: 'bundle',
  banner: { js: '#!/usr/bin/env node' },
  sourcemap: false,
  minify: false,
  logLevel: 'info',
});

await build({
  entryPoints: [path.join(adapterDir, 'web/index.jsx')],
  outfile: path.join(publicDir, 'client.js'),
  bundle: true,
  platform: 'browser',
  target: 'es2020',
  format: 'iife',
  jsx: 'automatic',
  nodePaths: [path.join(adapterDir, 'node_modules')],
  sourcemap: false,
  minify: true,
  logLevel: 'info',
});

await Promise.all([
  cp(path.join(adapterDir, 'connector/connector-meta.json'), path.join(marketDir, 'connector-meta.json')),
  cp(path.join(adapterDir, 'connector/mcp.json'), path.join(marketDir, 'mcp.json')),
  cp(path.join(adapterDir, 'connector/icon.svg'), path.join(marketDir, 'icon.svg')),
  cp(path.join(adapterDir, 'connector/icon.svg'), path.join(publicDir, 'icon.svg')),
  cp(path.join(adapterDir, 'connector/skills/space-review/SKILL.md'), path.join(marketDir, 'skills/space-review/SKILL.md')),
  cp(path.join(adapterDir, 'README.md'), path.join(outputDir, 'README.md')),
]);

const manifest = JSON.parse(await readFile(path.join(adapterDir, 'package.json'), 'utf8'));
await writeFile(path.join(runtimeDir, 'package.json'), `${JSON.stringify({
  name: manifest.name,
  version: manifest.version,
  description: manifest.description,
  type: 'module',
  engines: manifest.engines,
  bin: { 'dsh-space-workbuddy-connector': './server.js' },
  files: ['server.js', 'public/'],
}, null, 2)}\n`);

const localConfig = {
  mcpServers: {
    'dsh-space-review-local': {
      type: 'stdio',
      command: process.execPath,
      args: [path.join(runtimeDir, 'server.js')],
      timeout: 30000,
    },
  },
};
await writeFile(path.join(outputDir, 'mcp.local.json'), `${JSON.stringify(localConfig, null, 2)}\n`);
await writeFile(path.join(outputDir, 'README.txt'), [
  'market/ is the Connector metadata + Skill upload package.',
  'runtime-package/ is the bundled Node CLI package referenced by market/mcp.json after publication.',
  'mcp.local.json is a developer-only local config for installing this build in WorkBuddy; do not upload it to the Connector market.',
  '',
].join('\n'));
console.log(`WorkBuddy Connector built at ${outputDir}`);
