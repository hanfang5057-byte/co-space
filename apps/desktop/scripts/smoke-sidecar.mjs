import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(appDir, '../..');
const triples = {
  darwin: { arm64: 'aarch64-apple-darwin', x64: 'x86_64-apple-darwin' },
  win32: { arm64: 'aarch64-pc-windows-msvc', x64: 'x86_64-pc-windows-msvc' },
  linux: { arm64: 'aarch64-unknown-linux-gnu', x64: 'x86_64-unknown-linux-gnu' },
};
const triple = triples[process.platform]?.[process.arch];
if (!triple) throw new Error(`Unsupported smoke target: ${process.platform}-${process.arch}`);
const tauri = path.join(appDir, 'src-tauri');
const resources = path.join(tauri, 'resources');
const runtime = path.join(tauri, 'binaries', `cospace-node-${triple}${process.platform === 'win32' ? '.exe' : ''}`);
const home = await mkdtemp(path.join(os.tmpdir(), 'cospace-desktop-smoke-'));
const source = `
  const { startWebApp } = require('./desktop/server.bundle.cjs');
  (async () => {
    const app = await startWebApp({ home: process.env.COSPACE_WEB_HOME });
    try {
      const page = await fetch(app.url);
      const html = await page.text();
      const tokenMatch = html.match(/__COSPACE_LOCAL_TOKEN__=(".*?")/);
      if (page.status !== 200 || !tokenMatch) throw new Error('Desktop page or local token missing');
      const token = JSON.parse(tokenMatch[1]);
      const denied = await fetch(new URL('/cospace-api', app.url), {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ method: 'listDocuments', args: {} }),
      });
      if (denied.status !== 403) throw new Error('API accepted a request without the local token');
      const response = await fetch(new URL('/cospace-api', app.url), {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-cospace-token': token },
        body: JSON.stringify({ method: 'listDocuments', args: {} }),
      });
      const body = await response.json();
      if (response.status !== 200 || !Array.isArray(body.result)) throw new Error('Document API smoke check failed');
      console.log(JSON.stringify({ page: page.status, unauthorized: denied.status, api: response.status }));
    } finally { await app.close(); }
  })().catch(error => { console.error(error); process.exitCode = 1; });
`;

try {
  const webResult = await new Promise((resolve, reject) => {
    const child = spawn(runtime, ['-e', source], {
      cwd: resources,
      env: { ...process.env, COSPACE_WEB_HOME: home, COSPACE_RESOURCE_DIR: resources },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => { child.kill(); reject(new Error('Packaged desktop smoke timed out')); }, 30_000);
    child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('exit', code => { clearTimeout(timeout); code === 0 ? resolve(stdout.trim()) : reject(new Error(stderr || `Packaged runtime exited with ${code}`)); });
  });
  const mcpResult = await new Promise((resolve, reject) => {
    const child = spawn(runtime, ['desktop/mcp-entry.bundle.cjs'], {
      cwd: resources,
      env: { ...process.env, COSPACE_WEB_HOME: home, COSPACE_RESOURCE_DIR: resources },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const lines = readline.createInterface({ input: child.stdout });
    let stderr = '';
    let settled = false;
    const finish = (error, response) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      lines.close();
      child.kill();
      error ? reject(error) : resolve(response);
    };
    const timeout = setTimeout(() => finish(new Error('Packaged MCP handshake timed out')), 10_000);
    child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
    child.once('error', error => finish(error));
    child.once('exit', code => finish(new Error(stderr || `Packaged MCP exited with ${code}`)));
    lines.on('line', line => {
      try {
        const message = JSON.parse(line);
        if (message.id !== 1) return;
        if (message.error || message.result?.serverInfo?.name !== 'space') throw new Error('Unexpected packaged MCP initialize response');
        finish(null, message.result.serverInfo.name);
      } catch (error) { finish(error); }
    });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'cospace-smoke', version: '1' } } })}\n`);
  });
  console.log(`Packaged runtime smoke passed: ${webResult}; MCP handshake: ${mcpResult}`);
} finally {
  await rm(home, { recursive: true, force: true });
}
