import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import brand from '../packages/brand/metadata.json' with { type: 'json' };

const root = path.resolve(import.meta.dirname, '..');
const packageRoot = path.join(root, 'dist/dsh-plugin');
const manifest = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));

assert.equal(manifest.name, 'dsh-plugin-space');
assert.equal(manifest.description, brand.description.en);
assert.equal(manifest.private, undefined, 'the staged npm package must be publishable');
assert.equal(manifest.dsh?.bundle?.patch, './cordis.patch.yml');
for (const file of ['index.js', 'client.js', 'server/mcp-entry.js', 'cordis.patch.yml', 'icon.svg', 'locale/en.json', 'locale/zh.json']) {
  await access(path.join(packageRoot, file));
}
for (const [locale, language] of [['zh', 'zh'], ['en', 'en']]) {
  const data = JSON.parse(await readFile(path.join(packageRoot, 'locale', `${locale}.json`), 'utf8'));
  assert.equal(data.meta.title, brand.name[language]);
  assert.equal(data.meta.description, brand.description[language], 'the detail page must show the brand description');
}

const market = JSON.parse(await readFile(path.join(root, 'market/index.json'), 'utf8'));
const marketPlugin = market.plugins?.find(plugin => plugin.name === manifest.name);
assert.ok(marketPlugin, 'the market index must list the DSH plugin');
assert.deepEqual(marketPlugin.title, brand.name, 'the market title must come from the brand metadata');
assert.deepEqual(marketPlugin.description, brand.description, 'the market description must come from the brand metadata');
const [marketIcon, brandIcon] = await Promise.all([
  readFile(path.join(root, 'market', marketPlugin.icon)),
  readFile(path.join(root, brand.icon)),
]);
assert.deepEqual(marketIcon, brandIcon, 'the market icon must match the brand icon');

const bundledEntries = await Promise.all(['index.js', 'server/mcp-entry.js'].map(file => readFile(path.join(packageRoot, file), 'utf8')));
for (const source of bundledEntries) {
  assert.doesNotMatch(source, /(?:from\s*|import\s*)["'](?:\.\.?\/|(?:packages|adapters)\/)/, 'release entries must not depend on monorepo source paths');
}

const home = await mkdtemp(path.join(tmpdir(), 'space-pack-check-'));
const previousHome = process.env.DSH_SPACE_HOME;
process.env.DSH_SPACE_HOME = home;
const registrations = [];
const disposers = [];
const ctx = {
  get: () => undefined,
  inject: (_dependencies, callback) => callback(ctx),
  effect: callback => { disposers.push(callback()); },
  mcpManager: { register: (name, config) => { registrations.push({ name, config }); return () => {}; } },
  webServer: { register: route => { registrations.push({ route }); return () => {}; } },
};

try {
  const plugin = await import(pathToFileURL(path.join(packageRoot, 'index.js')).href);
  assert.equal(plugin.name, 'dsh-space');
  plugin.apply(ctx);
  assert.equal(registrations[0].name, 'space');
  assert.equal(registrations[0].config.env.DSH_SPACE_HOME, home);
  await access(registrations[0].config.args[0]);
  assert.equal(registrations[1].route.path, '/cospace-api');
} finally {
  for (const dispose of disposers.reverse()) dispose?.();
  if (previousHome === undefined) delete process.env.DSH_SPACE_HOME;
  else process.env.DSH_SPACE_HOME = previousHome;
  await rm(home, { recursive: true, force: true });
}

execFileSync(process.execPath, ['scripts/sync-market.mjs', '--check'], { cwd: root, stdio: 'inherit' });

console.log(`Verified ${manifest.name}@${manifest.version}: staged files, bundled source boundaries, plugin entry, MCP entry, and HTTP registration.`);
