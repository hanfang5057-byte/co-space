import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { execFileSync, spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(read, timeout = 20000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { try { const value = await read(); if (value) return value; } catch {} await sleep(100); }
  throw new Error('Timed out waiting for updater');
}

test('updater downloads an npm package, waits for a page, and starts the candidate', { timeout: 45000 }, async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'cospace-update-e2e-'));
  const build = path.join(temp, 'build');
  const packageDir = path.join(temp, 'package');
  const runtimeHome = path.join(temp, 'runtime');
  const dataHome = path.join(temp, 'data');
  let registry, daemon, uiToken;
  try {
    execFileSync(process.execPath, ['apps/local-server/scripts/build.mjs'], { cwd: root, env: { ...process.env, COSPACE_BUILD_OUTPUT: build }, stdio: 'ignore' });
    await mkdir(packageDir, { recursive: true });
    await cp(build, path.join(packageDir, 'dist'), { recursive: true });
    await writeFile(path.join(packageDir, 'package.json'), JSON.stringify({ name: '@hanfang5057/co-space', version: '9.0.0', engines: { node: '>=22.22.2' }, files: ['dist'] }));
    const packed = JSON.parse(execFileSync('npm', ['pack', '--ignore-scripts', '--json'], { cwd: packageDir, encoding: 'utf8' }));
    const tarball = await readFile(path.join(packageDir, packed[0].filename));
    const integrity = `sha512-${createHash('sha512').update(tarball).digest('base64')}`;
    const shasum = createHash('sha1').update(tarball).digest('hex');
    registry = createServer((req, res) => {
      if (req.url.endsWith('.tgz')) { res.writeHead(200, { 'content-type': 'application/octet-stream' }); res.end(tarball); return; }
      const manifest = { name: '@hanfang5057/co-space', version: '9.0.0', engines: { node: '>=22.22.2' }, dist: { integrity, shasum, tarball: `http://127.0.0.1:${registry.address().port}/co-space.tgz` } };
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(req.url.endsWith('/latest') ? manifest : { name: manifest.name, 'dist-tags': { latest: manifest.version }, versions: { '9.0.0': manifest } }));
    });
    await new Promise((resolve, reject) => { registry.once('error', reject); registry.listen(0, '127.0.0.1', resolve); });
    await mkdir(runtimeHome, { recursive: true });
    const oldHome = path.join(runtimeHome, 'versions', '1.0.0');
    await cp(build, oldHome, { recursive: true });
    daemon = spawn(process.execPath, [path.join(oldHome, 'daemon.cjs')], { env: { ...process.env, PATH: path.join(temp, 'no-system-tools'), COSPACE_DATA_HOME: dataHome, COSPACE_RUNTIME_HOME: runtimeHome, COSPACE_VERSION_HOME: oldHome, COSPACE_PACKAGE_VERSION: '1.0.0', COSPACE_AUTO_UPDATE: '1', COSPACE_UPDATE_CHECK_DELAY_MS: '1500', COSPACE_NPM_REGISTRY: `http://127.0.0.1:${registry.address().port}` }, stdio: 'ignore' });
    const endpoint = await waitFor(async () => JSON.parse(await readFile(path.join(runtimeHome, 'endpoint.json'), 'utf8')));
    const base = `http://${endpoint.host}:${endpoint.port}`;
    const page = await (await fetch(`${base}/`)).text();
    const id = page.match(/const id="([0-9a-f-]+)"/)?.[1];
    uiToken = page.match(/window\.__COSPACE_LOCAL_TOKEN__="([^"]+)"/)?.[1];
    assert.ok(id && uiToken);
    const waiting = await waitFor(async () => { const health = await (await fetch(`${base}/__cospace/health`)).json(); return health.update?.state === 'waiting' && health; }, 30000);
    assert.equal(waiting.update.targetVersion, '9.0.0');
    assert.equal(waiting.activeUiSessions, 1);
    assert.equal((await fetch(`${base}/__cospace/ui/session`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cospace-token': uiToken }, body: JSON.stringify({ id, action: 'close' }) })).status, 200);
    const updated = await waitFor(async () => { const current = JSON.parse(await readFile(path.join(runtimeHome, 'endpoint.json'), 'utf8')); return current.version === '9.0.0' && current; });
    assert.equal(updated.port, endpoint.port);
    assert.equal((await (await fetch(`${base}/__cospace/health`)).json()).version, '9.0.0');
  } finally {
    try {
      const endpoint = JSON.parse(await readFile(path.join(runtimeHome, 'endpoint.json'), 'utf8'));
      const secrets = JSON.parse(await readFile(path.join(runtimeHome, 'secrets.json'), 'utf8'));
      await fetch(`http://${endpoint.host}:${endpoint.port}/__cospace/control/stop`, { method: 'POST', headers: { 'x-cospace-rpc-token': secrets.rpcToken } });
    } catch {}
    if (daemon && daemon.exitCode === null && daemon.signalCode === null) daemon.kill('SIGTERM');
    if (registry) await new Promise(resolve => registry.close(resolve));
    await rm(temp, { recursive: true, force: true });
  }
});
