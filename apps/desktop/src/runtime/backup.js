import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { chmod, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync, backup } from 'node:sqlite';
import { DATA_LAYOUT_VERSION, readDataLayout } from '../../../../packages/review-core/src/data-layout.js';

const markerName = 'desktop-runtime.json';

async function copyDatabase(source, destination) {
  const db = new DatabaseSync(source, { readOnly: true, timeout: 5000 });
  try { await backup(db, destination); }
  finally { db.close(); }
  await chmod(destination, 0o600);
  const copy = new DatabaseSync(destination, { readOnly: true, timeout: 5000 });
  try {
    if (copy.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw new Error('SQLite backup integrity check failed');
  } finally { copy.close(); }
}

// Called while the daemon owns the profile startup lock, before opening the
// database. The marker is committed only after the new service is healthy.
export async function backupBeforeVersionChange(dataHome, version) {
  const layout = readDataLayout(dataHome);
  if (layout > DATA_LAYOUT_VERSION) throw Object.assign(new Error('Data was created by an incompatible newer runtime'), { code: 'DATA_LAYOUT_MISMATCH' });
  const markerPath = path.join(dataHome, markerName);
  let marker;
  try { marker = JSON.parse(await readFile(markerPath, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw Object.assign(new Error('Desktop runtime marker is invalid'), { code: 'RUNTIME_MARKER_INVALID' }); }
  if (marker && (marker.schema !== 1 || typeof marker.version !== 'string')) throw Object.assign(new Error('Desktop runtime marker is invalid'), { code: 'RUNTIME_MARKER_INVALID' });
  const databases = ['review.sqlite', 'collaboration.sqlite'].filter(name => existsSync(path.join(dataHome, name)));
  if (!databases.length || marker?.version === version) return null;
  const backupRoot = path.join(dataHome, 'backups');
  await mkdir(backupRoot, { recursive: true, mode: 0o700 });
  let staging = await mkdtemp(path.join(backupRoot, '.staging-'));
  try {
    for (const name of databases) await copyDatabase(path.join(dataHome, name), path.join(staging, name));
    await writeFile(path.join(staging, 'metadata.json'), `${JSON.stringify({ schema: 1, previousVersion: marker?.version || null, targetVersion: version, dataLayoutVersion: layout, createdAt: new Date().toISOString() })}\n`, { mode: 0o600, flag: 'wx' });
    const final = path.join(backupRoot, `${Date.now()}-${randomBytes(6).toString('hex')}`);
    await rename(staging, final); staging = undefined;
    return final;
  } finally { if (staging) await rm(staging, { recursive: true, force: true }); }
}

export async function recordHealthyVersion(dataHome, version) {
  const target = path.join(dataHome, markerName);
  const temporary = `${target}.${randomBytes(6).toString('hex')}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify({ schema: 1, version })}\n`, { mode: 0o600, flag: 'wx' });
    await rename(temporary, target);
  } finally { await rm(temporary, { force: true }); }
}
