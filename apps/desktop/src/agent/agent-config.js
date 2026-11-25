import { applyEdits, modify, parse } from 'jsonc-parser';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function upsertMcpServer(configPath, serverConfig, { agentName = 'Agent' } = {}) {
  let source;
  try {
    source = await readFile(configPath, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    source = '{}\n';
  }

  const errors = [];
  const config = parse(source, errors, { allowTrailingComma: true, disallowComments: false });
  if (errors.length || !config || typeof config !== 'object' || Array.isArray(config)) {
    throw Object.assign(new Error(`${agentName} MCP 配置无法解析：${configPath}`), { code: 'AGENT_CONFIG_INVALID' });
  }
  if (config.mcpServers !== undefined && (!config.mcpServers || typeof config.mcpServers !== 'object' || Array.isArray(config.mcpServers))) {
    throw Object.assign(new Error(`${agentName} 配置中的 mcpServers 不是对象：${configPath}`), { code: 'AGENT_CONFIG_INVALID' });
  }

  const edits = modify(source, ['mcpServers', 'cospace'], serverConfig, {
    formattingOptions: { insertSpaces: true, tabSize: 2, eol: '\n' },
  });
  await mkdir(path.dirname(configPath), { recursive: true, mode: 0o700 });
  await writeFile(configPath, applyEdits(source, edits), { encoding: 'utf8', mode: 0o600 });
  return { success: true, path: configPath };
}

export async function hasMcpServer(configPath, serverName = 'cospace') {
  try {
    const source = await readFile(configPath, 'utf8');
    const errors = [];
    const config = parse(source, errors, { allowTrailingComma: true, disallowComments: false });
    return errors.length === 0 && Boolean(config?.mcpServers?.[serverName]);
  } catch {
    return false;
  }
}
