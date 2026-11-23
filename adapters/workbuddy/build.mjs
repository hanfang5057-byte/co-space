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
const manifest = JSON.parse(await readFile(path.join(adapterDir, 'package.json'), 'utf8'));

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

const marketConfig = JSON.parse(await readFile(path.join(adapterDir, 'connector/mcp.json'), 'utf8'));
for (const server of Object.values(marketConfig.mcpServers)) {
  server.args = server.args.map(value => value.replace('__PACKAGE_VERSION__', manifest.version));
}

await Promise.all([
  cp(path.join(adapterDir, 'connector/connector-meta.json'), path.join(marketDir, 'connector-meta.json')),
  cp(path.join(repoDir, 'assets/cospace-icon.svg'), path.join(marketDir, 'icon.svg')),
  cp(path.join(repoDir, 'assets/cospace-icon.svg'), path.join(publicDir, 'icon.svg')),
  cp(path.join(adapterDir, 'connector/skills/space-review/SKILL.md'), path.join(marketDir, 'skills/space-review/SKILL.md')),
  cp(path.join(adapterDir, 'README.md'), path.join(outputDir, 'README.md')),
  cp(path.join(adapterDir, 'install.sh'), path.join(outputDir, 'install.sh')),
]);
await writeFile(path.join(marketDir, 'mcp.json'), `${JSON.stringify(marketConfig, null, 2)}\n`);

await writeFile(path.join(runtimeDir, 'package.json'), `${JSON.stringify({
  name: manifest.name,
  version: manifest.version,
  description: manifest.description,
  type: 'module',
  engines: manifest.engines,
  license: manifest.license,
  bin: { 'cospace-workbuddy-connector': './server.js' },
  files: ['server.js', 'public/', 'README.md', 'LICENSE'],
}, null, 2)}\n`);
await Promise.all([
  cp(path.join(adapterDir, 'npm/README.md'), path.join(runtimeDir, 'README.md')),
  cp(path.join(repoDir, 'LICENSE'), path.join(runtimeDir, 'LICENSE')),
]);
await writeFile(path.join(outputDir, 'release.json'), `${JSON.stringify({
  name: manifest.name,
  version: manifest.version,
  source: 'cospace-review',
  mcpServer: 'cospace-review',
  node: manifest.engines.node,
}, null, 2)}\n`);

const localConfig = {
  mcpServers: {
    'cospace-review-local': {
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
