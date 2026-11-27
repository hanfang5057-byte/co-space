import { randomBytes } from 'node:crypto';
import { lstat, mkdir, mkdtemp, open, readdir, realpath, rename, rm, chmod } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync, backup } from 'node:sqlite';
import { endpointFile, resolveRuntimeHome } from '../../../packages/local-runtime/src/paths.js';
import { DATA_LAYOUT_VERSION, readDataLayout } from '../../../packages/review-core/src/data-layout.js';

const databases = ['review.sqlite', 'collaboration.sqlite'];
const allowedFiles = new Set(databases.flatMap(name => [name, `${name}-wal`, `${name}-shm`]));
const fail = (code, message) => Object.assign(new Error(message), { code });

async function exists(file) {
  try { await lstat(file); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

async function canonicalDestination(target) {
  let current = path.resolve(target);
  const missing = [];
  while (true) {
    try { return path.join(await realpath(current), ...missing); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const parent = path.dirname(current);
      if (parent === current) throw error;
      missing.unshift(path.basename(current));
      current = parent;
    }
  }
}

async function acquireProfileLock(runtimeHome) {
  await mkdir(runtimeHome, { recursive: true, mode: 0o700 });
  const lockPath = path.join(runtimeHome, 'start.lock');
  let lock;
  try { lock = await open(lockPath, 'wx', 0o600); }
  catch (error) {
    if (error.code === 'EEXIST') throw fail('PROFILE_BUSY', 'CoSpace 正在启动或迁移，请关闭相关服务后重试。');
    throw error;
  }
  try {
    await lock.writeFile(JSON.stringify({ pid: process.pid, nonce: randomBytes(16).toString('hex'), startedAt: Date.now() }));
    if (await exists(endpointFile(runtimeHome))) throw fail('PROFILE_BUSY', '请先关闭旧服务和所有 Agent，再重试迁移。');
  } catch (error) {
    await lock.close();
    await rm(lockPath, { force: true });
    throw error;
  }
  return async () => { await lock.close(); await rm(lockPath, { force: true }); };
}

function summary(db) {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  return Object.fromEntries(tables.map(({ name }) => [name, db.prepare(`SELECT count(*) AS count FROM "${name.replaceAll('"', '""')}"`).get().count]));
}

async function copyDatabase(source, destination) {
  const db = new DatabaseSync(source, { readOnly: true, timeout: 5000 });
  try {
    await backup(db, destination);
    await chmod(destination, 0o600);
    const copy = new DatabaseSync(destination, { readOnly: true, timeout: 5000 });
    try {
      if (copy.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw fail('BACKUP_INVALID', '备份数据库完整性检查失败。');
      if (JSON.stringify(summary(db)) !== JSON.stringify(summary(copy))) throw fail('SOURCE_CHANGED', '旧数据在备份期间发生变化，请关闭旧服务后重试。');
    } finally { copy.close(); }
  } finally { db.close(); }
}

// Called only after explicit user confirmation, before either profile starts.
// Existing destination data and all source files are retained on failure.
export async function migrateLocalProfile({ sourceHome, destinationHome, env = process.env, platform = process.platform }) {
  const source = await realpath(path.resolve(sourceHome));
  const destination = await canonicalDestination(destinationHome);
  if (source === destination || source.startsWith(`${destination}${path.sep}`) || destination.startsWith(`${source}${path.sep}`)) throw fail('INVALID_DESTINATION', '新旧数据目录不能相同或互相包含。');
  const parent = path.dirname(destination);
  await mkdir(parent, { recursive: true, mode: 0o700 });
  const sourceRuntime = resolveRuntimeHome({ dataHome: source, env, platform });
  const destinationRuntime = resolveRuntimeHome({ dataHome: destination, env, platform });
  const releaseLocks = [];
  let staging;
  try {
    for (const runtime of [sourceRuntime, destinationRuntime].sort()) releaseLocks.push(await acquireProfileLock(runtime));
    if (await exists(destination)) throw fail('DESTINATION_EXISTS', '桌面数据目录已存在，未覆盖现有数据。');
    const entries = await readdir(source, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !allowedFiles.has(entry.name)) throw fail('UNSUPPORTED_SOURCE_FILE', `旧数据目录包含未识别的项目：${entry.name}`);
    }
    if (!entries.some(entry => entry.name === 'review.sqlite')) throw fail('SOURCE_NOT_FOUND', '旧数据目录中没有 review.sqlite。');
    staging = await mkdtemp(path.join(await realpath(parent), '.cospace-migration-'));
    for (const name of databases) if (entries.some(entry => entry.name === name)) await copyDatabase(path.join(source, name), path.join(staging, name));
    if (readDataLayout(staging) > DATA_LAYOUT_VERSION) throw fail('DATA_LAYOUT_MISMATCH', '旧数据来自不兼容的新版本，未进行导入。');
    if (await exists(destination)) throw fail('DESTINATION_EXISTS', '桌面数据目录已存在，未覆盖现有数据。');
    await rename(staging, destination);
    staging = undefined;
    return { source, destination };
  } finally {
    if (staging) await rm(staging, { recursive: true, force: true });
    for (const release of releaseLocks.reverse()) await release();
  }
}
