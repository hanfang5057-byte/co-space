import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const releaseFile = path.join(repoDir, 'release/npm-version.json');
const packDir = path.join(repoDir, 'dist/npm-packages');
const requestedTarget = process.argv[2] || 'all';
if (!['all', 'dsh', 'workbuddy'].includes(requestedTarget)) {
  throw new Error('Usage: node scripts/pack-npm.mjs [all|dsh|workbuddy]');
}
const readJson = async file => JSON.parse(await readFile(file, 'utf8'));
const writeJson = async (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`);

const release = await readJson(releaseFile);
const version = release.version;
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error(`Invalid shared npm release version: ${version}`);
}

const dshManifestPath = path.join(repoDir, 'adapters/dsh/package.json');
const workbuddyManifestPath = path.join(repoDir, 'adapters/workbuddy/package.json');
const dshLockPath = path.join(repoDir, 'package-lock.json');
const workbuddyLockPath = path.join(repoDir, 'adapters/workbuddy/package-lock.json');
const workbuddyMetaPath = path.join(repoDir, 'adapters/workbuddy/connector/connector-meta.json');
const [dshManifest, workbuddyManifest, dshLock, workbuddyLock, workbuddyMeta] = await Promise.all([
  readJson(dshManifestPath),
  readJson(workbuddyManifestPath),
  readJson(dshLockPath),
  readJson(workbuddyLockPath),
  readJson(workbuddyMetaPath),
]);

dshManifest.version = version;
workbuddyManifest.version = version;
dshLock.packages['adapters/dsh'].version = version;
workbuddyLock.version = version;
workbuddyLock.packages[''].version = version;
workbuddyMeta.version = version;
await Promise.all([
  writeJson(dshManifestPath, dshManifest),
  writeJson(workbuddyManifestPath, workbuddyManifest),
  writeJson(dshLockPath, dshLock),
  writeJson(workbuddyLockPath, workbuddyLock),
  writeJson(workbuddyMetaPath, workbuddyMeta),
]);

const run = (command, args) => execFileSync(command, args, { cwd: repoDir, stdio: 'inherit' });
run(process.execPath, ['scripts/build-client.mjs']);
run(process.execPath, ['scripts/build-dsh.mjs']);
run(process.execPath, ['scripts/verify-dsh-package.mjs']);
run(process.execPath, ['adapters/workbuddy/build.mjs']);
run(process.execPath, ['adapters/workbuddy/verify.mjs']);

const dshPackage = await readJson(path.join(repoDir, 'dist/dsh-plugin/package.json'));
const workbuddyPackage = await readJson(path.join(repoDir, 'dist/workbuddy-connector/runtime-package/package.json'));
const builtWorkbuddyMeta = await readJson(path.join(repoDir, 'dist/workbuddy-connector/market/connector-meta.json'));
if (dshPackage.version !== version || workbuddyPackage.version !== version || builtWorkbuddyMeta.version !== version) {
  throw new Error('Built package versions do not match the shared npm release version');
}

await mkdir(packDir, { recursive: true });
const packageArchives = {
  dsh: [`dsh-plugin-space-${version}.tgz`, './dist/dsh-plugin'],
  workbuddy: [`cospace-workbuddy-connector-${version}.tgz`, './dist/workbuddy-connector/runtime-package'],
};
const targets = requestedTarget === 'all' ? Object.keys(packageArchives) : [requestedTarget];
for (const target of targets) {
  const [name] = packageArchives[target];
  await rm(path.join(packDir, name), { force: true });
}
for (const target of targets) {
  run('npm', ['pack', packageArchives[target][1], '--pack-destination', packDir]);
}
console.log(`Packed ${targets.join(' and ')} npm release(s) at ${version} into ${packDir}`);
