/**
 * One-shot migration for 0.1.x installs. 0.2.x carries this module and removes
 * it in 0.3.0: the legacy `DSH_SPACE_HOME` override is adopted into the
 * plugin's own `Config.home` once, after which the configuration owns the data
 * directory and no environment variable is read.
 *
 * Migration never moves files. The legacy location keeps holding
 * review.sqlite; adopting writes that path into Config so the resolved home is
 * identical before and after the upgrade.
 * @module
 */
import { homedir } from 'node:os';
import path from 'node:path';

/** The data directory a fresh 0.2.x install resolves to. */
export function defaultHome() {
  return path.join(process.env.DSH_HOME || path.join(homedir(), '.dsh'), 'space');
}

/**
 * Legacy 0.1.x override. Read only while Config.home is unset; the migration
 * window below replaces it. Remove this reader together with this module in
 * 0.3.0.
 */
const legacyHome = () => {
  const value = process.env.DSH_SPACE_HOME;
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
};

const configuredHome = config => {
  const value = config?.home;
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
};

/**
 * Resolve the data directory for this activation. During the migration window
 * an unset Config falls back to the legacy environment override so the first
 * run after an upgrade opens the exact store 0.1.x used; the adoption below
 * persists the same value into Config, and later runs read Config alone.
 * @param {object} [config] - validated plugin Config.
 * @returns {string} absolute data directory.
 */
export function resolveSpaceHome(config) {
  const configured = configuredHome(config);
  if (configured) return path.resolve(configured);
  const legacy = legacyHome();
  if (legacy) return path.resolve(legacy);
  return defaultHome();
}

/**
 * Adopt the legacy override into Config. Fire-and-forget from `apply`: the
 * editor applies through the Loader path and restarts this plugin, so the
 * current activation must not block on it. Absent editor or entry keeps the
 * environment fallback for this profile instead of failing activation.
 * @param {object} ctx - host plugin context.
 * @param {object} [config] - validated plugin Config.
 * @returns {Promise<boolean>} whether a Config write was started.
 */
export async function adoptLegacyHome(ctx, config) {
  if (configuredHome(config)) return false;
  const legacy = legacyHome();
  if (!legacy) return false;
  const editor = typeof ctx.get === 'function' ? ctx.get('configEditor') : undefined;
  const entry = ctx.fiber?.entry;
  if (!editor || !entry) return false;
  const resolved = path.resolve(legacy);
  // The default location needs no adoption; Config stays unset and the
  // built-in default keeps resolving to the same store.
  if (resolved === path.resolve(defaultHome())) return false;
  try {
    await editor.edit(entry, current => ({ ...current, home: resolved }));
    return true;
  } catch (error) {
    // The environment fallback still resolves this profile; report instead of
    // blocking the upgrade.
    ctx.logger?.error?.(`dsh-space: could not persist the legacy DSH_SPACE_HOME override: ${error?.message || error}`);
    return false;
  }
}
