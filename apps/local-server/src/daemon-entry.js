import path from 'node:path';
import { startLocalService } from '../../../packages/local-runtime/src/service.js';
import { resolveDataHome, resolveRuntimeHome } from '../../../packages/local-runtime/src/paths.js';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { createHash, timingSafeEqual } from 'node:crypto';
import * as tar from 'tar';
import semver from 'semver';
import { requestRuntimeUpgrade, installRuntimeVersion } from '../../../packages/local-runtime/src/manager.js';

async function run() {
  // Old supervisors automatically roll back on failure without checking the
  // data layout. Refuse their candidate before opening or migrating any data.
  if (process.env.COSPACE_UPDATE_RESULT === 'updated' && process.env.COSPACE_UPGRADE_SUPERVISOR !== 'layout-aware-v1') {
    throw Object.assign(new Error('This upgrade requires a manual service restart before data migration.'), { code: 'LOCAL_SERVER_MANUAL_RESTART_REQUIRED' });
  }
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
  const service = await startLocalService({ dataHome, runtimeHome, versionHome, version, port, fallbackPort: Boolean(process.env.COSPACE_UPDATE_PORT && !process.env.COSPACE_DEV_PORT), updaterEnabled, onEnableUpdater: enableUpdater });
  let checking = false;
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
      const tarballUrl = new URL(manifest.dist.tarball);
      const registryUrl = new URL(registry);
      if (tarballUrl.protocol !== 'https:' && !(registryUrl.protocol === 'http:' && tarballUrl.origin === registryUrl.origin && ['127.0.0.1', 'localhost', '[::1]'].includes(registryUrl.hostname))) throw new Error('Invalid tarball URL');
      const download = await fetch(tarballUrl, { signal: AbortSignal.timeout(120000), redirect: 'error' });
      if (!download.ok || !download.body) throw new Error('Package download failed');
      const chunks = []; let size = 0;
      for await (const chunk of download.body) { size += chunk.length; if (size > 50 * 1024 * 1024) throw new Error('Package exceeds size limit'); chunks.push(chunk); }
      const archive = Buffer.concat(chunks);
      const expected = Buffer.from(manifest.dist.integrity.slice(7), 'base64');
      const actual = createHash('sha512').update(archive).digest();
      if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new Error('Package integrity mismatch');
      const archivePath = path.join(temp, 'package.tgz');
      await writeFile(archivePath, archive);
      const allowed = new Set(['package/package.json', 'package/dist/package.json', 'package/dist/daemon.cjs', 'package/dist/web/index.html', 'package/dist/web/app.js', 'package/dist/web/app.css']);
      const seen = new Set(); let extractedSize = 0;
      await tar.x({ file: archivePath, cwd: temp, strict: true, filter: (name, entry) => {
        if (!allowed.has(name)) return false;
        if (entry.type !== 'File' || seen.has(name) || (extractedSize += entry.size) > 100 * 1024 * 1024) throw new Error('Invalid package entry');
        seen.add(name); return true;
      } });
      if (seen.size !== allowed.size) throw new Error('Package assets are missing');
      const packageDir = path.join(temp, 'package');
      const source = path.join(packageDir, 'dist');
      const packageJson = JSON.parse(await readFile(path.join(packageDir, 'package.json'), 'utf8'));
      if (packageJson.name !== '@hanfang5057/co-space' || packageJson.version !== candidate || typeof packageJson.engines?.node !== 'string' || !semver.satisfies(process.versions.node, packageJson.engines.node)) throw new Error('Downloaded package metadata or Node compatibility is invalid');
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
