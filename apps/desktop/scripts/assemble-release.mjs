import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const specs = [
  { target: 'macos-arm64', platform: 'darwin-aarch64-app', update: /\.app\.tar\.gz$/, installer: /\.dmg$/ },
  { target: 'windows-x64', platform: 'windows-x86_64-msi', update: /\.msi$/ },
  { target: 'windows-x64', platform: 'windows-x86_64-nsis', update: /\.exe$/ },
  { target: 'linux-x64', platform: 'linux-x86_64-appimage', update: /\.AppImage$/i, installer: /\.deb$/ },
];

async function filesIn(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await filesIn(file));
    else if (entry.isFile()) result.push(file);
    else throw new Error(`Unexpected artifact entry: ${file}`);
  }
  return result;
}

export async function assembleRelease({ input, output, version, repository = 'hanfang5057-byte/co-space', verifier, targets = [...new Set(specs.map(spec => spec.target))] }) {
  if (!/^\d+\.\d+\.\d+$/.test(version) || !/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('A stable version and valid repository are required');
  if (!Array.isArray(targets) || !targets.length || targets.some(target => !specs.some(spec => spec.target === target)) || new Set(targets).size !== targets.length) throw new Error('Invalid desktop release targets');
  const inputDir = path.resolve(input);
  const outputDir = path.resolve(output);
  if (inputDir === outputDir || inputDir.startsWith(`${outputDir}${path.sep}`) || outputDir.startsWith(`${inputDir}${path.sep}`)) throw new Error('Input and output must be separate directories');
  const filesByTarget = new Map();
  for (const target of targets) filesByTarget.set(target, await filesIn(path.join(inputDir, `cospace-desktop-${target}`)));
  const staged = new Map();
  const platforms = {};
  for (const spec of specs.filter(spec => targets.includes(spec.target))) {
    const files = filesByTarget.get(spec.target);
    const matches = files.filter(file => spec.update.test(path.basename(file)));
    if (matches.length !== 1) throw new Error(`Expected one ${spec.platform} updater artifact, found ${matches.length}`);
    const artifact = matches[0];
    const signature = `${artifact}.sig`;
    if (!files.includes(signature)) throw new Error(`Missing signature for ${spec.platform}`);
    const signatureText = (await readFile(signature, 'utf8')).trim();
    if (!signatureText || !/^[A-Za-z0-9+/=\r\n]+$/.test(signatureText)) throw new Error(`Invalid signature for ${spec.platform}`);
    if (verifier) execFileSync(verifier, [artifact, signature, version], { stdio: 'inherit' });
    const name = `${spec.target}--${path.basename(artifact)}`;
    staged.set(name, artifact);
    staged.set(`${name}.sig`, signature);
    platforms[spec.platform] = { url: `https://github.com/${repository}/releases/download/desktop-v${version}/${encodeURIComponent(name)}`, signature: signatureText };
    if (spec.installer) {
      const installers = files.filter(file => spec.installer.test(path.basename(file)));
      if (installers.length !== 1) throw new Error(`Expected one ${spec.target} installer, found ${installers.length}`);
      staged.set(`${spec.target}--${path.basename(installers[0])}`, installers[0]);
    }
  }
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  for (const [name, source] of staged) await copyFile(source, path.join(outputDir, name));
  await writeFile(path.join(outputDir, 'latest.json'), `${JSON.stringify({ version, platforms }, null, 2)}\n`);
  const names = [...staged.keys(), 'latest.json'].sort();
  const checksums = await Promise.all(names.map(async name => `${createHash('sha256').update(await readFile(path.join(outputDir, name))).digest('hex')}  ${name}`));
  await writeFile(path.join(outputDir, 'SHA256SUMS'), `${checksums.join('\n')}\n`);
  return { platforms, names };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = JSON.parse(await readFile(path.resolve(import.meta.dirname, '../package.json'), 'utf8'));
  if (process.env.COSPACE_RELEASE === '1' && (!process.env.COSPACE_VERIFY_UPDATE || !process.env.COSPACE_UPDATER_PUBLIC_KEY)) throw new Error('Release assembly requires the update verifier and public key');
  const targets = (process.env.COSPACE_RELEASE_TARGETS || [...new Set(specs.map(spec => spec.target))].join(',')).split(',').map(target => target.trim()).filter(Boolean);
  await assembleRelease({ input: process.argv[2], output: process.argv[3], version: manifest.version, repository: process.env.GITHUB_REPOSITORY || 'hanfang5057-byte/co-space', verifier: process.env.COSPACE_VERIFY_UPDATE, targets });
}
