import { spawn, spawnSync } from 'node:child_process';
import { access, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { reconcileLocalServiceVersion } from './reconcile-local-service.mjs';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(appDir, '../..');
const formats = { linux: 'appimage', darwin: 'app', win32: 'msi,nsis' };
const bundles = formats[process.platform];
if (!bundles) throw new Error(`Local desktop packaging is not configured for ${process.platform}`);

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this script through `npm run package:desktop:local` from the workspace root.');

const env = await resolveBuildEnvironment();
env.COSPACE_BUNDLES = bundles;
if (process.platform === 'linux' && !env.LDAI_RUNTIME_FILE) {
  const cachedRuntime = path.join(appDir, 'src-tauri/target/appimage-runtime-x86_64');
  try {
    await access(cachedRuntime);
    env.LDAI_RUNTIME_FILE = cachedRuntime;
    console.log(`Using cached AppImage runtime at ${cachedRuntime}`);
  } catch {}
}
console.log(`Building local ${process.platform} desktop package(s): ${bundles}`);

function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: repoRoot, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run([npmCli, 'run', 'prepare:tauri', '--workspace', 'apps/desktop']);
run([path.join(appDir, 'scripts/build-tauri.mjs')]);
run([path.join(appDir, 'scripts/package-release.mjs')]);
await reconcileLocalServiceVersion();
await launchLocalPackage();

async function resolveBuildEnvironment() {
  const env = { ...process.env };
  const home = os.homedir();
  const pathEntries = (env.PATH || '').split(path.delimiter).filter(Boolean);
  const cargoHomes = [env.CARGO_HOME, path.join(home, '.cargo'), '/tmp/cospace-cargo'].filter(Boolean);
  const rustupHomes = [env.RUSTUP_HOME, path.join(home, '.rustup'), '/tmp/cospace-rustup'].filter(Boolean);
  const rustBinDirs = [];
  let discoveredRustupHome;

  for (const rustupHome of [...new Set(rustupHomes)]) {
    let toolchains = [];
    try { toolchains = await readdir(path.join(rustupHome, 'toolchains')); } catch {}
    toolchains.sort((left, right) => Number(right.startsWith('stable')) - Number(left.startsWith('stable')));
    for (const toolchain of toolchains) {
      const bin = path.join(rustupHome, 'toolchains', toolchain, 'bin');
      if (await isExecutable(path.join(bin, 'cargo')) && await isExecutable(path.join(bin, 'rustc'))) {
        rustBinDirs.push(bin);
        discoveredRustupHome ||= rustupHome;
      }
    }
  }

  for (const cargoHome of [...new Set(cargoHomes)]) {
    const bin = path.join(cargoHome, 'bin');
    if (await isExecutable(path.join(bin, 'cargo'))) rustBinDirs.push(bin);
  }

  env.PATH = [...new Set([...rustBinDirs, ...pathEntries])].join(path.delimiter);
  if (!env.CARGO_HOME) {
    const cachedCargoHome = cargoHomes.find(homePath => homePath !== path.join(home, '.cargo') && pathEntries.every(entry => !entry.startsWith(path.join(homePath, 'bin'))));
    if (cachedCargoHome && await isExecutable(path.join(cachedCargoHome, 'bin', 'cargo'))) env.CARGO_HOME = cachedCargoHome;
  }
  if (!env.RUSTUP_HOME && discoveredRustupHome) env.RUSTUP_HOME = discoveredRustupHome;

  const cargo = spawnSync('cargo', ['--version'], { env, encoding: 'utf8' });
  const rustc = spawnSync('rustc', ['--version'], { env, encoding: 'utf8' });
  // Node may report EPERM from spawnSync after a sandboxed child completed
  // successfully. The exit status is authoritative when it is available.
  if (cargo.status !== 0 || rustc.status !== 0) {
    throw new Error('Rust toolchain not found. Install Rust with rustup, then reopen the terminal or run `source "$HOME/.cargo/env"`.');
  }
  console.log(`Using ${cargo.stdout.trim()} and ${rustc.stdout.trim()}`);
  return env;
}

async function isExecutable(file) {
  try { await access(file, 1); return true; } catch { return false; }
}

async function launchLocalPackage() {
  let command;
  let args;
  let launchEnv = env;
  if (process.platform === 'linux') {
    const releaseDir = path.join(repoRoot, 'dist/releases/desktop/linux');
    const appImages = (await readdir(releaseDir)).filter(name => name.endsWith('.AppImage'));
    if (appImages.length !== 1) throw new Error(`Expected one local AppImage in ${releaseDir}`);
    command = path.join(releaseDir, appImages[0]);
    args = [];
    launchEnv = { ...env, APPIMAGE_EXTRACT_AND_RUN: env.APPIMAGE_EXTRACT_AND_RUN || '1' };
  } else if (process.platform === 'darwin') {
    command = 'open';
    args = ['-W', '-n', path.join(appDir, 'src-tauri/target/release/bundle/macos/CoSpace.app')];
  } else {
    const installerDir = path.join(appDir, 'src-tauri/target/release/bundle/nsis');
    const installers = (await readdir(installerDir)).filter(name => name.toLowerCase().endsWith('.exe'));
    if (installers.length !== 1) throw new Error(`Expected one local NSIS installer in ${installerDir}`);
    command = path.join(installerDir, installers[0]);
    args = [];
    console.log('Opening the Windows installer; complete installation to launch CoSpace.');
  }

  console.log(`Launching ${path.basename(command)}`);
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: repoRoot, env: launchEnv, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0 || signal === 'SIGINT' || signal === 'SIGTERM') resolve();
      else reject(new Error(`Local desktop process exited with ${signal || code}`));
    });
  });
}
