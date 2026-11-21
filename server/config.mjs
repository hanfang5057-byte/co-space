import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const DEFAULT_CONFIG = {
  spacesRoot: '',
  syncthing: {
    binary: '',
    version: 'v2.1.7',
    guiPort: 0,
    syncPort: 22000,
    downloadMirror: '',
  },
  createPersonalSpace: true,
  limits: {
    maxFileBytes: 52_428_800,
    maxTextBytes: 2_097_152,
    maxCsvRows: 1000,
  },
}

/** Resolve the plugin data root. */
export function resolveHome() {
  if (process.env.DSH_SPACE_HOME) return path.resolve(process.env.DSH_SPACE_HOME)
  const dshHome = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
  return path.join(dshHome, 'space')
}

function merge(base, extra) {
  if (extra === null || extra === undefined) return base
  if (Array.isArray(base) || typeof base !== 'object') return extra
  if (typeof extra !== 'object' || Array.isArray(extra)) return extra
  const out = { ...base }
  for (const [key, value] of Object.entries(extra)) out[key] = merge(base[key], value)
  return out
}

/** Load config.json merged over defaults. */
export async function loadConfig(home = resolveHome()) {
  let user = {}
  try {
    user = JSON.parse(await fs.readFile(path.join(home, 'config.json'), 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const config = merge(DEFAULT_CONFIG, user)
  if (!config.spacesRoot) config.spacesRoot = path.join(home, 'spaces')
  config.spacesRoot = path.resolve(config.spacesRoot)
  return config
}

/** Create the plugin data directories. */
export async function ensureHome(home = resolveHome()) {
  for (const dir of ['bin', 'daemon', 'logs', 'trash', configSpaces(home)]) {
    await fs.mkdir(path.join(home, dir), { recursive: true })
  }
}

function configSpaces(home) {
  return path.join(home, 'spaces')
}

export function runtimePath(home) {
  return path.join(home, 'runtime.json')
}

export function lockPath(home) {
  return path.join(home, 'runtime.lock')
}
