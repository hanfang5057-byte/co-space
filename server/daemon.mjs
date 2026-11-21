import { promises as fs } from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'
import { ensureSyncthingBinary, run } from './platform.mjs'
import { SyncthingClient, isHealthy, waitForHealth } from './syncthing.mjs'
import { ensureHome, lockPath, runtimePath } from './config.mjs'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function freePort(host = '127.0.0.1') {
  const server = net.createServer()
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, host, resolve)
  })
  const port = server.address().port
  await new Promise(resolve => server.close(resolve))
  return port
}

async function readText(file) {
  try { return await fs.readFile(file, 'utf8') } catch (error) { if (error.code === 'ENOENT') return null; throw error }
}

function readTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([^<]*)</${tag}>`))
  return match ? match[1] : null
}

function replaceTagIn(xml, tag, value) {
  const pattern = new RegExp(`(<${tag}(?:\\s[^>]*)?>)[^<]*(</${tag}>)`)
  if (!pattern.test(xml)) return xml
  return xml.replace(pattern, `$1${value}$2`)
}

function patchConfig(xml, { guiPort, apiKey, syncPort }) {
  let next = xml
  next = next.replace(/<gui[\s\S]*?<\/gui>/, block => {
    let gui = block
    gui = replaceTagIn(gui, 'address', `127.0.0.1:${guiPort}`)
    gui = replaceTagIn(gui, 'apikey', apiKey)
    return gui
  })
  next = replaceTagIn(next, 'listenAddress', `tcp://0.0.0.0:${syncPort}`)
  next = replaceTagIn(next, 'startBrowser', 'false')
  next = replaceTagIn(next, 'autoUpgradeIntervalH', '0')
  next = replaceTagIn(next, 'urAccepted', '-1')
  next = replaceTagIn(next, 'crashReportingEnabled', 'false')
  return next
}

function guiInfo(xml) {
  const block = xml.match(/<gui[\s\S]*?<\/gui>/)?.[0] || ''
  const address = readTag(block, 'address') || ''
  const apiKey = readTag(block, 'apikey') || ''
  const port = Number(address.split(':').pop()) || 0
  return { port, apiKey, address }
}

async function configureApi(client, config) {
  try {
    await client.patchOptions({
      startBrowser: false,
      autoUpgradeIntervalH: 0,
      urAccepted: -1,
      crashReportingEnabled: false,
    })
  } catch {
    // Options are best-effort; the daemon is already usable.
  }
}

async function acquireLock(home, logger) {
  const lock = lockPath(home)
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const handle = await fs.open(lock, 'wx', 0o600)
      await handle.writeFile(JSON.stringify({ pid: process.pid, at: new Date().toISOString() }))
      await handle.close()
      return async () => { await fs.rm(lock, { force: true }).catch(() => {}) }
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
      let owner = null
      try { owner = JSON.parse(await fs.readFile(lock, 'utf8')) } catch {}
      if (owner?.pid && !isProcessAlive(owner.pid)) {
        await fs.rm(lock, { force: true }).catch(() => {})
        continue
      }
      // Another process may be starting the daemon; wait for it.
      const ready = await readRuntime(home)
      if (ready && await isHealthy(ready.baseUrl)) return async () => {}
      await sleep(250)
    }
  }
  logger.warn?.('dsh-space: runtime lock is stale; taking it over')
  await fs.rm(lock, { force: true }).catch(() => {})
  return acquireLock(home, logger)
}

function isProcessAlive(pid) {
  try { process.kill(pid, 0); return true } catch { return false }
}

function killTree(pid) {
  if (!pid) return
  try { process.kill(-pid, 'SIGTERM') } catch {
    try { process.kill(pid, 'SIGTERM') } catch {}
  }
  setTimeout(() => {
    try { process.kill(-pid, 'SIGKILL') } catch {
      try { process.kill(pid, 'SIGKILL') } catch {}
    }
  }, 2000).unref?.()
}

async function readRuntime(home) {
  try {
    const runtime = JSON.parse(await fs.readFile(runtimePath(home), 'utf8'))
    if (!runtime?.baseUrl || !runtime?.apiKey) return null
    return runtime
  } catch { return null }
}

async function writeRuntime(home, runtime) {
  const file = runtimePath(home)
  await fs.writeFile(file, JSON.stringify(runtime, null, 2), { mode: 0o600 })
  await fs.chmod(file, 0o600).catch(() => {})
}

async function tail(file, lines = 12) {
  try {
    const text = await fs.readFile(file, 'utf8')
    return text.trim().split(/\r?\n/).slice(-lines).join('\n')
  } catch { return '' }
}

