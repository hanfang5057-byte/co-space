// Sets the desktop product version across every manifest its toolchains read.
//
// Desktop packaging spans three toolchains and one runtime declaration, each
// with its own required version field:
//
//   apps/desktop/package.json                npm workspace manifest
//   apps/desktop/adapter.json                adapter capability declaration
//   apps/desktop/src-tauri/tauri.conf.json   Tauri bundle and updater identity
//   apps/desktop/src-tauri/Cargo.toml        Rust crate manifest
//   package-lock.json                        npm workspace lock record
//   apps/desktop/src-tauri/Cargo.lock        cargo crate lock record
//
// The lock records are derived data (npm install and cargo build regenerate
// them), but they are committed, so a stale record means a release was
// prepared without installing or building. This command keeps all six in
// agreement from one input; the release workflows still verify the agreement
// before creating a tag.
//
// Usage: npm run version:desktop -- X.Y.Z

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const stableVersion = /^\d+\.\d+\.\d+$/;

function findCrateVersion(text) {
  const lines = text.split('\n');
  let inPackage = false;
  for (const line of lines) {
    if (/^\[/.test(line)) {
      inPackage = /^\[package\][ \t]*$/.test(line);
      continue;
    }
    if (inPackage) {
      const match = /^version = "(.*)"$/.exec(line);
      if (match) return match[1];
    }
  }
  return null;
}

function setCrateVersion(text, version) {
  const lines = text.split('\n');
  let inPackage = false;
  let replaced = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\[/.test(line)) {
      inPackage = /^\[package\][ \t]*$/.test(line);
      continue;
    }
    if (inPackage && !replaced && /^version = ".*"$/.test(line)) {
      lines[index] = `version = "${version}"`;
      replaced = true;
    }
  }
  if (!replaced) throw new Error('Cargo.toml [package] has no version line');
  return lines.join('\n');
}

function findCrateLockVersion(text) {
  const lines = text.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index] === 'name = "cospace-desktop"') {
      for (let cursor = index + 1; cursor < lines.length && !/^\[\[/.test(lines[cursor]); cursor += 1) {
        const match = /^version = "(.*)"$/.exec(lines[cursor]);
        if (match) return match[1];
      }
    }
  }
  return null;
}

function setCrateLockVersion(text, version) {
  const lines = text.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index] === 'name = "cospace-desktop"') {
      for (let cursor = index + 1; cursor < lines.length && !/^\[\[/.test(lines[cursor]); cursor += 1) {
        if (/^version = ".*"$/.test(lines[cursor])) {
          lines[cursor] = `version = "${version}"`;
          return lines.join('\n');
        }
      }
    }
  }
  throw new Error('Cargo.lock has no cospace-desktop version entry');
}

// Replaces exactly one "version" property in place so hand-formatted JSON
// keeps its surrounding layout and version commits stay minimal.
function replaceJsonVersion(text, oldVersion, newVersion) {
  const escaped = oldVersion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const line = new RegExp(`^(\\s*)"version"\\s*:\\s*"${escaped}"(,?)$`, 'm');
  const occurrences = text.match(new RegExp(line.source, 'gm')) ?? [];
  if (occurrences.length !== 1) {
    throw new Error(`Expected exactly one "version" property for ${oldVersion}, found ${occurrences.length}`);
  }
  return text.replace(line, (_match, indent, comma) => `${indent}"version": ${JSON.stringify(newVersion)}${comma}`);
}

export async function setDesktopVersion({ root, version }) {
  if (!stableVersion.test(version)) {
    throw new Error(`Desktop versions must be stable semver: ${version}`);
  }
  const files = {
    manifest: path.join(root, 'apps/desktop/package.json'),
    adapter: path.join(root, 'apps/desktop/adapter.json'),
    tauri: path.join(root, 'apps/desktop/src-tauri/tauri.conf.json'),
    cargo: path.join(root, 'apps/desktop/src-tauri/Cargo.toml'),
    cargoLock: path.join(root, 'apps/desktop/src-tauri/Cargo.lock'),
    npmLock: path.join(root, 'package-lock.json'),
  };
  const manifestText = await readFile(files.manifest, 'utf8');
  const adapterText = await readFile(files.adapter, 'utf8');
  const tauriText = await readFile(files.tauri, 'utf8');
  const pkg = JSON.parse(manifestText);
  const adapter = JSON.parse(adapterText);
  const tauri = JSON.parse(tauriText);
  const cargo = await readFile(files.cargo, 'utf8');
  const cargoLock = await readFile(files.cargoLock, 'utf8');
  const npmLock = JSON.parse(await readFile(files.npmLock, 'utf8'));

  if (!pkg.version || !adapter.version || !tauri.version) {
    throw new Error('A desktop manifest is missing its version field; inspect the desktop manifests first');
  }
  const npmLockEntry = npmLock.packages?.['apps/desktop'];
  if (!npmLockEntry?.version) {
    throw new Error('package-lock.json has no apps/desktop version entry; run npm install and retry');
  }
  const crate = findCrateVersion(cargo);
  if (!crate) throw new Error('Cargo.toml [package] has no version line');
  const crateLock = findCrateLockVersion(cargoLock);
  if (!crateLock) throw new Error('Cargo.lock has no cospace-desktop version entry; run cargo build and retry');

  const previous = {
    'apps/desktop/package.json': pkg.version,
    'apps/desktop/adapter.json': adapter.version,
    'apps/desktop/src-tauri/tauri.conf.json': tauri.version,
    'apps/desktop/src-tauri/Cargo.toml': crate,
    'apps/desktop/src-tauri/Cargo.lock': crateLock,
    'package-lock.json': npmLockEntry.version,
  };

  // Compose every replacement text from the pre-change values before any
  // in-memory mutation, so a mid-way failure leaves every file untouched.
  const writes = [
    ['apps/desktop/package.json', files.manifest, replaceJsonVersion(manifestText, pkg.version, version)],
    ['apps/desktop/adapter.json', files.adapter, replaceJsonVersion(adapterText, adapter.version, version)],
    ['apps/desktop/src-tauri/tauri.conf.json', files.tauri, replaceJsonVersion(tauriText, tauri.version, version)],
    ['apps/desktop/src-tauri/Cargo.toml', files.cargo, setCrateVersion(cargo, version)],
    ['apps/desktop/src-tauri/Cargo.lock', files.cargoLock, setCrateLockVersion(cargoLock, version)],
    ['package-lock.json', files.npmLock, `${JSON.stringify({ ...npmLock, packages: { ...npmLock.packages, 'apps/desktop': { ...npmLockEntry, version } } }, null, 2)}\n`],
  ];
  for (const [name, target, text] of writes) {
    await writeFile(target, text);
    console.log(`${name}: ${previous[name]} -> ${version}`);
  }
  console.log('All six desktop version sources agree. Run npm run check, then commit and push to route the release.');
  return { version, previous };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const version = process.argv[2];
  try {
    if (!version) throw new Error('Usage: npm run version:desktop -- X.Y.Z');
    await setDesktopVersion({ root: repoRoot, version });
  } catch (error) {
    console.error(`set-version: ${error.message}`);
    process.exit(1);
  }
}
