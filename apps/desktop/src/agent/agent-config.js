import { applyEdits, modify, parse } from 'jsonc-parser';
import { randomBytes } from 'node:crypto';
import { constants } from 'node:fs';
import { access, lstat, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export function isOwnedMcpServer(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (expected && JSON.stringify(value) === JSON.stringify(expected)) return true;
  const args = value.args;
  if (Array.isArray(args) && args.length === 1 && args[0] === '--mcp' && value.env?.COSPACE_DESKTOP_MCP === '1' && typeof value.command === 'string') return true;
  if (value.command === 'npx' && Array.isArray(args) && args.length === 3 && args[0] === '-y' && args[1] === '@hanfang5057/co-space@latest' && args[2] === 'mcp') return true;
  const command = String(value.command || '').replaceAll('\\', '/').split('/').pop();
  const entry = Array.isArray(args) && args.length === 1 && typeof args[0] === 'string' ? args[0].replaceAll('\\', '/') : '';
  return /^cospace-node(?:\.exe)?$/i.test(command) && /\/desktop\/mcp-entry\.bundle\.cjs$/i.test(entry);
}

export async function rejectSymlink(file) {
  try { if ((await lstat(file)).isSymbolicLink()) throw Object.assign(new Error(`拒绝修改符号链接：${file}`), { code: 'AGENT_SYMLINK' }); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}

export async function atomicWrite(file, content, mode = 0o600) {
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${randomBytes(8).toString('hex')}.tmp`);
  try { await writeFile(temporary, content, { mode, flag: 'wx' }); await rename(temporary, file); }
  finally { await rm(temporary, { force: true }); }
}

export async function upsertMcpServer(configPath, serverConfig, { agentName = 'Agent' } = {}) {
  let source;
  let existed = true;
  await rejectSymlink(configPath);
  try {
    source = await readFile(configPath, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    existed = false;
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
  if (config.mcpServers?.cospace !== undefined && !isOwnedMcpServer(config.mcpServers.cospace, serverConfig)) {
    throw Object.assign(new Error(`${agentName} 已有不同的 cospace 配置，请先检查后再接入。`), { code: 'AGENT_CONFIG_CONFLICT' });
  }

  const edits = modify(source, ['mcpServers', 'cospace'], serverConfig, {
    formattingOptions: { insertSpaces: true, tabSize: 2, eol: '\n' },
  });
  await mkdir(path.dirname(configPath), { recursive: true, mode: 0o700 });
  const content = applyEdits(source, edits);
  if (content !== source) {
    await rejectSymlink(configPath);
    let current;
    try { current = await readFile(configPath, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if ((existed && current !== source) || (!existed && current !== undefined)) throw Object.assign(new Error(`${agentName} 配置在接入时发生变化，请重试。`), { code: 'AGENT_CONFIG_CHANGED' });
    const mode = existed ? (await stat(configPath)).mode & 0o777 : 0o600;
    if (existed) await writeFile(`${configPath}.cospace-backup-${Date.now()}-${randomBytes(4).toString('hex')}`, source, { mode, flag: 'wx' });
    await atomicWrite(configPath, content, mode);
  }
  return { success: true, path: configPath };
}

export async function hasMcpServer(configPath, serverName = 'cospace') {
  try {
    const source = await readFile(configPath, 'utf8');
    const errors = [];
    const config = parse(source, errors, { allowTrailingComma: true, disallowComments: false });
    return errors.length === 0 && isOwnedMcpServer(config?.mcpServers?.[serverName]);
  } catch {
    return false;
  }
}

export async function inspectDesktopMcp(configPath, { launcher, dataHome } = {}) {
  try {
    const errors = [];
    const config = parse(await readFile(configPath, 'utf8'), errors, { allowTrailingComma: true, disallowComments: false });
    if (errors.length || !config || typeof config !== 'object' || Array.isArray(config)) return { configured: false, needsRepair: false, conflict: true };
    if (config.mcpServers !== undefined && (!config.mcpServers || typeof config.mcpServers !== 'object' || Array.isArray(config.mcpServers))) return { configured: false, needsRepair: false, conflict: true };
    const entry = config.mcpServers?.cospace;
    if (entry === undefined) return { configured: false, needsRepair: false, conflict: false };
    if (!isOwnedMcpServer(entry)) return { configured: false, needsRepair: false, conflict: true };
    const matches = Boolean(launcher && entry.command === launcher && entry.args?.length === 1 && entry.args[0] === '--mcp' && entry.env?.COSPACE_DESKTOP_MCP === '1' && entry.env?.COSPACE_DESKTOP_HOME === dataHome);
    const exists = matches && await Promise.all([stat(launcher), access(launcher, process.platform === 'win32' ? constants.F_OK : constants.X_OK)]).then(([info]) => info.isFile(), () => false);
    return { configured: Boolean(exists), needsRepair: !exists, conflict: false };
  } catch (error) {
    if (error.code === 'ENOENT') return { configured: false, needsRepair: false, conflict: false };
    throw error;
  }
}
