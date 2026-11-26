import { createHash, randomBytes } from 'node:crypto';
import { open, mkdir, readFile, rm, stat, writeFile, copyFile, rename, chmod } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { endpointFile, LOCAL_PROTOCOL_VERSION, resolveDataHome, resolveRuntimeHome, secretFile } from './paths.js';

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function readEndpoint(runtimeHome) {
  try { return JSON.parse(await readFile(endpointFile(runtimeHome), 'utf8')); }
  catch { return null; }
}

async function readSecrets(runtimeHome) {
  try { return JSON.parse(await readFile(secretFile(runtimeHome), 'utf8')); }
  catch { return null; }
}

export async function installRuntimeVersion({ sourceVersionHome, runtimeHome, version }) {
  if (!sourceVersionHome || !runtimeHome || !version) throw new TypeError('sourceVersionHome, runtimeHome, and version are required');
  const versionHome = path.join(runtimeHome, 'versions', version);
  const assetFiles = ['daemon.cjs', 'web/index.html', 'web/app.js', 'web/app.css'];
  const digests = async home => Object.fromEntries(await Promise.all(assetFiles.map(async name => {
    const content = await readFile(path.join(home, name));
    return [name, createHash('sha256').update(content).digest('hex')];
  })));
  const expectedHashes = await digests(sourceVersionHome);
  try {
    const marker = JSON.parse(await readFile(path.join(versionHome, 'runtime.json'), 'utf8'));
    if (marker.version === version && marker.protocolVersion === LOCAL_PROTOCOL_VERSION && JSON.stringify(marker.hashes) === JSON.stringify(expectedHashes)) {
      const installedHashes = await digests(versionHome);
      if (JSON.stringify(installedHashes) === JSON.stringify(expectedHashes)) return versionHome;
    }
    throw Object.assign(new Error(`Installed CoSpace runtime ${version} is incomplete or incompatible`), { code: 'RUNTIME_ASSETS_INVALID' });
  } catch (error) { if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error; }
  await mkdir(path.join(runtimeHome, 'versions'), { recursive: true, mode: 0o700 });
  const staging = `${versionHome}.staging-${process.pid}-${randomBytes(6).toString('hex')}`;
  await rm(staging, { recursive: true, force: true });
  await mkdir(path.join(staging, 'web'), { recursive: true, mode: 0o700 });
  await copyFile(path.join(sourceVersionHome, 'daemon.cjs'), path.join(staging, 'daemon.cjs'));
  for (const name of ['index.html', 'app.js', 'app.css']) await copyFile(path.join(sourceVersionHome, 'web', name), path.join(staging, 'web', name));
  const installedHashes = await digests(staging);
  if (JSON.stringify(installedHashes) !== JSON.stringify(expectedHashes)) {
    await rm(staging, { recursive: true, force: true });
    throw Object.assign(new Error('CoSpace runtime copy failed its integrity check'), { code: 'RUNTIME_INTEGRITY_FAILED' });
  }
  await writeFile(path.join(staging, 'runtime.json'), `${JSON.stringify({ version, protocolVersion: LOCAL_PROTOCOL_VERSION, hashes: installedHashes })}\n`, { mode: 0o600 });
  try { await rename(staging, versionHome); }
  catch (error) {
    await rm(staging, { recursive: true, force: true });
    if (error.code !== 'EEXIST' && error.code !== 'ENOTEMPTY') throw error;
    try {
      const marker = JSON.parse(await readFile(path.join(versionHome, 'runtime.json'), 'utf8'));
      if (marker.version === version && marker.protocolVersion === LOCAL_PROTOCOL_VERSION && JSON.stringify(marker.hashes) === JSON.stringify(expectedHashes)) return versionHome;
    } catch {}
    throw Object.assign(new Error(`Could not install CoSpace runtime ${version}`), { code: 'RUNTIME_INSTALL_CONFLICT' });
  }
  return versionHome;
}

