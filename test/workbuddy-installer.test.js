import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shell = readFileSync(path.join(root, 'apps/site/legacy-local/install.sh'), 'utf8');
const js = readFileSync(path.join(root, 'apps/site/legacy-local/install.cjs'), 'utf8');
const skill = readFileSync(path.join(root, 'apps/site/legacy-local/SKILL.md'), 'utf8');
const script = shell.replace('/* COSPACE_INSTALLER_SOURCE */', js.replace('/* COSPACE_SKILL_CONTENT */', JSON.stringify(skill)));

test('WorkBuddy installer does not fall back to system Node', t => {
  const home = mkdtempSync(path.join(tmpdir(), 'cospace-install-node-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(path.join(home, '.workbuddy'));
  const bin = path.join(home, 'bin');
  mkdirSync(bin);
  writeFileSync(path.join(bin, 'uname'), '#!/bin/sh\necho Darwin\n', { mode: 0o755 });
  symlinkSync(process.execPath, path.join(bin, 'node'));
  const result = spawnSync('/bin/bash', [], { input: script, encoding: 'utf8', env: { ...process.env, HOME: home, PATH: `${bin}:/usr/bin:/bin` } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /no compatible installer runtime was found in WorkBuddy/);
});

test('WorkBuddy installer installs idempotently and preserves unrelated configuration', t => {
  const home = mkdtempSync(path.join(tmpdir(), 'cospace-install-test-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const wb = path.join(home, '.workbuddy');
  const bin = path.join(wb, 'binaries/node/versions/test/bin');
  mkdirSync(bin, { recursive: true });
  symlinkSync(process.execPath, path.join(bin, 'node'));
  const mockBin = path.join(home, 'bin');
  mkdirSync(mockBin);
  writeFileSync(path.join(mockBin, 'uname'), '#!/bin/sh\necho Darwin\n', { mode: 0o755 });
  const config = path.join(wb, 'mcp.json');
  writeFileSync(config, JSON.stringify({ mcpServers: { other: { command: 'other' } } }));
  const run = () => spawnSync('bash', [], { input: script, encoding: 'utf8', env: { ...process.env, HOME: home, PATH: `${mockBin}:/usr/bin:/bin` } });
  assert.equal(run().status, 0);
  const result = JSON.parse(readFileSync(config));
  assert.deepEqual(result.mcpServers.other, { command: 'other' });
  assert.equal(result.mcpServers.cospace.runtime.version, '>=22.22.2');
  assert.equal(readFileSync(path.join(wb, 'skills/cospace-review/SKILL.md'), 'utf8'), skill);
  assert.equal(run().status, 0);
  writeFileSync(path.join(wb, 'skills/cospace-review/SKILL.md'), 'user edit');
  const before = readFileSync(config, 'utf8');
  const conflict = run();
  assert.notEqual(conflict.status, 0);
  assert.match(conflict.stderr, /Skill differs or was edited/);
  assert.equal(readFileSync(config, 'utf8'), before);
});

test('WorkBuddy installer refuses a conflicting MCP and invalid JSON', t => {
  const home = mkdtempSync(path.join(tmpdir(), 'cospace-install-conflict-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const wb = path.join(home, '.workbuddy');
  mkdirSync(wb);
  const config = path.join(wb, 'mcp.json');
  const source = js.replace('/* COSPACE_SKILL_CONTENT */', JSON.stringify(skill));
  const run = () => spawnSync(process.execPath, ['-'], { input: source, encoding: 'utf8', env: { ...process.env, HOME: home } });
  const existing = '{"mcpServers":{"cospace":{"command":"custom"}}}';
  writeFileSync(config, existing);
  assert.notEqual(run().status, 0);
  assert.equal(readFileSync(config, 'utf8'), existing);
  writeFileSync(config, '{broken');
  assert.match(run().stderr, /Invalid JSON/);
  assert.equal(readFileSync(config, 'utf8'), '{broken');
});

test('WorkBuddy installer upgrades the previous CoSpace command with managed Node runtime', t => {
  const home = mkdtempSync(path.join(tmpdir(), 'cospace-install-upgrade-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const wb = path.join(home, '.workbuddy');
  mkdirSync(wb);
  const config = path.join(wb, 'mcp.json');
  const old = { mcpServers: { cospace: { command: 'npx', args: ['-y', '@hanfang5057/co-space@latest', 'mcp'] }, other: { command: 'keep' } } };
  writeFileSync(config, JSON.stringify(old));
  const source = js.replace('/* COSPACE_SKILL_CONTENT */', JSON.stringify(skill));
  const result = spawnSync(process.execPath, ['-'], { input: source, encoding: 'utf8', env: { ...process.env, HOME: home } });
  assert.equal(result.status, 0, result.stderr);
  const updated = JSON.parse(readFileSync(config));
  assert.equal(updated.mcpServers.cospace.runtime.version, '>=22.22.2');
  assert.deepEqual(updated.mcpServers.other, { command: 'keep' });
});
