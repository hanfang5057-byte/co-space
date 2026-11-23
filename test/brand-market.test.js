import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const readJson = async file => JSON.parse(await readFile(new URL(file, root), 'utf8'));

test('brand metadata drives plugin, package, and market display strings', async () => {
  const brand = await readJson('packages/brand/metadata.json');
  const manifest = await readJson('adapters/dsh/package.json');

  for (const language of ['zh', 'en']) {
    assert.ok(brand.name[language]?.length > 0, `name.${language} is required`);
    assert.ok(brand.description[language]?.length > 0, `description.${language} is required`);
  }

  // Bundle locale files carry only the detail document; title and description are injected at build time.
  for (const locale of ['zh', 'en']) {
    const data = await readJson(`adapters/dsh/locale/${locale}.json`);
    assert.equal(data.meta.title, undefined, `adapters/dsh/locale/${locale}.json must not hardcode a title`);
    assert.equal(data.meta.description, undefined, `adapters/dsh/locale/${locale}.json must not hardcode a description`);
  }

  const market = await readJson('market/index.json');
  const plugin = market.plugins?.find(entry => entry.name === manifest.name);
  assert.ok(plugin, 'market/index.json must list the DSH plugin');
  assert.deepEqual(plugin.title, brand.name, 'market title must come from the brand metadata');
  assert.deepEqual(plugin.description, brand.description, 'market description must come from the brand metadata');
  assert.ok(plugin.versions?.length > 0, 'market/index.json must keep its publish history');

  const [marketIcon, brandIcon] = await Promise.all([
    readFile(new URL(`market/${plugin.icon}`, root)),
    readFile(new URL(brand.icon, root)),
  ]);
  assert.deepEqual(marketIcon, brandIcon, 'the market icon must be a copy of the brand icon');
});
