import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Keep the retired Intel target here only so the verifier can validate legacy releases.
export const platformTargets = {
  'macos-arm64': ['darwin-aarch64-app'],
  'macos-x64': ['darwin-x86_64-app'],
  'windows-x64': ['windows-x86_64-msi', 'windows-x86_64-nsis'],
  'linux-x64': ['linux-x86_64-appimage'],
};

export async function verifyRelease({ directory, repository = 'hanfang5057-byte/co-space', verifier, verifySignature, targets }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || (!verifier && !verifySignature)) throw new Error('Repository and update verifier are required');
  if (targets !== undefined && (!Array.isArray(targets) || !targets.length || targets.some(target => !platformTargets[target]) || new Set(targets).size !== targets.length)) throw new Error('Invalid desktop release targets');
  const root = path.resolve(directory);
  const entries = await readdir(root, { withFileTypes: true });
  if (entries.some(entry => !entry.isFile())) throw new Error('Release directory must contain only files');
  const manifest = JSON.parse(await readFile(path.join(root, 'latest.json'), 'utf8'));
  const manifestPlatforms = Object.keys(manifest.platforms || {});
  const selectedTargets = targets || Object.keys(platformTargets).filter(target => platformTargets[target].every(platform => manifestPlatforms.includes(platform)));
  const platforms = selectedTargets.flatMap(target => platformTargets[target] || []);
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version) || JSON.stringify(manifestPlatforms.sort()) !== JSON.stringify([...platforms].sort())) throw new Error('Invalid release version or platform list');
  const sums = (await readFile(path.join(root, 'SHA256SUMS'), 'utf8')).trim().split('\n');
  const expected = new Map();
  for (const line of sums) {
    const match = /^([a-f0-9]{64})  ([^/\\\r\n]+)$/.exec(line);
    if (!match || expected.has(match[2])) throw new Error('Invalid checksum file');
    expected.set(match[2], match[1]);
  }
  const files = entries.map(entry => entry.name).filter(name => name !== 'SHA256SUMS').sort();
  if (JSON.stringify([...expected.keys()].sort()) !== JSON.stringify(files)) throw new Error('Release files do not match checksum list');
  for (const name of files) {
    const actual = createHash('sha256').update(await readFile(path.join(root, name))).digest('hex');
    if (actual !== expected.get(name)) throw new Error(`Checksum mismatch: ${name}`);
  }
  const prefix = `https://github.com/${repository}/releases/download/desktop-v${manifest.version}/`;
  const used = new Set();
  for (const platform of platforms) {
    const entry = manifest.platforms[platform];
    if (typeof entry?.url !== 'string' || !entry.url.startsWith(prefix)) throw new Error(`Invalid update URL: ${platform}`);
    const name = decodeURIComponent(entry.url.slice(prefix.length));
    if (!name || name !== path.basename(name) || entry.url !== `${prefix}${encodeURIComponent(name)}` || used.has(name)) throw new Error(`Invalid update artifact: ${platform}`);
    used.add(name);
    if (!expected.has(name) || !expected.has(`${name}.sig`) || (await readFile(path.join(root, `${name}.sig`), 'utf8')).trim() !== entry.signature) throw new Error(`Signature metadata mismatch: ${platform}`);
    if (verifySignature) await verifySignature(path.join(root, name), path.join(root, `${name}.sig`), manifest.version);
    else execFileSync(verifier, [path.join(root, name), path.join(root, `${name}.sig`), manifest.version], { stdio: 'inherit' });
  }
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.env.COSPACE_VERIFY_UPDATE || !process.env.COSPACE_UPDATER_PUBLIC_KEY) throw new Error('Update verifier and public key are required');
  const targets = process.env.COSPACE_RELEASE_TARGETS?.split(',').map(target => target.trim()).filter(Boolean);
  const manifest = await verifyRelease({ directory: process.argv[2], repository: process.env.GITHUB_REPOSITORY || 'hanfang5057-byte/co-space', verifier: process.env.COSPACE_VERIFY_UPDATE, targets });
  console.log(`Verified desktop release ${manifest.version}`);
}