async function reachableEndpoint(runtimeHome) {
  const endpoint = await readEndpoint(runtimeHome);
  if (!endpoint || endpoint.runtimeId !== path.basename(runtimeHome) || endpoint.host !== '127.0.0.1' || !Number.isInteger(endpoint.port) || endpoint.port < 1 || endpoint.port > 65535) return null;
  try {
    const response = await fetch(`http://${endpoint.host}:${endpoint.port}/__cospace/health`, { signal: AbortSignal.timeout(700) });
    const health = await response.json();
    if (!response.ok || health.ready !== true || health.runtimeId !== endpoint.runtimeId) return null;
    return { ...endpoint, version: health.version, protocolVersion: health.protocolVersion, activeMcpClients: health.activeMcpClients || 0 };
  } catch { return null; }
}

function assertCompatible(endpoint) {
  if (endpoint && endpoint.protocolVersion !== LOCAL_PROTOCOL_VERSION) {
    throw Object.assign(new Error(`CoSpace Local Server protocol ${endpoint.protocolVersion} is incompatible with this client. Stop or upgrade the service before reconnecting.`), { code: 'LOCAL_SERVER_PROTOCOL_MISMATCH' });
  }
}

export async function ensureLocalDaemon({ dataHome = resolveDataHome(), runtimeHome = resolveRuntimeHome({ dataHome }), versionHome, sourceVersionHome, version = '0.0.0', node = process.execPath, timeoutMs = 20000 } = {}) {
  if (!versionHome) versionHome = await installRuntimeVersion({ sourceVersionHome, runtimeHome, version });
  await mkdir(runtimeHome, { recursive: true, mode: 0o700 });
  await ensureSecrets(runtimeHome);
  let endpoint = await reachableEndpoint(runtimeHome);
  assertCompatible(endpoint);
  if (endpoint) {
    const secrets = await readSecrets(runtimeHome);
    if (!secrets?.rpcToken || !secrets?.uiToken) throw new Error('CoSpace service credentials are missing; stop and restart the service to recover.');
    return { ...endpoint, dataHome, runtimeHome, rpcToken: secrets.rpcToken, uiToken: secrets.uiToken };
  }

  const lockPath = path.join(runtimeHome, 'start.lock');
  const nonce = randomBytes(16).toString('hex');
  const deadline = Date.now() + timeoutMs;
  let ownsLock = false;
  while (Date.now() < deadline) {
    endpoint = await reachableEndpoint(runtimeHome);
    assertCompatible(endpoint);
    if (endpoint) {
      const secrets = await readSecrets(runtimeHome);
      if (!secrets?.rpcToken || !secrets?.uiToken) throw new Error('CoSpace service credentials are missing; stop and restart the service to recover.');
      return { ...endpoint, dataHome, runtimeHome, rpcToken: secrets.rpcToken, uiToken: secrets.uiToken };
    }
    try {
      const lock = await open(lockPath, 'wx', 0o600);
      await lock.writeFile(JSON.stringify({ pid: process.pid, nonce, startedAt: Date.now() }));
      await lock.close();
      ownsLock = true;
      break;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      let lockInfo = null;
      try { lockInfo = JSON.parse(await readFile(lockPath, 'utf8')); } catch {}
      if (lockInfo?.pid && lockInfo.pid !== process.pid) {
        try { process.kill(lockInfo.pid, 0); }
        catch {
          await rm(lockPath, { force: true });
          continue;
        }
      } else {
        const info = await stat(lockPath).catch(() => null);
        if (info && Date.now() - info.mtimeMs > timeoutMs) await rm(lockPath, { force: true });
      }
      await sleep(200);
    }
  }

  if (ownsLock) {
    const daemonPath = path.join(versionHome, 'daemon.cjs');
    const logHandle = await open(path.join(runtimeHome, 'daemon.log'), 'a', 0o600);
    try {
      const child = spawn(node, [daemonPath], {
        detached: true,
        windowsHide: true,
        stdio: ['ignore', logHandle.fd, logHandle.fd],
        env: {
          ...process.env,
          COSPACE_DATA_HOME: dataHome,
          COSPACE_RUNTIME_HOME: runtimeHome,
          COSPACE_VERSION_HOME: versionHome,
          COSPACE_PACKAGE_VERSION: version,
        },
      });
      child.unref();
    } finally { await logHandle.close(); }
  }

  while (Date.now() < deadline) {
    endpoint = await reachableEndpoint(runtimeHome);
    assertCompatible(endpoint);
    if (endpoint) {
      const secrets = await readSecrets(runtimeHome);
      if (!secrets?.rpcToken) throw new Error('CoSpace service started without an RPC credential');
      return { ...endpoint, dataHome, runtimeHome, rpcToken: secrets.rpcToken, uiToken: secrets.uiToken };
    }
    await sleep(200);
  }
  if (ownsLock) {
    try {
      const lockInfo = JSON.parse(await readFile(lockPath, 'utf8'));
      if (lockInfo.nonce === nonce) await rm(lockPath, { force: true });
    } catch {}
  }
  throw Object.assign(new Error('CoSpace Local Server did not become ready. Run `cospace-local service status` for details.'), { code: 'LOCAL_SERVER_START_TIMEOUT' });
}

