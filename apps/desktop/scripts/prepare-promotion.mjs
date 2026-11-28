import { createHash, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { platformTargets, verifyRelease } from './verify-release.mjs';

const repository = process.env.GITHUB_REPOSITORY || 'hanfang5057-byte/co-space';
const tag = process.argv[2];
const verifier = process.env.COSPACE_VERIFY_UPDATE;
if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !/^desktop-v\d+\.\d+\.\d+$/.test(tag || '') || !verifier || !process.env.COSPACE_UPDATER_PUBLIC_KEY) throw new Error('A desktop release tag, update verifier, and public key are required');
const release = JSON.parse(execFileSync('gh', ['release', 'view', tag, '--repo', repository, '--json', 'tagName,isDraft,isPrerelease'], { encoding: 'utf8' }));
if (release.tagName !== tag || release.isDraft || release.isPrerelease) throw new Error('Only a published stable desktop release can be promoted');
const supportedTargets = (process.env.COSPACE_SUPPORTED_TARGETS || Object.keys(platformTargets)).split(',').map(target => target.trim()).filter(Boolean);
if (!supportedTargets.length || supportedTargets.some(target => !platformTargets[target]) || new Set(supportedTargets).size !== supportedTargets.length) throw new Error('Invalid supported desktop targets');
const temporary = await mkdtemp(path.join(os.tmpdir(), 'cospace-desktop-promotion-'));
try {
  execFileSync('gh', ['release', 'download', tag, '--repo', repository, '--dir', temporary], { stdio: 'inherit' });
  const manifest = await verifyRelease({ directory: temporary, repository, verifier });
  if (`desktop-v${manifest.version}` !== tag) throw new Error('Published release and manifest versions differ');
  const supportedPlatforms = new Set(supportedTargets.flatMap(target => platformTargets[target]));
  const promotedManifest = { ...manifest, platforms: Object.fromEntries(Object.entries(manifest.platforms).filter(([platform]) => supportedPlatforms.has(platform))) };
  if (!Object.keys(promotedManifest.platforms).length) throw new Error('No supported desktop targets remain in the update manifest');
  for (const { url } of Object.values(manifest.platforms)) {
    const name = decodeURIComponent(new URL(url).pathname.split('/').pop());
    const expected = createHash('sha256').update(await readFile(path.join(temporary, name))).digest('hex');
    const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
    if (!response.ok || !response.body) throw new Error(`Published updater asset is unavailable: ${name}`);
    const hash = createHash('sha256'); let size = 0;
    for await (const chunk of response.body) { size += chunk.length; if (size > 1024 * 1024 * 1024) throw new Error('Published updater asset is too large'); hash.update(chunk); }
    if (hash.digest('hex') !== expected) throw new Error(`Published updater asset differs: ${name}`);
  }
  const target = path.resolve(import.meta.dirname, '../../site/desktop/latest.json');
  try {
    const current = JSON.parse(await readFile(target, 'utf8'));
    const parts = value => value.split('.').map(BigInt);
    const a = parts(manifest.version), b = parts(current.version);
    let comparison = 0;
    for (let i = 0; i < 3; i++) if (a[i] !== b[i]) { comparison = a[i] > b[i] ? 1 : -1; break; }
    if (comparison < 0) throw new Error('Promotion cannot roll back the currently staged desktop version');
    if (comparison === 0) {
      const existingPlatforms = Object.keys(current.platforms || {}).sort();
      const nextPlatforms = Object.keys(promotedManifest.platforms).sort();
      if (nextPlatforms.some(platform => !existingPlatforms.includes(platform))) throw new Error('A same-version promotion may only remove unsupported targets');
      if (JSON.stringify(existingPlatforms) === JSON.stringify(nextPlatforms) && nextPlatforms.some(platform => {
        const currentEntry = current.platforms[platform];
        const nextEntry = promotedManifest.platforms[platform];
        return currentEntry?.url !== nextEntry.url || currentEntry?.signature !== nextEntry.signature;
      })) throw new Error('A same-version promotion cannot change published update assets');
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(path.dirname(target), { recursive: true });
  const staged = `${target}.${randomBytes(8).toString('hex')}.tmp`;
  try { await writeFile(staged, `${JSON.stringify(promotedManifest, null, 2)}\n`, { flag: 'wx' }); await rename(staged, target); }
  finally { await rm(staged, { force: true }); }
  console.log(`Prepared supported desktop update metadata for ${tag}.`);
} finally { await rm(temporary, { recursive: true, force: true }); }
