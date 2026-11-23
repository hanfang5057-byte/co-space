import { closeSync, existsSync, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const OWNER_FILE = '.dsh-space-workbuddy-owner';
const OWNER_VALUE = 'dsh-space-workbuddy:v1\n';

function ensureDirectory(root, target) {
  const relative = path.relative(root, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('WorkBuddy data path escaped its application directory');
  let current = root;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    try {
      const stat = lstatSync(current);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('WorkBuddy data path must contain real directories only');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      mkdirSync(current, { mode: 0o700 });
    }
  }
}

function reserveOwner(home) {
  const marker = path.join(home, OWNER_FILE);
  if (existsSync(marker)) {
    const stat = lstatSync(marker);
    if (stat.isSymbolicLink() || !stat.isFile() || readFileSync(marker, 'utf8') !== OWNER_VALUE) {
      throw new Error('WorkBuddy data directory ownership check failed');
    }
    return;
  }

  const entries = readdirSync(home);
  if (entries.some(name => name !== OWNER_FILE)) throw new Error('Refusing to open an unowned, non-empty WorkBuddy data directory');
  let fd;
  try { fd = openSync(marker, 'wx', 0o600); }
  catch (error) {
    if (error.code === 'EEXIST' && readFileSync(marker, 'utf8') === OWNER_VALUE) return;
    throw error;
  }
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile()) throw new Error('WorkBuddy ownership marker is not a regular file');
    writeFileSync(fd, OWNER_VALUE, 'utf8');
  } finally {
    closeSync(fd);
  }
}

export function resolveWorkBuddySpaceHome() {
  const userHome = realpathSync(os.homedir());
  const workbuddyRoot = path.join(userHome, '.workbuddy');
  const spaceHome = path.join(workbuddyRoot, 'space');
  ensureDirectory(userHome, spaceHome);
  const canonicalHome = realpathSync(spaceHome);
  if (canonicalHome !== spaceHome) throw new Error('WorkBuddy data directory must not resolve through a symbolic link');
  reserveOwner(canonicalHome);
  const databaseFile = path.join(canonicalHome, 'review.sqlite');
  for (const file of [databaseFile, `${databaseFile}-wal`, `${databaseFile}-shm`]) {
    try {
      if (lstatSync(file).isSymbolicLink()) throw new Error('WorkBuddy database files must not be symbolic links');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return Object.freeze({ home: canonicalHome, databaseFile });
}
