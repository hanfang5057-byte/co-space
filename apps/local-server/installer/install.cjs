const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const skill = /* COSPACE_SKILL_CONTENT */;
const home = process.env.HOME;
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--agent' || args[1] !== 'workbuddy')) {
  console.error('CoSpace: supported option: --agent workbuddy');
  process.exit(1);
}
const root = path.join(home, '.workbuddy');
const configPath = path.join(root, 'mcp.json');
const skillDir = path.join(root, 'skills', 'cospace-review');
const skillPath = path.join(skillDir, 'SKILL.md');
const markerPath = path.join(skillDir, '.cospace-install.json');
const server = { command: 'npx', args: ['-y', '@hanfang5057/co-space@latest', 'mcp'], runtime: { type: 'node', version: '>=22.22.2' } };
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function readOptional(file) { try { return fs.readFileSync(file); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } }
function parse(data, file) { try { return JSON.parse(data.toString()); } catch { throw new Error(`Invalid JSON in ${file}; nothing was changed.`); } }
function atomicWrite(file, content, mode = 0o600) {
  const temp = path.join(path.dirname(file), `.${path.basename(file)}.${crypto.randomBytes(8).toString('hex')}.tmp`);
  try { fs.writeFileSync(temp, content, { mode, flag: 'wx' }); fs.renameSync(temp, file); }
  finally { try { fs.unlinkSync(temp); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
}
try {
  if (!fs.statSync(root).isDirectory()) throw new Error('WorkBuddy directory not found.');
  for (const file of [configPath, path.join(root, 'skills'), skillDir, skillPath, markerPath]) {
    try { if (fs.lstatSync(file).isSymbolicLink()) throw new Error(`Refusing to modify symbolic link: ${file}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const beforeConfig = readOptional(configPath);
  const config = beforeConfig ? parse(beforeConfig, configPath) : {};
  if (!config || typeof config !== 'object' || Array.isArray(config) || (config.mcpServers !== undefined && (!config.mcpServers || typeof config.mcpServers !== 'object' || Array.isArray(config.mcpServers)))) throw new Error('Invalid WorkBuddy MCP configuration; nothing was changed.');
  const previousServer = config.mcpServers?.cospace;
  if (previousServer) {
    const sameCommand = previousServer.command === server.command && equal(previousServer.args, server.args);
    const sameRuntime = previousServer.runtime === undefined || equal(previousServer.runtime, server.runtime);
    if (!sameCommand || !sameRuntime) throw new Error('Existing cospace MCP configuration differs; nothing was changed. Review it before replacing it.');
  }
  const beforeSkill = readOptional(skillPath);
  const beforeMarker = readOptional(markerPath);
  const marker = beforeMarker ? parse(beforeMarker, markerPath) : null;
  if (beforeSkill && beforeSkill.toString() !== skill && (!marker || marker.sha256 !== digest(beforeSkill))) throw new Error('Existing cospace-review Skill differs or was edited; nothing was changed. Review it before replacing it.');
  if (!beforeSkill && beforeMarker) throw new Error('Incomplete existing Skill installation; nothing was changed.');
  if (fs.existsSync(skillDir) && !beforeSkill && fs.readdirSync(skillDir).length) throw new Error('Existing cospace-review directory is not empty; nothing was changed.');
  config.mcpServers ||= {};
  config.mcpServers.cospace = server;
  const configContent = `${JSON.stringify(config, null, 2)}\n`;
  const markerContent = `${JSON.stringify({ schema: 1, sha256: digest(skill) }, null, 2)}\n`;
  const originalMode = beforeConfig ? fs.statSync(configPath).mode & 0o777 : 0o600;
  fs.mkdirSync(skillDir, { recursive: true });
  let skillWritten = false, markerWritten = false;
  try {
    if (!beforeSkill || beforeSkill.toString() !== skill) { atomicWrite(skillPath, skill); skillWritten = true; }
    if (!beforeMarker || beforeMarker.toString() !== markerContent) { atomicWrite(markerPath, markerContent); markerWritten = true; }
    const nowConfig = readOptional(configPath);
    if ((beforeConfig === null) !== (nowConfig === null) || (beforeConfig && !beforeConfig.equals(nowConfig))) throw new Error('MCP configuration changed during installation; retry.');
    if (!beforeConfig || beforeConfig.toString() !== configContent) {
      if (beforeConfig) {
        const backup = `${configPath}.cospace-backup-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        fs.writeFileSync(backup, beforeConfig, { mode: originalMode, flag: 'wx' });
        console.log(`CoSpace: original MCP configuration backed up to ${backup}`);
      }
      atomicWrite(configPath, configContent, originalMode);
    }
  } catch (error) {
    for (const [written, file, before] of [[markerWritten, markerPath, beforeMarker], [skillWritten, skillPath, beforeSkill]]) {
      if (!written) continue;
      try { if (before) atomicWrite(file, before); else fs.unlinkSync(file); } catch (rollback) { console.error(`CoSpace: could not restore ${file}: ${rollback.message}`); }
    }
    throw error;
  }
  console.log('CoSpace: WorkBuddy MCP configuration and Skill installed.');
  console.log('Reconnect or restart WorkBuddy, then verify CoSpace tools and the Skill in a new session.');
  console.log('The WorkBuddy managed Node runtime must support Node 22.22.2+. MCP connection is not verified by this installer.');
} catch (error) {
  console.error(`CoSpace: ${error.message}`);
  process.exitCode = 1;
}
