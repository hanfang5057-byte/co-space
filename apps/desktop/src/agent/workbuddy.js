import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import path from 'node:path';
import { hasMcpServer, upsertMcpServer } from './agent-config.js';

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

export function getWorkBuddyPaths() {
  const root = path.join(home, '.workbuddy');
  return { root, mcpConfig: path.join(root, 'mcp.json'), skillsDir: path.join(root, 'skills'), skillDir: path.join(root, 'skills', skillName) };
}

export function detectWorkBuddy() {
  const { root, mcpConfig } = getWorkBuddyPaths();
  return existsSync(mcpConfig) || appCandidates().some(candidate => existsSync(candidate)) || existsSync(root);
}

export async function detectWorkBuddyIntegration() {
  const { mcpConfig, skillDir } = getWorkBuddyPaths();
  const mcpDetected = await hasMcpServer(mcpConfig);
  let skillDetected = false;
  try {
    const files = await readdir(skillDir);
    skillDetected = files.includes('SKILL.md') && (await stat(path.join(skillDir, 'SKILL.md'))).isFile();
  } catch {}
  return { id: 'workbuddy', name: 'WorkBuddy', mcpDetected, skillDetected };
}

export async function connectWorkBuddy({ skillSource, serverConfig }) {
  const { mcpConfig, skillDir } = getWorkBuddyPaths();
  const { type: _transport, ...workBuddyServerConfig } = serverConfig;
  const mcp = await upsertMcpServer(mcpConfig, workBuddyServerConfig, { agentName: 'WorkBuddy' });
  try {
    await mkdir(skillDir, { recursive: true, mode: 0o700 });
    await copyFile(path.join(skillSource, 'SKILL.md'), path.join(skillDir, 'SKILL.md'));
  } catch (error) {
    throw Object.assign(new Error(`MCP 已配置，但 WorkBuddy Skill 安装失败：${error.message}。可再次点击接入重试。`), { code: 'SKILL_INSTALL_FAILED', partial: true });
  }
  return { id: 'workbuddy', mcpPath: mcp.path, skillCount: 1, restartRequired: true };
}
