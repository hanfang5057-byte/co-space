import path from 'node:path';
import { startLocalService } from '../../../packages/local-runtime/src/service.js';
import { resolveDataHome, resolveRuntimeHome } from '../../../packages/local-runtime/src/paths.js';
import { mkdtemp, readFile, rm, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import os from 'node:os';
import { requestRuntimeUpgrade, installRuntimeVersion } from '../../../packages/local-runtime/src/manager.js';

async function run() {
  const dataHome = path.resolve(process.env.COSPACE_DATA_HOME || resolveDataHome());
  const runtimeHome = path.resolve(process.env.COSPACE_RUNTIME_HOME || resolveRuntimeHome({ dataHome }));
  const versionHome = path.resolve(process.env.COSPACE_VERSION_HOME || path.dirname(process.argv[1]));
  const version = process.env.COSPACE_PACKAGE_VERSION || '0.0.0';
  let updaterEnabled = process.env.COSPACE_AUTO_UPDATE === '1';
  let updateTimer = null;
  let initialUpdateCheck = null;
  let checkForUpdate;
  const enableUpdater = () => {
    if (updaterEnabled) return;
    updaterEnabled = true;
    if (checkForUpdate) void checkForUpdate();
    updateTimer = setInterval(() => { void checkForUpdate?.(); }, 6 * 60 * 60 * 1000);
    updateTimer.unref?.();
  };
  const port = Number(process.env.COSPACE_DEV_PORT || process.env.COSPACE_UPDATE_PORT || 0);
  const service = await startLocalService({ dataHome, runtimeHome, versionHome, version, port, fallbackPort: Boolean(process.env.COSPACE_UPDATE_PORT && !process.env.COSPACE_DEV_PORT), updaterEnabled, onEnableUpdater: enableUpdater, allowStopWithUi: process.env.COSPACE_DEV_ALLOW_UI_STOP === '1' });
  let checking = false;
  const npmInstall = args => new Promise((resolve, reject) => {
    const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { windowsHide: true, shell: process.platform === 'win32', stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    const timer = setTimeout(() => child.kill(), 120000);
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', code => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(stderr || `npm exited with status ${code}`));
    });
  });
  checkForUpdate = async () => {
    if (checking) return;
    checking = true;
    service.setUpdateStatus({ state: 'checking' });
    let temp;
    let phase = 'check';
    try {
      const registry = process.env.COSPACE_NPM_REGISTRY || 'https://registry.npmjs.org';
      const response = await fetch(`${registry}/@hanfang5057%2fco-space/latest`, { headers: { accept: 'application/vnd.npm.install-v1+json' }, signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`npm registry returned ${response.status}`);
      const manifest = await response.json();
      const candidate = manifest.version;
      if (!/^\d+\.\d+\.\d+$/.test(candidate)) throw new Error('Invalid registry version');
      if (candidate.localeCompare(version, 'en', { numeric: true }) <= 0) { service.setUpdateStatus({ state: 'current', checkedAt: Date.now() }); return; }
      if (!manifest.dist?.integrity?.startsWith('sha512-')) throw new Error('npm package metadata has no SHA-512 integrity');
      service.setUpdateStatus({ state: 'downloading', targetVersion: candidate });
      phase = 'download';
      temp = await mkdtemp(path.join(os.tmpdir(), 'cospace-update-'));
      await npmInstall(['install', '--engine-strict', '--ignore-scripts', '--no-audit', '--no-fund', '--registry', registry, '--prefix', temp, `@hanfang5057/co-space@${candidate}`]);
      const packageDir = path.join(temp, 'node_modules', '@hanfang5057', 'co-space');
      const source = path.join(packageDir, 'dist');
      const packageJson = JSON.parse(await readFile(path.join(packageDir, 'package.json'), 'utf8'));
      if (packageJson.name !== '@hanfang5057/co-space' || packageJson.version !== candidate || typeof packageJson.engines?.node !== 'string') throw new Error('Downloaded package metadata is invalid');
      phase = 'stage';
      await installRuntimeVersion({ sourceVersionHome: source, runtimeHome, version: candidate });
      const result = await requestRuntimeUpgrade(runtimeHome, candidate);
      if (!result.scheduled) throw new Error(`Update could not be scheduled: ${result.reason}`);
    } catch (error) { service.setUpdateStatus({ state: 'failed', reason: phase }); process.stderr.write(`CoSpace update ${phase} failed\n`); }
    finally { if (temp) await rm(temp, { recursive: true, force: true }); checking = false; }
  };
  if (updaterEnabled) {
    updateTimer = setInterval(() => { void checkForUpdate(); }, 6 * 60 * 60 * 1000);
    updateTimer.unref?.();
    const initialDelay = Number(process.env.COSPACE_UPDATE_CHECK_DELAY_MS);
    initialUpdateCheck = setTimeout(() => { void checkForUpdate(); }, Number.isFinite(initialDelay) && initialDelay > 0 ? initialDelay : 30000);
    initialUpdateCheck.unref?.();
  }
  let stopping;
  const shutdown = () => stopping ??= (async () => { if (updateTimer) clearInterval(updateTimer); if (initialUpdateCheck) clearTimeout(initialUpdateCheck); await service.close(); process.exit(0); })();
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

run().catch(error => {
  process.stderr.write(`CoSpace Local Server daemon: ${error.stack || error.message}\n`);
  process.exitCode = 1;
});
