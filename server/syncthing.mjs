/** Minimal Syncthing REST client for the local sidecar. */
export class SyncthingClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.apiKey = apiKey
  }

  async request(method, apiPath, body, timeoutMs = 15_000) {
    const headers = { 'X-Api-Key': this.apiKey }
    let payload
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      payload = JSON.stringify(body)
    }
    const response = await fetch(this.baseUrl + '/rest/' + apiPath, {
      method,
      headers,
      body: payload,
      signal: AbortSignal.timeout(timeoutMs),
    })
    const text = await response.text()
    if (!response.ok) {
      throw Object.assign(new Error(`Syncthing ${method} /rest/${apiPath} failed: ${response.status} ${text.slice(0, 300)}`), {
        code: 'SYNC_HTTP_ERROR',
        status: response.status,
      })
    }
    if (!text) return null
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }

  status() { return this.request('GET', 'system/status') }
  configFolders() { return this.request('GET', 'config/folders') }
  getFolder(id) { return this.request('GET', `config/folders/${encodeURIComponent(id)}`) }
  putFolder(folder) { return this.request('PUT', `config/folders/${encodeURIComponent(folder.id)}`, folder) }
  postFolder(folder) { return this.request('POST', 'config/folders', folder) }
  deleteFolder(id) { return this.request('DELETE', `config/folders/${encodeURIComponent(id)}`) }
  configDevices() { return this.request('GET', 'config/devices') }
  getDevice(id) { return this.request('GET', `config/devices/${encodeURIComponent(id)}`) }
  postDevice(device) { return this.request('POST', 'config/devices', device) }
  putDevice(device) { return this.request('PUT', `config/devices/${encodeURIComponent(device.deviceID)}`, device) }
  deleteDevice(id) { return this.request('DELETE', `config/devices/${encodeURIComponent(id)}`) }
  pendingDevices() { return this.request('GET', 'cluster/pending/devices') }
  pendingFolders(device) {
    return this.request('GET', 'cluster/pending/folders' + (device ? `?device=${encodeURIComponent(device)}` : ''))
  }
  connections() { return this.request('GET', 'system/connections') }
  dbStatus(folder) { return this.request('GET', `db/status?folder=${encodeURIComponent(folder)}`) }
  completion(folder, device) {
    return this.request('GET', `db/completion?folder=${encodeURIComponent(folder)}&device=${encodeURIComponent(device)}`)
  }
  scan(folder, sub) {
    const query = new URLSearchParams({ folder })
    if (sub) query.set('sub', sub)
    return this.request('POST', `db/scan?${query}`)
  }
  folderVersions(folder) { return this.request('GET', `folder/versions?folder=${encodeURIComponent(folder)}`) }
  restart() { return this.request('POST', 'system/restart') }
  shutdown() { return this.request('POST', 'system/shutdown') }
  configOptions() { return this.request('GET', 'config/options') }
  patchOptions(options) { return this.request('PATCH', 'config/options', options) }
  configGui() { return this.request('GET', 'config/gui') }
  patchGui(gui) { return this.request('PATCH', 'config/gui', gui) }
  validateDeviceId(id) { return this.request('GET', `svc/deviceid?id=${encodeURIComponent(id)}`) }
}

/** Poll an unauthenticated health endpoint. */
export async function waitForHealth(baseUrl, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs
  let last
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl + '/rest/noauth/health', { signal: AbortSignal.timeout(1500) })
      if (response.ok) return true
      last = new Error(`health ${response.status}`)
    } catch (error) {
      last = error
    }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw Object.assign(new Error(`Syncthing did not become healthy: ${last?.message || 'timeout'}`), { code: 'SYNC_UNAVAILABLE' })
}

export async function isHealthy(baseUrl) {
  try {
    const response = await fetch(baseUrl + '/rest/noauth/health', { signal: AbortSignal.timeout(1000) })
    return response.ok
  } catch {
    return false
  }
}
