import { createHash, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { verifyRelease } from './verify-release.mjs';

const repository = process.env.GITHUB_REPOSITORY || 'hanfang5057-byte/co-space';
const tag = process.argv[2];
const verifier = process.env.COSPACE_VERIFY_UPDATE;
if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !/^desktop-v\d+\.\d+\.\d+$/.test(tag || '') || !verifier || !process.env.COSPACE_UPDATER_PUBLIC_KEY) throw new Error('A desktop release tag, update verifier, and public key are required');
const release = JSON.parse(execFileSync('gh', ['release', 'view', tag, '--repo', repository, '--json', 'tagName,isDraft,isPrerelease'], { encoding: 'utf8' }));
if (release.tagName !== tag || release.isDraft || release.isPrerelease) throw new Error('Only a published stable desktop release can be promoted');
const temporary = await mkdtemp(path.join(os.tmpdir(), 'cospace-desktop-promotion-'));
try {
  execFileSync('gh', ['release', 'download', tag, '--repo', repository, '--dir', temporary], { stdio: 'inherit' });
  const manifest = await verifyRelease({ directory: temporary, repository, verifier });
  if (`desktop-v${manifest.version}` !== tag) throw new Error('Published release and manifest versions differ');
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
    if (comparison <= 0) throw new Error('Promotion must advance the currently staged desktop version');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(path.dirname(target), { recursive: true });
  const staged = `${target}.${randomBytes(8).toString('hex')}.tmp`;
  try { await writeFile(staged, await readFile(path.join(temporary, 'latest.json')), { flag: 'wx' }); await rename(staged, target); }
  finally { await rm(staged, { force: true }); }
  console.log(`Prepared desktop update metadata for ${tag}; review and deploy the site separately.`);
} finally { await rm(temporary, { recursive: true, force: true }); }
