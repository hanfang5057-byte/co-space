import React from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft } from 'lucide-react';
import { SpaceApp } from '../../../../packages/review-ui/src/SpaceApp.jsx';
import { api } from '../../../../packages/transport-http/client.js';
import '../../../../packages/review-ui/src/space.css';
import './desktop.css';
import { ADAPTER_CONTRACT_VERSION, resolveAdapterCapabilities } from '../../../../packages/adapter-contract/src/index.js';
import adapterDeclaration from '../../adapter.json' with { type: 'json' };

function App() {
  const [page, setPage] = React.useState('workbench');
  const adapter = React.useMemo(() => ({
    core: { request: api },
    prompts: { mcpReady: true },
    capabilities: resolveAdapterCapabilities({ ...adapterDeclaration, contractVersion: ADAPTER_CONTRACT_VERSION }, []),
  }), []);
  return <div className="webapp-shell">
    {page === 'agents' && <nav className="webapp-nav" aria-label="主导航">
      <button className="webapp-back" type="button" aria-label="返回工作台" title="返回工作台" onClick={() => setPage('workbench')}><ArrowLeft size={18} aria-hidden="true"/></button>
      <span className="webapp-current-page">Agent 接入</span>
      <span className="webapp-local"><i/>本地空间</span>
    </nav>}
    {page === 'workbench' ? <SpaceApp adapter={adapter} onOpenAgents={() => setPage('agents')}/> : <AgentSetup/>}
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
    <div className="agent-setup-heading"><span className="agent-kicker">协作设置</span><h1>连接你的 Agent</h1><p>为常用 Agent 配置 CoSpace MCP 与协作 Skill，让它们协助起草和审阅文档。</p></div>
    <section className="agent-list"><div className="agent-list-heading"><div><h2>可用的 Agent</h2><p>仅写入 CoSpace 自己的配置条目</p></div><span className="agent-list-count">{agents.length} 个</span></div><p className="agent-scan-status" role="status">{scanMessage}</p>{agents.map(agent=><article className="agent-row" key={agent.id}><div className="agent-row-copy"><strong>{agent.name}</strong><small>{[agent.mcpDetected?'MCP 已配置':'',agent.skillDetected?'Skill 已安装':''].filter(Boolean).join(' · ')||'已检测到，可连接'}</small></div><button disabled={working!==null} onClick={()=>connect(agent.id)}>{working===agent.id?'正在接入…':agent.mcpDetected&&agent.skillDetected?'重新安装':'一键接入'}</button></article>)}</section>
    <aside className="agent-safety"><span aria-hidden="true">✓</span><p>建议仍由你审阅并决定是否采纳。CoSpace 不会开启自动批准。</p></aside>
    {resultDialog && <div className="agent-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setResultDialog(null); }}>
      <section className="agent-result-dialog" role="dialog" aria-modal="true" aria-labelledby="agent-result-title" aria-describedby="agent-result-description">
        <span className="agent-result-icon" aria-hidden="true">✓</span>
        <h2 id="agent-result-title">WorkBuddy 接入完成</h2>
        <p id="agent-result-description">CoSpace MCP 和协作 Skill 已安装。重启 WorkBuddy 后即可使用。</p>
        <dl className="agent-result-paths"><div><dt>MCP 配置</dt><dd>{resultDialog.mcpPath}</dd></div><div><dt>Skill</dt><dd>~/.workbuddy/skills/cospace-review/</dd></div></dl>
        <button ref={resultButton} className="agent-result-confirm" type="button" onClick={() => setResultDialog(null)}>知道了</button>
      </section>
    </div>}
  </main>;
}

createRoot(document.getElementById('root')).render(<App/>);
