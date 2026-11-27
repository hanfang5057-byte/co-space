import { randomBytes } from 'node:crypto';
import { open, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { desktopUpdateFile, endpointFile } from '../../../packages/local-runtime/src/paths.js';
import { localServiceStatus } from '../../../packages/local-runtime/src/manager.js';
import { DATA_LAYOUT_VERSION, readDataLayout } from '../../../packages/review-core/src/data-layout.js';

const fail = (code, message) => Object.assign(new Error(message), { code });

async function drainRequest(endpoint, action) {
  const response = await fetch(`${endpoint.url.replace(/\/$/, '')}/__cospace/control/drain`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-cospace-rpc-token': endpoint.rpcToken },
    body: JSON.stringify({ action }),
    signal: AbortSignal.timeout(5000),
  });
  const body = await response.json();
  if (!response.ok) throw Object.assign(new Error(body.error?.message || 'Service drain failed'), body.error);
  return body.result;
}

// The startup lock serializes marker creation with a daemon launch. The marker
// survives app exit, so an Agent cannot restart the old daemon during install.
export function createDesktopUpdateCoordinator(endpoint, version) {
  let lock;
  let ownsMarker = false;
  let active = false;
  let stopped = false;
  let ready = false;
  let beginning = false;
  const lockPath = path.join(endpoint.runtimeHome, 'start.lock');
  const markerPath = desktopUpdateFile(endpoint.runtimeHome);
  async function releaseLock() {
    if (!lock) return;
    await lock.close(); lock = undefined;
    await rm(lockPath, { force: true });
  }
  async function removeMarker() {
    if (!ownsMarker) return;
    await rm(markerPath, { force: true }); ownsMarker = false;
  }
  return {
    async begin() {
      if (active || lock || beginning) throw fail('UPDATE_IN_PROGRESS', '更新已在进行中。');
      beginning = true;
      let drainAttempted = false;
      try {
        lock = await open(lockPath, 'wx', 0o600);
        await lock.writeFile(JSON.stringify({ pid: process.pid, nonce: randomBytes(16).toString('hex'), startedAt: Date.now() }));
        const marker = await open(markerPath, 'wx', 0o600);
        ownsMarker = true;
        try { await marker.writeFile(JSON.stringify({ pid: process.pid, version, startedAt: Date.now() })); }
        finally { await marker.close(); }
        drainAttempted = true;
        const result = await drainRequest(endpoint, 'start');
        active = true;
        await releaseLock();
        return result;
      } catch (error) {
        // If the start response was lost, the daemon may already be draining.
        // Retain the marker unless cancellation is confirmed.
        let cancelled = !drainAttempted;
        if (drainAttempted) { try { await drainRequest(endpoint, 'cancel'); cancelled = true; } catch {} }
        if (cancelled) await removeMarker();
        await releaseLock();
        if (error.code === 'EEXIST') throw fail('UPDATE_IN_PROGRESS', 'CoSpace 正在启动或更新，请稍后重试。');
        throw error;
      } finally { beginning = false; }
    },
    async status() {
      if (!active || stopped) throw fail('UPDATE_NOT_STARTED', '没有正在等待的更新。');
      return drainRequest(endpoint, 'status');
    },
    async cancel() {
      if (beginning) throw fail('UPDATE_IN_PROGRESS', '更新正在准备，请稍后重试。');
      if (stopped) throw fail('UPDATE_ALREADY_STOPPED', '服务已停止，请重新打开 CoSpace 恢复。');
      if (active) await drainRequest(endpoint, 'cancel');
      active = false;
      await removeMarker(); await releaseLock();
    },
    async finish() {
      if (!active || stopped) throw fail('UPDATE_NOT_STARTED', '没有正在等待的更新。');
      await drainRequest(endpoint, 'finish');
      stopped = true;
      try {
        const deadline = Date.now() + 10000;
        while (Date.now() < deadline) {
          try { await readFile(endpointFile(endpoint.runtimeHome)); }
          catch (error) { if (error.code === 'ENOENT') { ready = true; return; } throw error; }
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        throw fail('SERVICE_STOP_TIMEOUT', '本地服务未能及时停止，更新未安装。');
      } finally {
        // Keep marker until the next app start verifies and recovers the profile.
        await releaseLock();
      }
    },
    isReady() { return ready; },
  };
}

// Only the desktop shell may recover an interrupted update. An Agent cannot
// clear the marker and must wait for the desktop app to start.
export async function recoverDesktopUpdate({ dataHome, runtimeHome, version, waitMs = 5000 }) {
  const markerPath = desktopUpdateFile(runtimeHome);
  let marker;
  try { marker = JSON.parse(await readFile(markerPath, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return false; throw fail('UPDATE_RECOVERY_REQUIRED', '更新状态无法读取，请保留数据并联系支持。'); }
  if (!Number.isInteger(marker.pid) || marker.pid <= 0 || typeof marker.version !== 'string') throw fail('UPDATE_RECOVERY_REQUIRED', '更新状态无效，请保留数据并联系支持。');
  const deadline = Date.now() + waitMs;
  while (true) {
    try { process.kill(marker.pid, 0); }
    catch (error) { if (error.code === 'ESRCH') break; throw error; }
    if (Date.now() >= deadline) throw fail('DESKTOP_UPDATE_IN_PROGRESS', '另一个 CoSpace 更新仍在进行。');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const lockPath = path.join(runtimeHome, 'start.lock');
  let lock;
  try {
    try { lock = await open(lockPath, 'wx', 0o600); }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      // A crash while publishing the marker can leave the old startup lock.
      // Never remove an unrelated or unparseable lock.
      const contents = await readFile(lockPath, 'utf8');
      let oldLock;
      try { oldLock = JSON.parse(contents); } catch { throw fail('UPDATE_RECOVERY_BUSY', '启动锁无法确认，请检查 CoSpace 状态。'); }
      if (oldLock.pid !== marker.pid || contents !== await readFile(lockPath, 'utf8')) throw fail('UPDATE_RECOVERY_BUSY', '另一个 CoSpace 正在启动。');
      await rm(lockPath);
      lock = await open(lockPath, 'wx', 0o600);
    }
    await lock.writeFile(JSON.stringify({ pid: process.pid, nonce: randomBytes(16).toString('hex'), startedAt: Date.now() }));
    if (readDataLayout(dataHome) > DATA_LAYOUT_VERSION) throw fail('DATA_LAYOUT_MISMATCH', '现有数据来自更新的版本，无法启动。');
    const current = await localServiceStatus({ dataHome, runtimeHome });
    if (current.running) {
      if (current.version !== version) throw fail('DESKTOP_SERVICE_VERSION_MISMATCH', '旧版服务仍在运行，请先断开 Agent 并停止旧服务。');
      const secrets = JSON.parse(await readFile(path.join(runtimeHome, 'secrets.json'), 'utf8'));
      await drainRequest({ ...current, rpcToken: secrets.rpcToken }, 'cancel');
    } else {
      try {
        await readFile(endpointFile(runtimeHome));
        throw fail('UPDATE_RECOVERY_UNCERTAIN', '无法确认旧服务已停止，请关闭 CoSpace 后检查。');
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    await rm(markerPath);
    return true;
  } catch (error) {
    if (error.code === 'EEXIST') throw fail('UPDATE_RECOVERY_BUSY', 'CoSpace 正在启动或恢复更新，请稍后重试。');
    throw error;
  } finally { if (lock) { await lock.close(); await rm(lockPath, { force: true }); } }
}
