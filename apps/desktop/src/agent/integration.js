import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectWorkBuddy, detectWorkBuddy, detectWorkBuddyIntegration } from './workbuddy.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const skillSource = path.join(here, 'skill');

export async function detectAgentIntegrations() {
  const detected = detectWorkBuddy();
  return [{ ...(await detectWorkBuddyIntegration()), detected }];
}

export async function connectAgent(id, { entry, dataHome, runtimeDist, node = process.execPath, launcher = process.env.COSPACE_DESKTOP_LAUNCHER } = {}) {
  if (id !== 'workbuddy') throw Object.assign(new Error('暂不支持此 Agent'), { code: 'AGENT_UNSUPPORTED' });
  if (!detectWorkBuddy()) throw Object.assign(new Error('未检测到 WorkBuddy，暂不能自动接入'), { code: 'AGENT_NOT_DETECTED' });
  if (!launcher && process.env.COSPACE_DEV !== '1') throw Object.assign(new Error('无法确定桌面应用路径，请从安装后的 CoSpace 接入。'), { code: 'DESKTOP_LAUNCHER_UNAVAILABLE' });
  const serverConfig = launcher
    ? { type: 'stdio', command: launcher, args: ['--mcp'], env: { COSPACE_DESKTOP_HOME: dataHome, COSPACE_DESKTOP_MCP: '1' } }
    : { type: 'stdio', command: node, args: [entry || path.resolve(here, 'mcp-entry.js')], env: { COSPACE_DESKTOP_HOME: dataHome, COSPACE_DESKTOP_RUNTIME_DIST: runtimeDist } };
  return connectWorkBuddy({ skillSource, serverConfig });
}
