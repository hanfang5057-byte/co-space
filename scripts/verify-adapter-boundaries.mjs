import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
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
assert.ok(rootManifest.workspaces.includes('apps/desktop'), 'the desktop app must be a workspace');
assert.ok(!rootManifest.workspaces.includes('apps/local-server'), 'the retired local server must not be a workspace');
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
    // Agent attribution values are persisted as review metadata; naming an
    // agent does not create a dependency on its host integration.
    const boundarySource = source
      .replace(/const\s+agentTypes\s*=\s*new\s+Set\(\[[^\]]+\]\);/, '')
      .replace(/Agent identity:\s*workbuddy,\s*claude,\s*codex,\s*deepseek,\s*or glm/gi, 'Agent identity')
      .replace(/author:\s*z\.enum\(\[[^\]]+\]\)/g, 'author')
      .replace(/\[['"]workbuddy['"],\s*['"]claude['"],\s*['"]codex['"],\s*['"]deepseek['"],\s*['"]glm['"]\]/gi, 'agentTypes')
      .replace(/'agent\.(?:workbuddy|deepseek)':\s*'(?:WorkBuddy|DeepSeek)'/g, '')
      .replace(/\.is-agent-(?:workbuddy|deepseek)/gi, '.is-agent');
    assert.doesNotMatch(boundarySource, forbidden, `${file} crosses its host-neutral package boundary`);
  }
}

// Parse import/require expressions with esbuild, including re-exports and
// dynamic imports. Resolve workspace aliases and relative paths before checking
// the allowed package graph, so spelling an edge differently cannot bypass it.
const allowed = {
  'agent-contract': [],
  'review-core': [],
  'adapter-contract': ['agent-contract'],
  'host-api': ['review-core', 'adapter-contract'],
  'review-ui': ['adapter-contract', 'brand'],
  'transport-http': [],
  'transport-mcp': ['review-core', 'agent-contract'],
  'local-runtime': ['review-core', 'host-api', 'transport-http', 'transport-mcp'],
};
const packageOf = file => {
  const match = file.replaceAll('\\', '/').match(/(?:^|\/)packages\/([^/]+)\//);
  return match?.[1];
};
for (const [name, dependencies] of Object.entries(allowed)) {
  const sources = (await sourceFiles(`packages/${name}`)).map(([file]) => file).filter(file => /\.(?:js|jsx|ts|tsx)$/.test(file) && !file.endsWith('.d.ts'));
  if (!sources.length) continue;
  const result = await build({ absWorkingDir: root, entryPoints: sources, bundle: true, write: false, outdir: '/tmp/cospace-boundary-check', metafile: true, packages: 'external', external: ['*'], logLevel: 'silent' });
  for (const [file, input] of Object.entries(result.metafile.inputs)) {
    for (const dependency of input.imports) {
      const specifier = dependency.original || dependency.path;
      const alias = specifier.match(/^@cospace\/([^/]+)/)?.[1];
      const resolved = specifier.startsWith('.') ? path.resolve(root, path.dirname(file), specifier) : '';
      const target = alias || packageOf(resolved);
      const product = resolved && path.relative(root, resolved).replaceAll('\\', '/').match(/^(?:apps|adapters)\//);
      assert.ok(!product, `${file} imports product or adapter ${specifier}`);
      if (target && target !== name) assert.ok(dependencies.includes(target), `${file} imports forbidden package ${specifier}`);
    }
  }
}

console.log(`Verified ${integrationDeclarations.length} integration declaration(s) and host-neutral core, service API, transports, and UI boundaries.`);
