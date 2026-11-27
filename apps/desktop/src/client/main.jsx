import React from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, Files, PlugZap, RefreshCw } from 'lucide-react';
import { SpaceApp } from '../../../../packages/review-ui/src/SpaceApp.jsx';
import { documentIdFromUrl, documentUrlFor } from '../../../../packages/review-ui/src/document-navigation.js';
import { invoke } from '@tauri-apps/api/core';
import { api } from '../../../../packages/transport-http/client.js';
import '../../../../packages/review-ui/src/space.css';
import './desktop.css';
import { ADAPTER_CONTRACT_VERSION, resolveAdapterCapabilities } from '../../../../packages/adapter-contract/src/index.js';
import adapterDeclaration from '../../adapter.json' with { type: 'json' };

function saveExport({ name, bytes }) {
  return invoke('save_export', { name, bytes: Array.from(bytes) });
}

function MigrationGate() {
  const [state, setState] = React.useState({ loading: true });
  const [source, setSource] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const headers = { 'x-cospace-token': window.__COSPACE_LOCAL_TOKEN__ };
  React.useEffect(() => {
    fetch('/local/migration', { headers }).then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || '无法检查本地数据');
      setSource(body.sourceHome); setState(body);
    }).catch(reason => setState({ error: reason.message }));
  }, []);
  async function choose(action) {
    setBusy(true); setError('');
    try {
      const response = await fetch('/local/migration', { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ action, sourceHome: source }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || '操作失败');
      await window.__COSPACE_UI_SESSION__?.open();
      setState({ required: false });
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }
  if (state.loading) return <main className="agent-setup"><p role="status">正在检查本地空间…</p></main>;
  if (state.error) return <main className="agent-setup"><p role="alert">{state.error}。请重新打开 CoSpace。</p></main>;
  if (!state.required) return <App/>;
  return <main className="agent-setup migration-setup">
    <h1>设置本地空间</h1>
    <p>{state.hasLegacy ? '检测到旧版 CoSpace 本地数据。' : '你可以创建新空间，或从旧版 CoSpace 导入数据。'}导入前请关闭旧服务并断开 Agent。导入会保留原数据，新旧空间不会自动同步。</p>
    <form action="/local/migration" method="post" onSubmit={event => { event.preventDefault(); void choose('migrate'); }}>
      <label htmlFor="migration-source">旧数据目录</label>
      <input id="migration-source" name="sourceHome" value={source} onChange={event => setSource(event.target.value)} required spellCheck={false} aria-describedby="migration-help"/>
      <p id="migration-help">如果旧版使用了自定义目录，请填写其完整路径。</p>
      <p role="status">{error}</p>
      <div className="migration-actions"><button type="submit" disabled={busy}>{busy ? '处理中…' : '导入旧数据'}</button><button type="button" disabled={busy} onClick={() => void choose('new')}>创建新空间</button></div>
    </form>
  </main>;
}

