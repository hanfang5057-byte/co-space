import { createHash } from 'node:crypto'
import { createWriteStream, promises as fs } from 'node:fs'
import { execFile } from 'node:child_process'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const RELEASE_BASE = 'https://github.com/syncthing/syncthing/releases/download'

/** Run a short command and return stdout. */
export async function run(command, args, options = {}) {
  const { stdout, stderr } = await execFileAsync(command, args, { maxBuffer: 4 * 1024 * 1024, ...options })
  return { stdout: String(stdout || ''), stderr: String(stderr || '') }
}

async function exists(file) {
  try { await fs.access(file); return true } catch { return false }
}

function assetFor(version) {
  if (process.platform !== 'linux') {
    throw Object.assign(new Error(`DSH Space currently supports Linux only (got ${process.platform})`), { code: 'PLATFORM_UNSUPPORTED' })
  }
  const arch = process.arch === 'x64' ? 'amd64' : process.arch === 'arm64' ? 'arm64' : null
  if (!arch) throw Object.assign(new Error(`Unsupported Linux architecture: ${process.arch}`), { code: 'PLATFORM_UNSUPPORTED' })
  return `syncthing-linux-${arch}-${version}.tar.gz`
}

async function sha256File(file) {
  const hash = createHash('sha256')
  const handle = await fs.open(file, 'r')
  try {
    for await (const chunk of handle.createReadStream()) hash.update(chunk)
  } finally {
    await handle.close()
  }
  return hash.digest('hex')
}

async function verifiedChecksum(version, asset) {
  const url = `${RELEASE_BASE}/${version}/sha256sum.txt.asc`
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw Object.assign(new Error(`Cannot fetch Syncthing checksums (${response.status})`), { code: 'DOWNLOAD_FAILED' })
  const text = await response.text()
  const line = text.split(/\r?\n/).find(entry => entry.trim().endsWith(asset))
  if (!line) throw Object.assign(new Error(`Checksum for ${asset} not found`), { code: 'DOWNLOAD_FAILED' })
  return line.trim().split(/\s+/)[0]
}

async function findFile(root, name) {
  const entries = await fs.readdir(root, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(root, entry.name)
    if (entry.isFile() && entry.name === name) return full
    if (entry.isDirectory()) {
      const nested = await findFile(full, name).catch(() => null)
      if (nested) return nested
    }
  }
  return null
}

async function downloadBinary(home, config) {
  const version = config.syncthing.version || 'v2.1.7'
  const asset = assetFor(version)
  const target = path.join(home, 'bin', `syncthing-${version}`)
  if (await exists(target)) return target

  const expected = await verifiedChecksum(version, asset)
  const base = (config.syncthing.downloadMirror || RELEASE_BASE + '/' + version).replace(/\/$/, '')
  const url = `${base}/${asset}`
  const tempDir = await fs.mkdtemp(path.join(home, 'bin', '.download-'))
  const archive = path.join(tempDir, asset)
  try {
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(120000) })
    if (!response.ok || !response.body) throw new Error(`download ${url} failed: ${response.status}`)
    await pipeline(Readable.fromWeb(response.body), createWriteStream(archive, { mode: 0o600 }))
    const actual = await sha256File(archive)
    if (actual !== expected) throw new Error(`checksum mismatch for ${asset}: expected ${expected}, got ${actual}`)
    await run('tar', ['-xzf', archive, '-C', tempDir])
    const binary = await findFile(tempDir, 'syncthing')
    if (!binary) throw new Error('syncthing binary not found in archive')
    await fs.copyFile(binary, target)
    await fs.chmod(target, 0o755)
    return target
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
  }
}

function findOnPath(name) {
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (!dir) continue
    const candidate = path.join(dir, name)
    try { return candidate } catch {}
  }
  return null
}

/** Resolve (and if necessary download) the Syncthing executable. */
export async function ensureSyncthingBinary(home, config, logger = console) {
  const version = config.syncthing.version || 'v2.1.7'
  const candidates = [
    process.env.DSH_SPACE_SYNCTHING_BIN,
    config.syncthing.binary,
    findOnPath('syncthing'),
    path.join(home, 'bin', `syncthing-${version}`),
  ].filter(Boolean)
  for (const candidate of candidates) {
    if (!(await exists(candidate))) continue
    try {
      const { stdout } = await run(candidate, ['--version'])
      if (!stdout.includes(version) && !stdout.includes(version.replace(/^v/, ''))) {
        logger.warn?.(`dsh-space: ignoring ${candidate} (version mismatch: ${stdout.trim()})`)
        continue
      }
      await fs.chmod(candidate, 0o755).catch(() => {})
      return candidate
    } catch (error) {
      logger.warn?.(`dsh-space: ${candidate} is not runnable: ${error.message}`)
    }
  }
  logger.info?.('dsh-space: downloading Syncthing ' + version + '…')
  return downloadBinary(home, config)
}

export { assetFor }
