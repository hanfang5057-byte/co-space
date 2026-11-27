import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { DATA_LAYOUT_VERSION } from '../../review-core/src/data-layout.js';

// Version 3 removes the former npm upgrade control endpoints.
export const LOCAL_PROTOCOL_VERSION = 3;
// Increment when a runtime changes the on-disk layout incompatibly.
export const LOCAL_DATA_LAYOUT_VERSION = DATA_LAYOUT_VERSION;

export function resolveDataHome(env = process.env) {
  return path.resolve(env.COSPACE_DESKTOP_HOME || path.join(homedir(), '.cospace', 'desktop'));
}

export function resolveLegacyDataHome(env = process.env) {
  return path.resolve(env.COSPACE_WEB_HOME || path.join(homedir(), '.cospace', 'webapp'));
}

function canonicalPathIncludingMissingSegments(target) {
  const resolved = path.resolve(target);
  const missingSegments = [];
  let current = resolved;
  while (true) {
    try { return path.resolve(realpathSync.native(current), ...missingSegments); }
    catch (error) {
      if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') return resolved;
      const parent = path.dirname(current);
      if (parent === current) return resolved;
      missingSegments.unshift(path.basename(current));
      current = parent;
    }
  }
}

function appDataRoot(env, platform) {
  if (platform === 'win32') return env.LOCALAPPDATA || path.join(homedir(), 'AppData', 'Local');
  if (platform === 'darwin') return path.join(env.HOME || homedir(), 'Library', 'Application Support');
  return env.XDG_DATA_HOME || path.join(homedir(), '.local', 'share');
}

export function resolveRuntimeHome({ dataHome = resolveDataHome(), env = process.env, platform = process.platform } = {}) {
  const canonicalHome = canonicalPathIncludingMissingSegments(dataHome);
  const profile = createHash('sha256').update(canonicalHome).digest('hex').slice(0, 16);
  return path.join(appDataRoot(env, platform), 'CoSpace', 'local-server', 'profiles', profile);
}

export const endpointFile = runtimeHome => path.join(runtimeHome, 'endpoint.json');
export const secretFile = runtimeHome => path.join(runtimeHome, 'secrets.json');
export const desktopUpdateFile = runtimeHome => path.join(runtimeHome, 'desktop-update.json');
