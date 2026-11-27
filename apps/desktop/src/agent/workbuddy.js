import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import path from 'node:path';
import { atomicWrite, inspectDesktopMcp, rejectSymlink, upsertMcpServer } from './agent-config.js';
import { resolveWebHome } from '../shared/paths.js';

const home = homedir();
const skillName = 'cospace-review';

function appCandidates() {
  switch (platform()) {
    case 'darwin':
      return [path.join('/Applications', 'WorkBuddy.app'), path.join(home, 'Applications', 'WorkBuddy.app')];
    case 'win32':
      return [path.join(process.env.LOCALAPPDATA || '', 'Programs', 'WorkBuddy'), path.join(process.env.ProgramFiles || 'C:\\Program Files', 'WorkBuddy')];
    default:
      return [path.join(home, '.local', 'share', 'applications', 'workbuddy.desktop'), '/usr/share/applications/workbuddy.desktop', '/opt/WorkBuddy'];
  }
}

export function getWorkBuddyPaths(homeDir = home) {
  const root = path.join(homeDir, '.workbuddy');
  return { root, mcpConfig: path.join(root, 'mcp.json'), skillsDir: path.join(root, 'skills'), skillDir: path.join(root, 'skills', skillName) };
}

export function detectWorkBuddy() {
  const { root, mcpConfig } = getWorkBuddyPaths();
  return existsSync(mcpConfig) || appCandidates().some(candidate => existsSync(candidate)) || existsSync(root);
}

export async function detectWorkBuddyIntegration() {
  const { mcpConfig, skillDir } = getWorkBuddyPaths();
  const mcp = await inspectDesktopMcp(mcpConfig, { launcher: process.env.COSPACE_DESKTOP_LAUNCHER, dataHome: resolveWebHome() });
  let skillDetected = false;
  try {
    const files = await readdir(skillDir);
    skillDetected = files.includes('SKILL.md') && (await stat(path.join(skillDir, 'SKILL.md'))).isFile();
  } catch {}
  return { id: 'workbuddy', name: 'WorkBuddy', mcpDetected: mcp.configured, mcpNeedsRepair: mcp.needsRepair, mcpConflict: mcp.conflict, skillDetected };
}

export async function connectWorkBuddy({ skillSource, serverConfig, homeDir = home }) {
  const { root, mcpConfig, skillsDir, skillDir } = getWorkBuddyPaths(homeDir);
  const skillPath = path.join(skillDir, 'SKILL.md');
  const markerPath = path.join(skillDir, '.cospace-install.json');
  for (const file of [root, mcpConfig, skillsDir, skillDir, skillPath, markerPath]) await rejectSymlink(file);
  const desired = await readFile(path.join(skillSource, 'SKILL.md'));
  const optional = async file => { try { return await readFile(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } };
  const previous = await optional(skillPath);
  const markerBytes = await optional(markerPath);
  let marker = null;
  if (markerBytes) { try { marker = JSON.parse(markerBytes.toString('utf8')); } catch { throw Object.assign(new Error('现有 Skill 标记无法解析，请先检查。'), { code: 'SKILL_CONFLICT' }); } }
  const digest = bytes => createHash('sha256').update(bytes).digest('hex');
  if (previous && !previous.equals(desired) && marker?.sha256 !== digest(previous)) throw Object.assign(new Error('现有协作 Skill 已修改，请先检查后再替换。'), { code: 'SKILL_CONFLICT' });
  if (!previous && markerBytes) throw Object.assign(new Error('现有协作 Skill 不完整，请先检查。'), { code: 'SKILL_CONFLICT' });
  if (!previous && existsSync(skillDir) && (await readdir(skillDir)).length) throw Object.assign(new Error('现有协作 Skill 目录不为空，请先检查。'), { code: 'SKILL_CONFLICT' });
  const { type: _transport, ...workBuddyServerConfig } = serverConfig;
  const mcp = await upsertMcpServer(mcpConfig, workBuddyServerConfig, { agentName: 'WorkBuddy' });
  try {
    await mkdir(skillDir, { recursive: true, mode: 0o700 });
    for (const file of [skillsDir, skillDir, skillPath, markerPath]) await rejectSymlink(file);
    const current = await optional(skillPath);
    const currentMarker = await optional(markerPath);
    if ((current === null) !== (previous === null) || (current && !current.equals(previous)) || (currentMarker === null) !== (markerBytes === null) || (currentMarker && !currentMarker.equals(markerBytes))) throw Object.assign(new Error('协作 Skill 在接入时发生变化，请重试。'), { code: 'SKILL_CHANGED' });
    await atomicWrite(skillPath, desired);
    await atomicWrite(markerPath, `${JSON.stringify({ schema: 1, sha256: digest(desired) }, null, 2)}\n`);
  } catch (error) {
    throw Object.assign(new Error(`MCP 已配置，但 WorkBuddy Skill 安装失败：${error.message}。可再次点击接入重试。`), { code: 'SKILL_INSTALL_FAILED', partial: true });
  }
  return { id: 'workbuddy', mcpPath: mcp.path, skillCount: 1, restartRequired: true };
}
