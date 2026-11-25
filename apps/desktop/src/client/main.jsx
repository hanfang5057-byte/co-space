import React from 'react';
import { createRoot } from 'react-dom/client';
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
  return <div className="webapp-shell"><nav className="webapp-nav"><strong>CoSpace</strong><button onClick={() => setPage('workbench')}>工作台</button><button onClick={() => setPage('agents')}>Agent 接入</button></nav>{page === 'workbench' ? <SpaceApp adapter={adapter}/> : <AgentSetup/>}</div>;
}

function AgentSetup() {
  const [agents, setAgents] = React.useState([]), [scanMessage, setScanMessage] = React.useState('正在检查…'), [working, setWorking] = React.useState(null);
  const headers = { 'x-cospace-token': window.__COSPACE_LOCAL_TOKEN__ };
  const scan = async () => { setScanMessage('正在检查已知 Agent…'); try { const result = await fetch('/local/agents', { headers }); if (!result.ok) throw new Error(); setAgents(await result.json()); setScanMessage(''); } catch { setScanMessage('检查失败，请重启 CoSpace 后重试'); } };
  const connect = async id => { setWorking(id); setScanMessage('正在接入 MCP 并安装 Skill…'); try { const result=await fetch('/local/agents/connect',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({id})}); const body=await result.json(); if(!result.ok)throw new Error(body.error?.message||'接入失败'); await scan(); setScanMessage('接入完成，请重启对应 Agent'); } catch(error) { setScanMessage(error.message); } finally { setWorking(null); } };
  React.useEffect(() => { scan(); }, []);
  return <main className="agent-setup"><h1>连接你的 Agent</h1><p>选择一个检测到的 Agent，CoSpace 会自动配置 MCP 并安装协作 Skill。我们只写入 CoSpace 自己的条目。</p><section><p role="status">{scanMessage}</p>{agents.map(agent=><article className="agent-row" key={agent.id}><div><strong>{agent.name}</strong><small>{[agent.mcpDetected?'MCP':'',agent.skillDetected?'Skill':''].filter(Boolean).join(' · ')||'已检测到'}</small></div><button disabled={working!==null} onClick={()=>connect(agent.id)}>{working===agent.id?'正在接入…':agent.mcpDetected&&agent.skillDetected?'重新安装':'一键接入'}</button></article>)}</section><p className="space-muted">配置完成后，重启 Agent 即可使用。CoSpace 不会启用自动批准，Agent 的建议仍须由你审阅。</p></main>;
}

createRoot(document.getElementById('root')).render(<App/>);
