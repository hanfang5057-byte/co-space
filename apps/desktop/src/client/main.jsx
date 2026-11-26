import React from 'react';
import { createRoot } from 'react-dom/client';
import { Files, PlugZap } from 'lucide-react';
import { SpaceApp } from '../../../../packages/review-ui/src/SpaceApp.jsx';
import { invoke } from '@tauri-apps/api/core';
import { api } from '../../../../packages/transport-http/client.js';
import '../../../../packages/review-ui/src/space.css';
import './desktop.css';
import { ADAPTER_CONTRACT_VERSION, resolveAdapterCapabilities } from '../../../../packages/adapter-contract/src/index.js';
import adapterDeclaration from '../../adapter.json' with { type: 'json' };

function saveExport({ name, bytes }) {
  return invoke('save_export', { name, bytes: Array.from(bytes) });
}

function App() {
  const [page, setPage] = React.useState('workbench');
  const adapter = React.useMemo(() => {
    const available = [];
    available.push('files.export.save');
    if (typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function') available.push('clipboard.write');
    available.push('identity.current.read');
    return {
      core: { request: api },
      prompts: { mcpReady: true },
      files: { saveExport },
      clipboard: { writeText: text => navigator.clipboard.writeText(text) },
      identity: { getCurrentUser: () => api('getUser') },
      capabilities: resolveAdapterCapabilities({ ...adapterDeclaration, contractVersion: ADAPTER_CONTRACT_VERSION }, available),
    };
  }, []);
  return <div className="webapp-shell">
    <aside className="webapp-sidebar" aria-label="CoSpace 导航">
      <nav className="webapp-sidebar-nav" aria-label="主导航">
        <button type="button" className="webapp-sidebar-link" aria-current={page === 'workbench' ? 'page' : undefined} onClick={() => setPage('workbench')}><Files size={17} strokeWidth={1.8} aria-hidden="true"/><span>文档工作台</span></button>
        <button type="button" className="webapp-sidebar-link" aria-current={page === 'agents' ? 'page' : undefined} onClick={() => setPage('agents')}><PlugZap size={17} strokeWidth={1.8} aria-hidden="true"/><span>Agent 接入</span></button>
      </nav>
      <div className="webapp-sidebar-footer"><i aria-hidden="true"/><span>本地空间</span></div>
    </aside>
    <main className="webapp-content">
      {page === 'workbench' ? <SpaceApp adapter={adapter}/> : <AgentSetup/>}
    </main>
  </div>;
}

function AgentSetup() {
  const [agents, setAgents] = React.useState([]), [scanMessage, setScanMessage] = React.useState('正在检查…'), [working, setWorking] = React.useState(null), [resultDialog, setResultDialog] = React.useState(null);
  const resultButton = React.useRef(null);
  const headers = { 'x-cospace-token': window.__COSPACE_LOCAL_TOKEN__ };
  const scan = async () => { setScanMessage('正在检查已知 Agent…'); try { const result = await fetch('/local/agents', { headers }); if (!result.ok) throw new Error(); setAgents(await result.json()); setScanMessage(''); } catch { setScanMessage('检查失败，请重启 CoSpace 后重试'); } };
  const connect = async id => { setWorking(id); setScanMessage('正在接入 MCP 并安装 Skill…'); try { const result=await fetch('/local/agents/connect',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({id})}); const body=await result.json(); if(!result.ok)throw new Error(body.error?.message||'接入失败'); await scan(); setResultDialog({ mcpPath: body.mcpPath }); } catch(error) { setScanMessage(error.message); } finally { setWorking(null); } };
  React.useEffect(() => { scan(); }, []);
  React.useEffect(() => {
    if (!resultDialog) return undefined;
    resultButton.current?.focus();
    const closeOnEscape = event => { if (event.key === 'Escape') setResultDialog(null); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [resultDialog]);
  return <main className="agent-setup">
    <div className="agent-setup-heading"><span className="agent-kicker">协作设置</span><h1>连接你的 Agent</h1><p>WorkBuddy 可由 CoSpace 自动接入；DeepSeek Harness 请按下方说明手动安装插件。</p></div>
    <section className="agent-list"><div className="agent-list-heading"><div><h2>可用的 Agent</h2><p>仅写入 CoSpace 自己的配置条目</p></div><span className="agent-list-count">{agents.length} 个</span></div><p className="agent-scan-status" role="status">{scanMessage}</p>{agents.map(agent=><article className="agent-row" key={agent.id}><div className="agent-row-copy"><strong>{agent.name}</strong><small>{[agent.mcpDetected?'MCP 已配置':'',agent.skillDetected?'Skill 已安装':''].filter(Boolean).join(' · ')||'已检测到，可连接'}</small></div><button disabled={working!==null} onClick={()=>connect(agent.id)}>{working===agent.id?'正在接入…':agent.mcpDetected&&agent.skillDetected?'重新安装':'一键接入'}</button></article>)}</section>
    <section className="agent-guide" aria-labelledby="deepseek-guide-title">
      <div className="agent-guide-heading"><div><span className="agent-guide-kicker">手动安装</span><h2 id="deepseek-guide-title">DeepSeek Harness</h2></div><span className="agent-guide-badge">插件</span></div>
      <p>在 DeepSeek Harness 中安装 CoSpace 插件，启用后即可在侧边栏打开文档工作台。</p>
      <ol><li>打开左侧 <strong>Plugins</strong>，选择 <strong>Add plugin</strong>。</li><li>输入插件名 <code>dsh-plugin-space</code> 并确认安装。</li><li>安装后启用插件；侧边栏会出现 <strong>CoSpace</strong> 入口。</li></ol>
      <p className="agent-guide-cli">也可在终端运行 <code>dsh plugin add dsh-plugin-space</code>。</p>
    </section>
    <aside className="agent-safety"><span aria-hidden="true">✓</span><p>建议仍由你审阅并决定是否采纳。CoSpace 不会开启自动批准。</p></aside>
    {resultDialog && <div className="agent-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setResultDialog(null); }}>
      <section className="agent-result-dialog" role="dialog" aria-modal="true" aria-labelledby="agent-result-title" aria-describedby="agent-result-description">
        <span className="agent-result-icon" aria-hidden="true">✓</span>
        <h2 id="agent-result-title">WorkBuddy 接入完成</h2>
        <p id="agent-result-description">CoSpace MCP 和协作 Skill 已写入。还需在 WorkBuddy 连接器中启用 CoSpace 的信任开关，完成后重启 WorkBuddy。</p>
        <ol className="agent-result-steps">
          <li>打开 WorkBuddy 的 <strong>连接器</strong> 页面，找到 <strong>cospace</strong>。</li>
          <li>打开该连接器右侧的信任开关（显示“启用”）。</li>
          <li>重启 WorkBuddy，即可开始使用 CoSpace。</li>
        </ol>
        <dl className="agent-result-paths"><div><dt>MCP 配置</dt><dd>{resultDialog.mcpPath}</dd></div><div><dt>Skill</dt><dd>~/.workbuddy/skills/cospace-review/</dd></div></dl>
        <button ref={resultButton} className="agent-result-confirm" type="button" onClick={() => setResultDialog(null)}>知道了</button>
      </section>
    </div>}
  </main>;
}

createRoot(document.getElementById('root')).render(<App/>);
