import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { platformTargets } from './verify-release.mjs';

const repository = process.env.GITHUB_REPOSITORY || 'hanfang5057-byte/co-space';
const supportedTargets = (process.env.COSPACE_SUPPORTED_TARGETS || 'macos-arm64,linux-x64').split(',').map(target => target.trim()).filter(Boolean);
if (supportedTargets.some(target => !platformTargets[target]) || new Set(supportedTargets).size !== supportedTargets.length) throw new Error('Invalid supported desktop targets');

const manifestPath = path.resolve(import.meta.dirname, '../../site/desktop/latest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) throw new Error('Invalid desktop manifest version');
const releasePrefix = `https://github.com/${repository}/releases/download/desktop-v${manifest.version}/`;
const keep = new Set(supportedTargets.flatMap(target => platformTargets[target]));
for (const [platform, entry] of Object.entries(manifest.platforms || {})) {
  if (typeof entry.url !== 'string' || !entry.url.startsWith(releasePrefix) || typeof entry.signature !== 'string') throw new Error(`Invalid verified manifest entry: ${platform}`);
}
const platforms = Object.fromEntries(Object.entries(manifest.platforms).filter(([platform]) => keep.has(platform)));
if (!Object.keys(platforms).length) throw new Error('No supported desktop targets remain in the manifest');
await writeFile(manifestPath, `${JSON.stringify({ ...manifest, platforms }, null, 2)}\n`);
console.log(`Generated supported desktop manifest for ${manifest.version}: ${Object.keys(platforms).join(', ')}`);
