import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const adapterDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const installer = path.join(adapterDir, 'install.sh');

function setupHome() {
  const home = mkdtempSync(path.join(os.tmpdir(), 'cospace-installer-'));
  const config = path.join(home, '.workbuddy', 'mcp.json');
  const data = path.join(home, '.workbuddy', 'space');
  mkdirSync(path.dirname(config), { recursive: true });
  mkdirSync(data, { recursive: true });
  writeFileSync(config, `${JSON.stringify({ mcpServers: { existing: { command: 'kept-command', args: [] } } }, null, 2)}\n`);
  writeFileSync(path.join(data, '.cospace-workbuddy-owner'), 'cospace:workbuddy:v1\n');
  writeFileSync(path.join(data, 'review.sqlite'), 'test user data');
  const env = {
    ...process.env,
    HOME: home,
    XDG_DATA_HOME: path.join(home, '.local', 'share'),
    WORKBUDDY_CONFIG: config,
    COSPACE_WORKBUDDY_DATA: data,
  };
  return { home, config, data, env };
}

function run(home, env, ...args) {
  const result = spawnSync('bash', [installer, ...args], { cwd: home, env, encoding: 'utf8' });
  return result;
}

test('installer adds, updates, and removes only its MCP entry while preserving user data', () => {
  const fixture = setupHome();
  try {
    let result = run(fixture.home, fixture.env, 'install', '--version', '0.1.0');
    assert.equal(result.status, 0, result.stderr);
    let config = JSON.parse(readFileSync(fixture.config, 'utf8'));
    assert.equal(config.mcpServers.existing.command, 'kept-command');
    assert.deepEqual(config.mcpServers['cospace-review'], {
      type: 'stdio',
      command: 'npx',
      args: ['-y', 'cospace-workbuddy-connector@0.1.0'],
      timeout: 30000,
      runtime: { type: 'node', version: '>=24.0.0' },
    });
    assert.equal((readFileSync(fixture.config).length > 0), true);

    result = run(fixture.home, fixture.env, 'update', '--version', '0.1.1');
    assert.equal(result.status, 0, result.stderr);
    config = JSON.parse(readFileSync(fixture.config, 'utf8'));
    assert.equal(config.mcpServers['cospace-review'].args[1], 'cospace-workbuddy-connector@0.1.1');
    assert.equal(readdirSync(path.dirname(fixture.config)).some(name => name.includes('.cospace-backup-')), true);

    result = run(fixture.home, fixture.env, 'uninstall');
    assert.equal(result.status, 0, result.stderr);
    config = JSON.parse(readFileSync(fixture.config, 'utf8'));
    assert.deepEqual(Object.keys(config.mcpServers), ['existing']);
    assert.equal(readFileSync(path.join(fixture.data, 'review.sqlite'), 'utf8'), 'test user data');
  } finally {
    rmSync(fixture.home, { recursive: true, force: true });
  }
});

test('installer purges only marked CoSpace data when explicitly requested', () => {
  const fixture = setupHome();
  try {
    const install = run(fixture.home, fixture.env, 'install', '--version', '0.1.0');
    assert.equal(install.status, 0, install.stderr);
    const uninstall = run(fixture.home, fixture.env, 'uninstall', '--purge-data', '--yes');
    assert.equal(uninstall.status, 0, uninstall.stderr);
    assert.equal(pathExists(fixture.data), false);
    assert.equal(JSON.parse(readFileSync(fixture.config, 'utf8')).mcpServers.existing.command, 'kept-command');
  } finally {
    rmSync(fixture.home, { recursive: true, force: true });
  }
});

test('installer refuses to adopt an existing unmanaged entry', () => {
  const fixture = setupHome();
  try {
    const config = JSON.parse(readFileSync(fixture.config, 'utf8'));
    config.mcpServers['cospace-review'] = { command: 'user-owned', args: [] };
    writeFileSync(fixture.config, `${JSON.stringify(config, null, 2)}\n`);
    const result = run(fixture.home, fixture.env, 'install', '--version', '0.1.0');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /not managed by this installer/);
    assert.equal(JSON.parse(readFileSync(fixture.config, 'utf8')).mcpServers['cospace-review'].command, 'user-owned');
  } finally {
    rmSync(fixture.home, { recursive: true, force: true });
  }
});

function pathExists(pathname) {
  return existsSync(pathname);
}
