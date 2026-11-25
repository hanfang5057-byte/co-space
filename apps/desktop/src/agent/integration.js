import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectWorkBuddy, detectWorkBuddy, detectWorkBuddyIntegration } from './workbuddy.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const skillSource = path.join(here, 'skill');

export async function detectAgentIntegrations() {
  return detectWorkBuddy() ? [await detectWorkBuddyIntegration()] : [];
}

export async function connectAgent(id, { entry, dataHome, node = process.execPath } = {}) {
  if (id !== 'workbuddy') throw Object.assign(new Error('暂不支持此 Agent'), { code: 'AGENT_UNSUPPORTED' });
  if (!detectWorkBuddy()) throw Object.assign(new Error('未检测到 WorkBuddy，暂不能自动接入'), { code: 'AGENT_NOT_DETECTED' });
  const serverConfig = { type: 'stdio', command: node, args: [entry || path.resolve(here, 'mcp-entry.js')], env: { COSPACE_WEB_HOME: dataHome } };
  return connectWorkBuddy({ skillSource, serverConfig });
}