function App() {
  const [page, setPage] = React.useState('workbench');
  const [updating, setUpdating] = React.useState(false);
  const [serviceIndicator, setServiceIndicator] = React.useState('unknown');
  React.useEffect(() => {
    const refreshServiceIndicator = async () => {
      try {
        const response = await fetch('/local/service-status', { headers: { 'x-cospace-token': window.__COSPACE_LOCAL_TOKEN__ }, cache: 'no-store' });
        if (!response.ok) throw new Error();
        const status = await response.json();
        setServiceIndicator(status.running && status.compatible ? 'healthy' : status.running ? 'warning' : 'offline');
      } catch { setServiceIndicator('unknown'); }
    };
    void refreshServiceIndicator();
    const timer = setInterval(refreshServiceIndicator, 15000);
    return () => clearInterval(timer);
  }, []);
  const adapter = React.useMemo(() => {
    const available = [];
    available.push('files.export.save');
    if (typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function') available.push('clipboard.write');
    available.push('identity.current.read');
    available.push('navigation.document.open');
    return {
      core: { request: api },
      prompts: { mcpReady: true },
      files: { saveExport },
      clipboard: { writeText: text => navigator.clipboard.writeText(text) },
      identity: { getCurrentUser: () => api('getUser') },
      navigation: {
        getDocumentId: () => documentIdFromUrl(window.location.href),
        setDocumentId: (docId, { replace = false } = {}) => {
          const url = documentUrlFor(window.location.href, docId);
          window.history[replace ? 'replaceState' : 'pushState']({}, '', url);
        },
      },
      capabilities: resolveAdapterCapabilities({ ...adapterDeclaration, contractVersion: ADAPTER_CONTRACT_VERSION }, available),
    };
  }, []);
  return <div className="webapp-shell">
    <aside className="webapp-sidebar" aria-label="CoSpace 导航">
      <nav className="webapp-sidebar-nav" aria-label="主导航">
        <button type="button" className="webapp-sidebar-link" disabled={updating} aria-current={page === 'workbench' ? 'page' : undefined} onClick={() => setPage('workbench')}><Files size={17} strokeWidth={1.8} aria-hidden="true"/><span>文档工作台</span></button>
        <button type="button" className="webapp-sidebar-link" disabled={updating} aria-current={page === 'agents' ? 'page' : undefined} onClick={() => setPage('agents')}><PlugZap size={17} strokeWidth={1.8} aria-hidden="true"/><span>Agent 接入</span></button>
      </nav>
      <button type="button" className="webapp-sidebar-footer" disabled={updating} aria-current={page === 'services' ? 'page' : undefined} onClick={() => setPage('services')}><i className={`service-indicator-${serviceIndicator}`} aria-hidden="true"/><span className="webapp-sidebar-footer-copy"><strong>服务与更新</strong><small>{serviceIndicator === 'healthy' ? '后台服务正常' : serviceIndicator === 'warning' ? '服务版本不兼容' : serviceIndicator === 'offline' ? '后台服务未连接' : '正在检查服务状态'}</small></span></button>
    </aside>
    <main className="webapp-content">
      {page === 'workbench' ? <SpaceApp adapter={adapter}/> : page === 'agents' ? <AgentSetup/> : <ServiceSettings onUpdating={setUpdating}/>}
    </main>
  </div>;
}

function AgentSetup() {
  const [agent, setAgent] = React.useState(null), [scanState, setScanState] = React.useState('checking'), [scanMessage, setScanMessage] = React.useState('正在检查…'), [working, setWorking] = React.useState(null), [resultDialog, setResultDialog] = React.useState(null);
  const dialogRef = React.useRef(null);
  const headers = { 'x-cospace-token': window.__COSPACE_LOCAL_TOKEN__ };
  const scan = async () => { setScanState('checking'); setScanMessage('正在检查 WorkBuddy…'); try { const result = await fetch('/local/agents', { headers }); if (!result.ok) throw new Error(); const agents = await result.json(); setAgent(agents.find(item => item.id === 'workbuddy') || { id: 'workbuddy', name: 'WorkBuddy', detected: false }); setScanState('ready'); setScanMessage(''); } catch { setScanState('error'); setScanMessage('检查失败，请重试'); } };
  const connect = async id => { setWorking(id); setScanMessage('正在接入 MCP 并安装 Skill…'); try { const result=await fetch('/local/agents/connect',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({id})}); const body=await result.json(); if(!result.ok)throw new Error(body.error?.message||'接入失败'); await scan(); setResultDialog({ mcpPath: body.mcpPath }); } catch(error) { setScanMessage(error.message); } finally { setWorking(null); } };
  React.useEffect(() => { scan(); }, []);
  React.useEffect(() => {
    if (!resultDialog) return undefined;
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, [resultDialog]);
  return <div className="agent-setup">
    <div className="agent-setup-heading"><span className="agent-kicker">协作设置</span><h1>连接你的 Agent</h1><p>WorkBuddy 可由 CoSpace 自动接入；DeepSeek Harness 请按下方说明手动安装插件。</p></div>
    <section className="agent-list"><div className="agent-list-heading"><div><h2>可用的 Agent</h2><p>仅写入 CoSpace 自己的配置条目</p></div><span className="agent-list-count">WorkBuddy</span></div><p className="agent-scan-status" role="status">{scanMessage}</p><article className="agent-row" key="workbuddy"><div className="agent-row-copy"><strong>WorkBuddy</strong><small>{scanState === 'error' ? '暂时无法确认安装状态' : scanState === 'checking' ? '正在检查安装状态…' : !agent?.detected ? '未检测到 WorkBuddy。安装或启动后可重新检查。' : [agent.mcpConflict?'同名 MCP 配置冲突，请先检查':agent.mcpNeedsRepair?'MCP 需重新接入':agent.mcpDetected?'MCP 已配置':'',agent.skillDetected?'Skill 已安装':''].filter(Boolean).join(' · ')||'已检测到，可连接'}</small></div><div className="agent-row-actions">{(scanState === 'error' || (scanState === 'ready' && !agent?.detected)) && <button type="button" className="agent-secondary-action" disabled={working!==null || scanState==='checking'} onClick={scan}><RefreshCw size={14} aria-hidden="true"/>重新检查</button>}<button disabled={working!==null || scanState!=='ready' || !agent?.detected || agent?.mcpConflict} onClick={()=>connect('workbuddy')}>{working==='workbuddy'?'正在接入…':agent?.mcpDetected&&agent?.skillDetected?'重新安装':'一键接入'}</button></div></article></section>
    <section className="agent-guide" aria-labelledby="deepseek-guide-title">
      <div className="agent-guide-heading"><div><span className="agent-guide-kicker">手动安装</span><h2 id="deepseek-guide-title">DeepSeek Harness</h2></div><span className="agent-guide-badge">插件</span></div>
      <p>在 DeepSeek Harness 中安装 CoSpace 插件，启用后即可在侧边栏打开文档工作台。</p>
      <ol><li>打开左侧 <strong>Plugins</strong>，选择 <strong>Add plugin</strong>。</li><li>输入插件名 <code>dsh-plugin-space</code> 并确认安装。</li><li>安装后启用插件；侧边栏会出现 <strong>CoSpace</strong> 入口。</li></ol>
      <p className="agent-guide-cli">也可在终端运行 <code>dsh plugin add dsh-plugin-space</code>。</p>
    </section>
    <aside className="agent-safety"><span aria-hidden="true">✓</span><p>建议仍由你审阅并决定是否采纳。CoSpace 不会开启自动批准。</p></aside>
    {resultDialog && <dialog ref={dialogRef} className="agent-result-dialog" aria-labelledby="agent-result-title" aria-describedby="agent-result-description" onClose={() => setResultDialog(null)}>
        <span className="agent-result-icon" aria-hidden="true">✓</span>
        <h2 id="agent-result-title">WorkBuddy 接入完成</h2>
        <p id="agent-result-description">CoSpace MCP 和协作 Skill 已写入。还需在 WorkBuddy 连接器中启用 CoSpace 的信任开关，完成后重启 WorkBuddy。</p>
        <ol className="agent-result-steps">
          <li>打开 WorkBuddy 的 <strong>连接器</strong> 页面，找到 <strong>cospace</strong>。</li>
          <li>打开该连接器右侧的信任开关（显示“启用”）。</li>
          <li>重启 WorkBuddy，即可开始使用 CoSpace。</li>
        </ol>
        <dl className="agent-result-paths"><div><dt>MCP 配置</dt><dd>{resultDialog.mcpPath}</dd></div><div><dt>Skill</dt><dd>~/.workbuddy/skills/cospace-review/</dd></div></dl>
        <button autoFocus className="agent-result-confirm" type="button" onClick={() => dialogRef.current?.close()}>知道了</button>
    </dialog>}
  </div>;
}

function ServiceSettings({ onUpdating }) {
  const [status, setStatus] = React.useState(null);
  const [checking, setChecking] = React.useState(true);
  const [error, setError] = React.useState('');
  const refresh = async () => {
    setChecking(true); setError('');
    try {
      const response = await fetch('/local/service-status', { headers: { 'x-cospace-token': window.__COSPACE_LOCAL_TOKEN__ }, cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || '无法读取服务状态');
      setStatus(body);
    } catch (reason) { setStatus(null); setError(reason.message || '无法读取服务状态'); }
    finally { setChecking(false); }
  };
  React.useEffect(() => { void refresh(); }, []);
  return <div className="service-settings">
    <div className="agent-setup-heading"><span className="agent-kicker">桌面应用</span><h1>服务与更新</h1><p>查看 CoSpace 后台服务运行情况，并管理应用更新。</p></div>
    <section className="service-health" aria-labelledby="service-health-title">
      <div className="service-section-heading"><div><span className={`service-health-dot ${status?.running && status?.compatible ? 'is-healthy' : status?.running ? 'is-warning' : ''}`} aria-hidden="true"/><h2 id="service-health-title">后台服务</h2></div><button type="button" className="service-refresh" onClick={refresh} disabled={checking}><RefreshCw size={15} aria-hidden="true"/>{checking ? '正在刷新…' : '刷新状态'}</button></div>
      <p className="service-state" role="status">{error ? `状态检查失败：${error}` : checking && !status ? '正在检查服务状态…' : !status?.running ? '服务未运行或暂时无法连接。请重新打开 CoSpace。' : !status.compatible ? '服务版本不兼容，请重新打开 CoSpace。' : '服务运行正常'}</p>
      <dl className="service-metrics"><div><dt>服务版本</dt><dd>{status?.version || '—'}</dd></div><div><dt>Agent 连接</dt><dd>{status?.running ? status.activeMcpClients : '—'}</dd></div><div><dt>审阅页面</dt><dd>{status?.running ? status.activeUiSessions : '—'}</dd></div></dl>
    </section>
    <DesktopUpdate onUpdating={onUpdating}/>
  </div>;
}

function DesktopUpdate({ onUpdating }) {
  const [phase, setPhase] = React.useState('idle');
  const [version, setVersion] = React.useState('');
  const [status, setStatus] = React.useState(null);
  const [message, setMessage] = React.useState('');
  const updateRequest = async action => {
    const response = await fetch('/local/update', { method: 'POST', headers: { 'content-type': 'application/json', 'x-cospace-token': window.__COSPACE_LOCAL_TOKEN__ }, body: JSON.stringify({ action }) });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message || '更新操作失败');
    return body.result;
  };
  async function check() {
    setPhase('checking'); setMessage('');
    try {
      const found = await invoke('prepare_update');
      if (found) { setVersion(found); setPhase('downloaded'); setMessage(`已验证版本 ${found}，可以安装。`); }
      else { setPhase('idle'); setMessage('当前已是最新版本。'); }
    } catch (error) { setPhase('idle'); setMessage(`检查更新失败：${String(error)}`); }
  }
  async function begin() {
    setPhase('starting'); setMessage(''); onUpdating(true);
    try {
      const response = await window.__COSPACE_UI_SESSION__.pause();
      if (!response?.ok) throw new Error('无法关闭当前审阅会话');
      setStatus(await updateRequest('begin')); setPhase('waiting');
    } catch (error) {
      try { await updateRequest('cancel'); await window.__COSPACE_UI_SESSION__.open(); onUpdating(false); setPhase('downloaded'); }
      catch { setPhase('stopped'); }
      setMessage(`无法准备更新：${String(error)}`);
    }
  }
  async function refresh() {
    try { setStatus(await updateRequest('status')); }
    catch (error) { setMessage(`无法检查连接：${String(error)}`); }
  }
  async function cancel() {
    try { await updateRequest('cancel'); await window.__COSPACE_UI_SESSION__.open(); onUpdating(false); setPhase('downloaded'); setMessage('已取消更新。'); }
    catch (error) { setMessage(`无法取消更新：${String(error)}。请重新打开 CoSpace。`); }
  }
  async function install() {
    setPhase('installing'); setMessage('');
    try {
      await updateRequest('finish');
    } catch (error) {
      try { setStatus(await updateRequest('status')); setPhase('waiting'); setMessage(`仍有活动连接：${String(error)}`); }
      catch { setPhase('stopped'); setMessage(`服务状态不确定：${String(error)}。请重新打开 CoSpace 恢复。`); }
      return;
    }
    try { await invoke('install_prepared_update', { localToken: window.__COSPACE_LOCAL_TOKEN__ }); }
    catch (error) { setPhase('stopped'); setMessage(`更新未完成：${String(error)}。请重新打开 CoSpace 恢复，数据会保留。`); }
  }
  return <section className="desktop-update" aria-labelledby="desktop-update-title">
    <h2 id="desktop-update-title">应用更新</h2>
    <p>安装前请保存文档，并关闭其他审阅页面和 Agent 连接。Linux deb 包请使用包管理器或手动更新。</p>
    {phase === 'idle' && <button type="button" onClick={check}>检查并下载更新</button>}
    {phase === 'checking' && <p>正在检查并下载更新…</p>}
    {phase === 'downloaded' && <button type="button" onClick={begin}>准备安装 {version}</button>}
    {(phase === 'starting' || phase === 'installing') && <p>正在准备安装…</p>}
    {phase === 'waiting' && <>
      <p>等待 {status?.activeMcpClients ?? '—'} 个 Agent、{status?.activeUiSessions ?? '—'} 个其他审阅页面和 {status?.inFlight ?? '—'} 个请求结束。</p>
      <div className="migration-actions"><button type="button" onClick={refresh}>刷新状态</button><button type="button" onClick={cancel}>取消更新</button><button type="button" onClick={install} disabled={!status || Boolean(status.activeMcpClients || status.activeUiSessions || status.inFlight)}>继续安装</button></div>
    </>}
    <p role="status">{message}</p>
  </section>;
}

createRoot(document.getElementById('root')).render(<MigrationGate/>);