async function startDaemon({ home, config, binary, logger }) {
  const daemonDir = path.join(home, 'daemon')
  const configFile = path.join(daemonDir, 'config.xml')
  await fs.mkdir(daemonDir, { recursive: true })
  await fs.mkdir(path.join(home, 'logs'), { recursive: true })

  let xml = await readText(configFile)
  if (!xml) {
    logger.info?.('dsh-space: initializing Syncthing config')
    await run(binary, ['generate', '--home', daemonDir, '--no-port-probing'])
    xml = await readText(configFile)
    if (!xml) throw Object.assign(new Error('Syncthing generate produced no config.xml'), { code: 'SYNC_UNAVAILABLE' })
  }

  const existing = guiInfo(xml)
  let guiPort = existing.port || await freePort()
  // Always verify that the configured GUI port is free for this process.
  const guiProbe = net.createServer()
  const guiAvailable = await new Promise(resolve => {
    guiProbe.once('error', () => resolve(false))
    guiProbe.listen(guiPort, '127.0.0.1', () => guiProbe.close(() => resolve(true)))
  })
  if (!guiAvailable) guiPort = await freePort()
  const apiKey = existing.apiKey || randomBytes(16).toString('hex')
  let syncPort = Number(config.syncthing.syncPort) || 22000
  const syncProbe = net.createServer()
  const syncAvailable = await new Promise(resolve => {
    syncProbe.once('error', () => resolve(false))
    syncProbe.listen(syncPort, '0.0.0.0', () => syncProbe.close(() => resolve(true)))
  })
  if (!syncAvailable) syncPort = await freePort('0.0.0.0')

  xml = patchConfig(xml, { guiPort, apiKey, syncPort })
  await fs.writeFile(configFile, xml, { mode: 0o600 })

  const logFile = path.join(home, 'logs', 'syncthing.log')
  const child = spawn(binary, [
    'serve',
    '--home', daemonDir,
    '--no-browser',
    '--no-restart',
    '--no-upgrade',
    '--log-file', logFile,
    '--log-level', 'WARN',
  ], { detached: true, stdio: 'ignore' })
  child.unref()

  const baseUrl = `http://127.0.0.1:${guiPort}`
  let client
  try {
    await waitForHealth(baseUrl, 20_000)
    client = new SyncthingClient(baseUrl, apiKey)
    await client.status()
  } catch (error) {
    const log = await tail(logFile)
    killTree(child.pid)
    throw Object.assign(new Error(`Syncthing failed to start: ${error.message}${log ? '\n' + log : ''}`), { code: 'SYNC_UNAVAILABLE' })
  }
  await configureApi(client, config)
  const runtime = {
    pid: child.pid,
    baseUrl,
    apiKey,
    guiPort,
    syncPort,
    version: config.syncthing.version || 'v2.1.7',
    startedAt: new Date().toISOString(),
  }
  await writeRuntime(home, runtime)
  return { client, runtime, started: true }
}

/** Ensure the local Syncthing daemon is running and return its client. */
export async function ensureDaemon(home, config, logger = console) {
  await ensureHome(home)
  const existing = await readRuntime(home)
  if (existing && await isHealthy(existing.baseUrl)) {
    const client = new SyncthingClient(existing.baseUrl, existing.apiKey)
    try {
      await client.status()
      return { client, runtime: existing, started: false }
    } catch {
      // fall through to restart
    }
  }

  const release = await acquireLock(home, logger)
  try {
    const raced = await readRuntime(home)
    if (raced && await isHealthy(raced.baseUrl)) {
      const client = new SyncthingClient(raced.baseUrl, raced.apiKey)
      try {
        await client.status()
        return { client, runtime: raced, started: false }
      } catch {}
    }
    const binary = await ensureSyncthingBinary(home, config, logger)
    return await startDaemon({ home, config, binary, logger })
  } finally {
    await release()
  }
}

/** Stop the daemon if this installation owns a running one. */
export async function stopDaemon(home, logger = console) {
  const runtime = await readRuntime(home)
  if (!runtime) return { stopped: false, reason: 'not-running' }
  if (!(await isHealthy(runtime.baseUrl))) {
    await fs.rm(runtimePath(home), { force: true }).catch(() => {})
    return { stopped: false, reason: 'not-running' }
  }
  const client = new SyncthingClient(runtime.baseUrl, runtime.apiKey)
  try { await client.shutdown() } catch (error) { logger.warn?.(`dsh-space: shutdown failed: ${error.message}`) }
  await sleep(500)
  await fs.rm(runtimePath(home), { force: true }).catch(() => {})
  return { stopped: true }
}

/** Return daemon health and identity. */
export async function daemonStatus(home) {
  const runtime = await readRuntime(home)
  if (!runtime) return { running: false }
  if (!(await isHealthy(runtime.baseUrl))) return { running: false, runtime }
  const client = new SyncthingClient(runtime.baseUrl, runtime.apiKey)
  try {
    const status = await client.status()
    return {
      running: true,
      pid: runtime.pid,
      baseUrl: runtime.baseUrl,
      version: status.version,
      myID: status.myID,
      uptime: status.uptime,
      guiPort: runtime.guiPort,
      syncPort: runtime.syncPort,
    }
  } catch (error) {
    return { running: false, runtime, error: error.message }
  }
}