export async function localServiceStatus({ dataHome = resolveDataHome(), runtimeHome = resolveRuntimeHome({ dataHome }) } = {}) {
  const endpoint = await reachableEndpoint(runtimeHome);
  return endpoint ? { running: true, compatible: endpoint.protocolVersion === LOCAL_PROTOCOL_VERSION, ...endpoint, url: `http://${endpoint.host}:${endpoint.port}/` } : { running: false, dataHome, runtimeHome };
}

export async function stopLocalDaemon({ dataHome = resolveDataHome(), runtimeHome = resolveRuntimeHome({ dataHome }), timeoutMs = 8000 } = {}) {
  const endpoint = await reachableEndpoint(runtimeHome);
  if (!endpoint) return { stopped: true, wasRunning: false };
  const secrets = await readSecrets(runtimeHome);
  const response = await fetch(`http://${endpoint.host}:${endpoint.port}/__cospace/control/stop`, {
    method: 'POST',
    headers: { 'x-cospace-rpc-token': secrets?.rpcToken || '' },
    signal: AbortSignal.timeout(1500),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw Object.assign(new Error(body.error?.message || `CoSpace service refused to stop (${response.status})`), { code: body.error?.code || 'LOCAL_SERVER_STOP_REJECTED', details: body.error?.details });
  }
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!(await reachableEndpoint(runtimeHome))) return { stopped: true, wasRunning: true };
    await sleep(150);
  }
  throw Object.assign(new Error('CoSpace Local Server did not stop before the timeout'), { code: 'LOCAL_SERVER_STOP_TIMEOUT' });
}

export async function ensureSecrets(runtimeHome, { randomBytesFn = randomBytes } = {}) {
  await mkdir(runtimeHome, { recursive: true, mode: 0o700 });
  const file = secretFile(runtimeHome);
  try {
    const secrets = JSON.parse(await readFile(file, 'utf8'));
    if (typeof secrets?.uiToken !== 'string' || typeof secrets?.rpcToken !== 'string') throw Object.assign(new Error('Invalid CoSpace credentials file'), { code: 'LOCAL_SERVER_CREDENTIALS_INVALID' });
    await chmod(file, 0o600).catch(() => {});
    return secrets;
  }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const secrets = { uiToken: randomBytesFn(32).toString('base64url'), rpcToken: randomBytesFn(32).toString('base64url') };
    try { await writeFile(file, `${JSON.stringify(secrets)}\n`, { mode: 0o600, flag: 'wx' }); }
    catch (writeError) { if (writeError.code !== 'EEXIST') throw writeError; }
    const saved = JSON.parse(await readFile(file, 'utf8'));
    if (typeof saved?.uiToken !== 'string' || typeof saved?.rpcToken !== 'string') throw Object.assign(new Error('Invalid CoSpace credentials file'), { code: 'LOCAL_SERVER_CREDENTIALS_INVALID' });
    return saved;
  }
}
