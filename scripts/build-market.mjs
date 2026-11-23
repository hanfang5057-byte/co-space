import { copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import brand from '../packages/brand/metadata.json' with { type: 'json' };

const root = path.resolve(import.meta.dirname, '..');
const indexPath = path.join(root, 'market/index.json');
const iconName = 'cospace.svg';
const iconPath = path.join(root, 'market/icons', iconName);

const manifest = JSON.parse(await readFile(path.join(root, 'adapters/dsh/package.json'), 'utf8'));
const existing = JSON.parse(await readFile(indexPath, 'utf8'));
// Publish history and market curation stay human-owned; only brand-derived fields are regenerated.
const previous = (existing.plugins ?? []).find(plugin => plugin.name === manifest.name) ?? {};
const repositoryUrl = manifest.repository.url.replace(/^git\+/, '').replace(/\.git$/, '');
const plugin = {
  name: manifest.name,
  title: brand.name,
  description: brand.description,
  icon: `icons/${iconName}`,
  author: manifest.author,
  homepage: manifest.homepage,
  repository: { url: repositoryUrl },
  metadata: previous.metadata ?? {},
  versions: previous.versions ?? [],
};
const others = (existing.plugins ?? []).filter(candidate => candidate.name !== manifest.name);
await writeFile(indexPath, `${JSON.stringify({
  format: existing.format ?? 1,
  title: existing.title,
  description: existing.description,
  metadata: existing.metadata ?? {},
  plugins: [plugin, ...others],
}, null, 2)}\n`);
await copyFile(path.join(root, brand.icon), iconPath);
console.log(`Market index refreshed at ${indexPath} (${manifest.name} ${brand.name.en})`);
