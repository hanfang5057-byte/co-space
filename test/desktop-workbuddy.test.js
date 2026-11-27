import test from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parse } from 'jsonc-parser';
import { connectWorkBuddy } from '../apps/desktop/src/agent/workbuddy.js';
import { hasMcpServer, inspectDesktopMcp, isOwnedMcpServer } from '../apps/desktop/src/agent/agent-config.js';

async function fixture(t) {
  const homeDir = await mkdtemp(path.join(os.tmpdir(), 'cospace-desktop-agent-'));
  t.after(() => rm(homeDir, { recursive: true, force: true }));
  const root = path.join(homeDir, '.workbuddy');
  const skillSource = path.join(homeDir, 'source');
  await Promise.all([mkdir(root), mkdir(skillSource)]);
  await writeFile(path.join(skillSource, 'SKILL.md'), 'CoSpace managed skill');
  const serverConfig = { type: 'stdio', command: path.join(homeDir, 'CoSpace.AppImage'), args: ['--mcp'], env: { COSPACE_DESKTOP_HOME: path.join(homeDir, 'data'), COSPACE_DESKTOP_MCP: '1' } };
  return { homeDir, root, skillSource, serverConfig };
}

test('desktop WorkBuddy setup migrates the known npm entry and preserves other JSONC configuration', async t => {
  const f = await fixture(t);
  const file = path.join(f.root, 'mcp.json');
  const original = '{\n  // User configuration\n  "mcpServers": { "other": { "command": "custom" }, "cospace": { "command": "npx", "args": ["-y", "@hanfang5057/co-space@latest", "mcp"] } }\n}\n';
  await writeFile(file, original);
  await connectWorkBuddy(f);
  const source = await readFile(file, 'utf8');
  const config = parse(source);
  assert.match(source, /User configuration/);
  assert.equal(config.mcpServers.other.command, 'custom');
  assert.equal(config.mcpServers.cospace.command, f.serverConfig.command);
  assert.deepEqual(config.mcpServers.cospace.args, ['--mcp']);
  assert.equal(await hasMcpServer(file), true);
  const backup = (await readdir(f.root)).find(name => name.startsWith('mcp.json.cospace-backup-'));
  assert.equal(await readFile(path.join(f.root, backup), 'utf8'), original);
  await connectWorkBuddy(f);
  assert.equal(await readFile(path.join(f.root, 'skills/cospace-review/SKILL.md'), 'utf8'), 'CoSpace managed skill');
});

test('desktop WorkBuddy setup refuses conflicting configuration and user-edited skills', async t => {
  const f = await fixture(t);
  const file = path.join(f.root, 'mcp.json');
  const custom = '{"mcpServers":{"cospace":{"command":"other-server"}}}';
  await writeFile(file, custom);
  await assert.rejects(connectWorkBuddy(f), { code: 'AGENT_CONFIG_CONFLICT' });
  assert.equal(await readFile(file, 'utf8'), custom);
  await writeFile(file, '{}');
  const skill = path.join(f.root, 'skills/cospace-review');
  await mkdir(skill, { recursive: true });
  await writeFile(path.join(skill, 'SKILL.md'), 'user-edited skill');
  await assert.rejects(connectWorkBuddy(f), { code: 'SKILL_CONFLICT' });
  assert.equal(await readFile(file, 'utf8'), '{}');
  assert.equal(await readFile(path.join(skill, 'SKILL.md'), 'utf8'), 'user-edited skill');
});

test('desktop WorkBuddy setup refuses a symlinked configuration', { skip: process.platform === 'win32' }, async t => {
  const f = await fixture(t);
  const other = path.join(f.homeDir, 'other.json');
  await writeFile(other, '{}');
  await symlink(other, path.join(f.root, 'mcp.json'));
  await assert.rejects(connectWorkBuddy(f), { code: 'AGENT_SYMLINK' });
  assert.equal(await readFile(other, 'utf8'), '{}');
});

test('desktop launcher configuration is distinguishable from a foreign cospace entry', () => {
  assert.equal(isOwnedMcpServer({ command: '/home/user/CoSpace.AppImage', args: ['--mcp'], env: { COSPACE_DESKTOP_MCP: '1' } }), true);
  assert.equal(isOwnedMcpServer({ command: '/home/user/other', args: ['--mcp'] }), false);
});

test('desktop integration identifies moved launchers and legacy entries as needing repair', async t => {
  const f = await fixture(t);
  const file = path.join(f.root, 'mcp.json');
  const entry = { ...f.serverConfig }; delete entry.type;
  await writeFile(file, JSON.stringify({ mcpServers: { cospace: entry } }));
  const options = { launcher: f.serverConfig.command, dataHome: f.serverConfig.env.COSPACE_DESKTOP_HOME };
  assert.deepEqual(await inspectDesktopMcp(file, options), { configured: false, needsRepair: true, conflict: false });
  await mkdir(path.dirname(options.launcher), { recursive: true });
  await writeFile(options.launcher, 'launcher');
  await chmod(options.launcher, 0o755);
  assert.deepEqual(await inspectDesktopMcp(file, options), { configured: true, needsRepair: false, conflict: false });
  await rm(options.launcher);
  await writeFile(file, JSON.stringify({ mcpServers: { cospace: { command: 'npx', args: ['-y', '@hanfang5057/co-space@latest', 'mcp'] } } }));
  assert.equal((await inspectDesktopMcp(file, options)).needsRepair, true);
});

test('desktop integration writes the installed launcher instead of its Node sidecar path', async t => {
  const f = await fixture(t);
  const launcher = path.join(f.homeDir, 'CoSpace.AppImage');
  const source = `import { connectAgent } from ${JSON.stringify(new URL('../apps/desktop/src/agent/integration.js', import.meta.url).href)}; await connectAgent('workbuddy', { dataHome: process.env.TEST_DATA });`;
  await promisify(execFile)(process.execPath, ['--input-type=module', '-e', source], { env: { ...process.env, HOME: f.homeDir, USERPROFILE: f.homeDir, TEST_DATA: path.join(f.homeDir, 'data'), COSPACE_DESKTOP_LAUNCHER: launcher } });
  const config = parse(await readFile(path.join(f.root, 'mcp.json'), 'utf8'));
  assert.equal(config.mcpServers.cospace.command, launcher);
  assert.deepEqual(config.mcpServers.cospace.args, ['--mcp']);
  assert.equal(config.mcpServers.cospace.env.COSPACE_DESKTOP_MCP, '1');
  assert.equal(config.mcpServers.cospace.env.COSPACE_LOCAL_SERVER_DIST, undefined);
});
