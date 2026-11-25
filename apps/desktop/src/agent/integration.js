import { agents as mcpAgents, detectGlobalAgents, upsertServer } from 'add-mcp';
import { detectAgents, installSkills } from 'skills';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export async function detectAgentIntegrations() {
  const [mcpIds, skillResult] = await Promise.all([detectGlobalAgents(), detectAgents({ scope: 'global' })]);
  const skillIds = new Set(skillResult.agents.map(agent => agent.id));
  const ids = new Set([...mcpIds, ...skillIds]);
  return [...ids].sort().map(id => ({ id, name: mcpAgents[id]?.displayName || skillResult.agents.find(agent => agent.id === id)?.name || id, mcpDetected: mcpIds.includes(id), skillDetected: skillIds.has(id) }));
}

export async function connectAgent(id, { entry, dataHome, node = process.execPath } = {}) {
  const detected = await detectAgentIntegrations();
  if (!detected.some(agent => agent.id === id)) throw Object.assign(new Error('未检测到此 Agent，暂不能自动接入'), { code: 'AGENT_NOT_DETECTED' });
  const mcp = upsertServer(id, 'cospace', { command: node, args: [entry || path.resolve(here, 'mcp-entry.js')], env: { COSPACE_WEB_HOME: dataHome } });
  if (!mcp.success) throw Object.assign(new Error(mcp.error || 'MCP 配置失败'), { code: 'MCP_CONFIG_FAILED' });
  const skills = await installSkills(path.join(here, 'skill'), { scope: 'global', agents: [id], mode: 'copy', lockfile: false, telemetry: false, symlinks: 'reject' });
  if (skills.failed.length) {
    throw Object.assign(new Error(`MCP 已配置，但 Skill 安装失败：${skills.failed.map(item => item.message).join('；')}。可再次点击接入重试。`), { code: 'SKILL_INSTALL_FAILED', partial: true });
  }
  return { id, mcpPath: mcp.path, skillCount: skills.installed.length, restartRequired: true };
}
