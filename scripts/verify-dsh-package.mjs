import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { access, cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import brand from '../packages/brand/metadata.json' with { type: 'json' };

const root = path.resolve(import.meta.dirname, '..');
const packageRoot = path.join(root, 'dist/dsh-plugin');
const manifest = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));

assert.equal(manifest.name, 'dsh-plugin-space');
assert.equal(manifest.description, brand.description.en);
assert.equal(manifest.private, undefined, 'the staged npm package must be publishable');
assert.equal(manifest.dsh?.bundle?.patch, './cordis.patch.yml');
for (const file of ['index.js', 'client.js', 'cordis.patch.yml', 'icon.svg', 'locale/en.json', 'locale/zh.json']) {
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

const entry = await readFile(path.join(packageRoot, 'index.js'), 'utf8');
assert.doesNotMatch(entry, /(?:from\s*|import\s*)["'](?:\.\.?\/|(?:packages|adapters)\/)/, 'the release entry must not depend on monorepo source paths');
assert.doesNotMatch(entry, /(?:from\s*|import\s*)["']@cospace\//, 'the release entry must not depend on private workspace packages');
// Every top-level external must be a Node builtin or a declared dependency, so
// a real `dsh plugin add` install can resolve it from the package directory.
const entryImports = [...entry.matchAll(/^import\s+(?:[\w$,\s{}]*?\s+from\s+)?["']([^"']+)["']/gm)].map(match => match[1]);
const unresolvable = entryImports.filter(name => !name.startsWith('node:') && !Object.hasOwn(manifest.dependencies ?? {}, name));
assert.deepEqual(unresolvable, [], 'the release entry must import only Node builtins and declared dependencies');

const home = await mkdtemp(path.join(tmpdir(), 'space-pack-check-'));
const isolatedPackage = await mkdtemp(path.join(tmpdir(), 'space-package-load-'));
await writeFile(path.join(isolatedPackage, 'package.json'), '{"type":"module"}\n');
await cp(path.join(packageRoot, 'index.js'), path.join(isolatedPackage, 'index.js'));
// Mirror the dependency layout a real `dsh plugin add` install gets, so the
// load below cannot be masked by workspace node_modules. Dependencies are
// copied with their declared dependency closure.
const requireFromAdapter = createRequire(path.join(root, 'adapters/dsh/package.json'));

/** Package root of one dependency; packages that do not export their manifest are located by walking up from the resolved entry. */
const packageRootOf = name => {
  try {
    return path.dirname(requireFromAdapter.resolve(`${name}/package.json`));
  } catch {
    let directory = path.dirname(requireFromAdapter.resolve(name));
    for (;;) {
      try {
        if (JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8')).name === name) return directory;
      } catch { /* keep walking */ }
      const parent = path.dirname(directory);
      if (parent === directory) throw new Error(`cannot locate the package root of ${name}`);
      directory = parent;
    }
  }
};

const copyDependency = async name => {
  const source = packageRootOf(name);
  const manifest = JSON.parse(await readFile(path.join(source, 'package.json'), 'utf8'));
  const destination = path.join(isolatedPackage, 'node_modules', name);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true });
  for (const dependency of Object.keys(manifest.dependencies ?? {})) {
    if (dependency.startsWith('node:')) continue;
    await copyDependency(dependency);
  }
};
await copyDependency('zod');
await copyDependency('@deepseek-ai/schemastery');
const registrations = [];
const disposers = [];
const registeredTools = [];
const ctx = {
  get: () => undefined,
  inject: (_dependencies, callback) => callback(ctx),
  effect: callback => { disposers.push(callback()); },
  tools: { register: definition => { registeredTools.push(definition.name); return () => {}; } },
  webServer: { register: route => { registrations.push({ route }); return () => {}; } },
  systemPrompt: { section: () => () => {}, getSectionOrder: () => 0 },
};

try {
  const plugin = await import(pathToFileURL(path.join(isolatedPackage, 'index.js')).href);
  assert.equal(plugin.name, 'dsh-space');
  assert.ok(plugin.Config, 'the plugin declares its Config schema');
  assert.deepEqual(plugin.inject, ['tools']);
  plugin.apply(ctx, { home });
  assert.deepEqual([...registeredTools].sort(), [
    'space_comment_complete', 'space_comment_list', 'space_document_create', 'space_document_find',
    'space_document_outline', 'space_document_read', 'space_document_read_range', 'space_review_summary',
    'space_suggest', 'space_suggest_batch', 'space_suggestion_get', 'space_suggestion_list',
  ]);
  assert.equal(registrations[0].route.path, '/cospace-api');
} finally {
  for (const dispose of disposers.reverse()) dispose?.();
  await Promise.all([
    rm(home, { recursive: true, force: true }),
    rm(isolatedPackage, { recursive: true, force: true }),
  ]);
}

execFileSync(process.execPath, ['scripts/sync-market.mjs', '--check'], { cwd: root, stdio: 'inherit' });

console.log(`Verified ${manifest.name}@${manifest.version}: staged files, bundled source boundaries, native tool registration, and HTTP registration.`);
