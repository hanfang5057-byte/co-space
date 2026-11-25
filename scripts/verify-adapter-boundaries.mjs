import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { resolveAdapterCapabilities } from '../packages/adapter-contract/src/index.js';

const root = path.resolve(import.meta.dirname, '..');
const readJson = async file => JSON.parse(await readFile(path.join(root, file), 'utf8'));

async function sourceFiles(relative) {
  const found = [];
  async function visit(directory) {
    for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const child = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(child);
      else if (/\.(?:js|jsx|ts|tsx|css)$/.test(entry.name)) found.push(child);
    }
  }
  await visit(relative);
  return Promise.all(found.map(async file => [file, await readFile(path.join(root, file), 'utf8')]));
}

const rootManifest = await readJson('package.json');
assert.ok(rootManifest.workspaces.includes('packages/adapter-contract'), 'adapter contract must be a workspace package');
assert.ok(rootManifest.workspaces.includes('packages/host-api'), 'shared host API must be a workspace package');
assert.ok(rootManifest.workspaces.includes('apps/desktop'), 'the desktop product must be a workspace');
assert.ok(!JSON.stringify(rootManifest).toLowerCase().includes('workbuddy'), 'removed adapters must not remain in current workspace configuration');

const adapterEntries = await readdir(path.join(root, 'adapters'), { withFileTypes: true });
const adapterDirectories = adapterEntries.filter(entry => entry.isDirectory()).map(entry => entry.name);
const adapterIds = new Set();
const integrationDeclarations = [
  ...adapterDirectories.map(directory => ({ directory, file: `adapters/${directory}/adapter.json` })),
  { directory: 'desktop', file: 'apps/desktop/adapter.json' },
];
for (const { directory, file } of integrationDeclarations) {
  const declaration = await readJson(file);
  assert.equal(declaration.id, directory, `${file} id must match its adapter directory`);
  assert.ok(!adapterIds.has(declaration.id), `duplicate adapter id ${declaration.id}`);
  adapterIds.add(declaration.id);
  const resolved = resolveAdapterCapabilities(declaration, declaration.capabilities);
  assert.deepEqual([...resolved.available].sort(), [...new Set(declaration.capabilities)].sort(), `${file} declares only known contract capabilities`);
}

const boundaries = [
  ['packages/review-core/src', /(?:from\s*|import\s*\()["'][^"']*(?:adapters\/|adapter-contract|review-ui|transport-)|\b(?:Cordis|DSH|WorkBuddy|DeepSeek)\b|DSH_(?:HOME|SPACE_HOME)|\.dsh\b/i],
  ['packages/host-api/src', /(?:from\s*|import\s*\()["'][^"']*adapters\/|\b(?:Cordis|DSH|WorkBuddy|DeepSeek)\b/i],
  ['packages/transport-mcp', /(?:from\s*|import\s*\()["'][^"']*adapters\/|\b(?:Cordis|DSH|WorkBuddy|DeepSeek)\b/i],
  ['packages/transport-http', /(?:from\s*|import\s*\()["'][^"']*adapters\/|\b(?:Cordis|DSH|WorkBuddy|DeepSeek)\b/i],
  ['packages/review-ui/src', /(?:from\s*|import\s*\()["'][^"']*(?:adapters\/|transport-(?:http|mcp))|dsh-resource:|--dsw-alias-|\b(?:Cordis|DSH|WorkBuddy|DeepSeek)\b/i],
];

for (const [directory, forbidden] of boundaries) {
  for (const [file, source] of await sourceFiles(directory)) {
    assert.doesNotMatch(source, forbidden, `${file} crosses its host-neutral package boundary`);
  }
}

console.log(`Verified ${integrationDeclarations.length} integration declaration(s) and host-neutral core, service API, transports, and UI boundaries.`);
