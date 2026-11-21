import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Button, Dialog, DialogTrigger, Heading, Modal, Tab, TabList, TabPanel, Tabs,
} from 'react-aria-components'

const EMPTY = { pages: 0, sheets: 0, slides: 0, assets: 0, files: 0 }

async function rpc(method, args = {}) {
  const response = await fetch('/dsh-space-api', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ method, args }),
  })
  let body
  try { body = await response.json() } catch { body = null }
  if (!response.ok || body?.error) {
    throw Object.assign(new Error(body?.error?.message || `请求失败 (${response.status})`), { code: body?.error?.code })
  }
  return body.result
}

function Icon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  const paths = {
    space: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M3 9h18M9 9v11" /></>,
    page: <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v5h4M10 13h5M10 17h5" /></>,
    slides: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>,
    sheet: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M9 10v10M15 10v10M3 15h18" /></>,
    file: <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v5h4" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="M16.5 16.5 21 21" /></>,
    sync: <><path d="M20 12a8 8 0 0 1-13.6 5.7L4 15.7M4 12a8 8 0 0 1 13.6-5.7L20 8.3" /><path d="M4 20v-5h5M20 4v5h-5" /></>,
    alert: <><path d="M12 3 2.5 20h19z" /><path d="M12 9v5M12 17.5v.1" /></>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
    back: <><path d="m15 18-6-6 6-6" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  }
  return <svg {...common}>{paths[name] || paths.file}</svg>
}

function ButtonBase({ variant = 'default', className = '', onPress, onClick, isDisabled, ...props }) {
  return <button {...props} onClick={onPress || onClick} disabled={isDisabled} className={`sp-btn sp-btn-${variant} ${className}`} />
}

function SpaceIcon({ kind }) {
  return <Icon name={kind === 'slides' ? 'slides' : kind === 'table' ? 'sheet' : kind === 'image' || kind === 'file' ? 'file' : 'page'} />
}

function statusText(sync) {
  if (!sync) return '未知'
  if (sync.state === 'idle') return '已同步'
  if (sync.state === 'syncing' || sync.state === 'scanning') return '同步中'
  if (sync.state === 'error') return '同步错误'
  return sync.state || '未知'
}

function App() {
  const [view, setView] = useState({ kind: 'home' })
  const [spaces, setSpaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [space, setSpace] = useState(null)
  const [tree, setTree] = useState([])
  const [expanded, setExpanded] = useState(new Set(['pages', 'sheets', 'assets', 'files']))
  const [node, setNode] = useState(null)
  const [content, setContent] = useState(null)
  const [contentLoading, setContentLoading] = useState(false)
  const [mode, setMode] = useState('preview')
  const [draft, setDraft] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sheetEdits, setSheetEdits] = useState({})
  const [conflicts, setConflicts] = useState([])
  const [conflictOpen, setConflictOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [syncOpen, setSyncOpen] = useState(false)
  const [newContentOpen, setNewContentOpen] = useState(false)
  const [newSpaceOpen, setNewSpaceOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [invite, setInvite] = useState(null)
  const [toast, setToast] = useState('')

  const notify = useCallback((text) => {
    setToast(text)
    window.clearTimeout(notify.timer)
    notify.timer = window.setTimeout(() => setToast(''), 2600)
  }, [])

  const refreshSpaces = useCallback(async () => {
    setLoading(true)
    setError('')
    try { setSpaces(await rpc('list', { filter })) } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [filter])

  useEffect(() => { refreshSpaces() }, [refreshSpaces])

  const openSpace = useCallback(async (id) => {
    setError('')
    setContent(null)
    setNode(null)
    setMode('preview')
    setDraft('')
    setDirty(false)
    setSheetEdits({})
    try {
      const [detail, treeResult, conflictList] = await Promise.all([
        rpc('get', { space: id }),
        rpc('tree', { space: id }),
        rpc('conflicts', { space: id }).catch(() => []),
      ])
      setSpace(detail)
      setTree(treeResult.tree || [])
      setConflicts(conflictList || [])
      setView({ kind: 'space', spaceId: id })
    } catch (e) { setError(e.message) }
  }, [])

  const openNode = useCallback(async (entry) => {
    if (entry.type === 'directory') {
      setExpanded(prev => {
        const next = new Set(prev)
        next.has(entry.path) ? next.delete(entry.path) : next.add(entry.path)
        return next
      })
      return
    }
    setNode(entry)
    setContentLoading(true)
    setError('')
    setMode('preview')
    setDirty(false)
    setSheetEdits({})
    try {
      const value = await rpc('read', { space: view.spaceId, path: entry.path })
      setContent(value)
      setDraft(value.text || '')
    } catch (e) {
      setError(e.message)
      setContent(null)
    } finally { setContentLoading(false) }
  }, [view])

  const reloadConflicts = useCallback(async () => {
    if (!view.spaceId) return []
    const list = await rpc('conflicts', { space: view.spaceId }).catch(() => [])
    setConflicts(list)
    return list
  }, [view])

  const reloadSpaceMeta = useCallback(async () => {
    if (!view.spaceId) return
    const [treeResult, detail] = await Promise.all([
      rpc('tree', { space: view.spaceId }),
      rpc('get', { space: view.spaceId }),
    ])
    setTree(treeResult.tree || [])
    setSpace(detail)
  }, [view])

  const reloadNode = useCallback(async () => {
    if (!view.spaceId || !node) return
    const value = await rpc('read', { space: view.spaceId, path: node.path })
    setContent(value)
    setDraft(value.text || '')
    setSheetEdits({})
    setDirty(false)
    return value
  }, [view, node])

  const changeMode = useCallback((next) => {
    if (next === 'edit') {
      setDraft(content?.text || '')
      setSheetEdits({})
      setDirty(false)
    }
    setMode(next)
  }, [content])

  const changeCell = useCallback((row, column, value) => {
    setSheetEdits(previous => ({ ...previous, [`${row}:${column}`]: value }))
    setDirty(true)
  }, [])

  const saveContent = useCallback(async () => {
    if (!view.spaceId || !node || !content) return
    setSaving(true)
    setError('')
    try {
      if (content.kind === 'table') {
        const edits = Object.entries(sheetEdits).map(([key, value]) => {
          const [row, column] = key.split(':').map(Number)
          return { row, column, value }
        })
        if (edits.length) {
          await rpc('editSheetCells', { space: view.spaceId, path: node.path, expectedSha256: content.sha256, edits })
        }
      } else {
        await rpc('write', { space: view.spaceId, path: node.path, content: draft, expectedSha256: content.sha256, overwrite: true })
      }
      await Promise.all([reloadNode(), reloadSpaceMeta(), reloadConflicts()])
      setMode('preview')
      notify('已保存')
    } catch (e) {
      setError(e.message)
    } finally { setSaving(false) }
  }, [view, node, content, sheetEdits, draft, reloadNode, reloadSpaceMeta, reloadConflicts, notify])

  const discardContent = useCallback(() => {
    setDraft(content?.text || '')
    setSheetEdits({})
    setDirty(false)
    setMode('preview')
  }, [content])

  const addSheetRow = useCallback(async () => {
    if (!view.spaceId || !node || !content) return
    const columns = content.table?.columns || []
    const row = columns.map(() => '')
    try {
      await rpc('updateSheet', { space: view.spaceId, path: node.path, rows: [row], mode: 'append' })
      await Promise.all([reloadNode(), reloadSpaceMeta()])
      setMode('edit')
      notify('已添加空行')
    } catch (e) { setError(e.message) }
  }, [view, node, content, reloadNode, reloadSpaceMeta, notify])

  const createSpace = useCallback(async (name, description) => {
    const created = await rpc('createSpace', { name, description })
    setNewSpaceOpen(false)
    await refreshSpaces()
    await openSpace(created.id)
    notify('空间已创建')
  }, [openSpace, refreshSpaces, notify])

  const joinSpace = useCallback(async (invite) => {
    const joined = await rpc('join', { invite })
    setJoinOpen(false)
    await refreshSpaces()
    if (joined?.space?.id) await openSpace(joined.space.id)
    notify('已加入，等待对方批准设备')
  }, [openSpace, refreshSpaces, notify])

  const createContent = useCallback(async (kind, title, template) => {
    const args = { space: view.spaceId, title, template }
    if (kind === 'doc') await rpc('createDoc', { ...args, parent: 'pages', markdown: '' })
    if (kind === 'slides') await rpc('createSlides', { ...args, parent: 'pages' })
    if (kind === 'sheet') await rpc('createSheet', { ...args, path: undefined })
    setNewContentOpen(false)
    const [treeResult, detail] = await Promise.all([
      rpc('tree', { space: view.spaceId }),
      rpc('get', { space: view.spaceId }),
    ])
    setTree(treeResult.tree || [])
    setSpace(detail)
    setConflicts(await rpc('conflicts', { space: view.spaceId }).catch(() => []))
    notify('内容已创建')
  }, [view, notify])

  const showInvite = useCallback(async () => {
    try {
      setInvite(await rpc('invite', { space: view.spaceId }))
      setInviteOpen(true)
    } catch (e) { setError(e.message) }
  }, [view])

  const afterConflictResolved = useCallback(async () => {
    const list = await reloadConflicts()
    await Promise.all([reloadSpaceMeta(), node ? reloadNode() : Promise.resolve()])
    if (!list.length) setConflictOpen(false)
    notify('冲突已处理')
  }, [reloadConflicts, reloadSpaceMeta, reloadNode, node, notify])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return spaces.filter(item => !query || item.name.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query))
  }, [spaces, search])

  const counts = space?.stats?.counts || EMPTY

  return (
    <div className="sp-root">
      <style>{STYLE}</style>
      {toast && <div className="sp-toast" role="status">{toast}</div>}
      {error && <div className="sp-error" role="alert">{error}<ButtonBase variant="ghost" onPress={() => setError('')}>关闭</ButtonBase></div>}
      {view.kind === 'home' ? (
        <Home
          spaces={filtered}
          loading={loading}
          filter={filter}
          setFilter={setFilter}
          search={search}
          setSearch={setSearch}
          onOpen={openSpace}
          onNewSpace={() => setNewSpaceOpen(true)}
          onJoin={() => setJoinOpen(true)}
          newSpaceOpen={newSpaceOpen}
          setNewSpaceOpen={setNewSpaceOpen}
          onCreate={createSpace}
        />
      ) : (
        <SpaceDetail
          space={space}
          tree={tree}
          expanded={expanded}
          onOpen={openNode}
          activePath={node?.path}
          content={content}
          contentLoading={contentLoading}
          counts={counts}
          conflicts={conflicts}
          mode={mode}
          draft={draft}
          dirty={dirty}
          saving={saving}
          sheetEdits={sheetEdits}
          onModeChange={changeMode}
          onDraftChange={(value) => { setDraft(value); setDirty(true) }}
          onCellChange={changeCell}
          onSave={saveContent}
          onDiscard={discardContent}
          onAddRow={addSheetRow}
          onBack={() => { setView({ kind: 'home' }); refreshSpaces() }}
          onNewContent={() => setNewContentOpen(true)}
          onInvite={showInvite}
          onMembers={() => setMembersOpen(true)}
          onReviewConflicts={() => setConflictOpen(true)}
          onSync={() => setSyncOpen(true)}
        />
      )}
      <NewContentDialog open={newContentOpen} setOpen={setNewContentOpen} onCreate={createContent} />
      <JoinDialog open={joinOpen} setOpen={setJoinOpen} onJoin={joinSpace} />
      <InviteDialog open={inviteOpen} setOpen={setInviteOpen} invite={invite} notify={notify} />
      <MembersDialog open={membersOpen} setOpen={setMembersOpen} space={space} notify={notify} />
      <ConflictDialog open={conflictOpen} setOpen={setConflictOpen} space={space} conflicts={conflicts} onResolved={afterConflictResolved} notify={notify} />
      <SyncDialog open={syncOpen} setOpen={setSyncOpen} space={space} notify={notify} />
    </div>
  )
}

function Home({ spaces, loading, filter, setFilter, search, setSearch, onOpen, onNewSpace, onJoin, newSpaceOpen, setNewSpaceOpen, onCreate }) {
  return (
    <div className="sp-page">
      <header className="sp-header">
        <div>
          <h1>Spaces</h1>
          <p className="sp-subtitle">开放文本的共享空间 · 通过 Syncthing 在可信设备间同步</p>
        </div>
        <ButtonBase variant="primary" onPress={onNewSpace}><Icon name="plus" /> 新建空间</ButtonBase>
      </header>
      <div className="sp-toolbar">
        <Tabs selectedKey={filter} onSelectionChange={key => setFilter(String(key))} className="sp-tabs">
          <TabList aria-label="空间筛选">
            <Tab id="all">全部</Tab>
            <Tab id="owned">我创建的</Tab>
            <Tab id="shared">共享给我</Tab>
          </TabList>
        </Tabs>
        <label className="sp-search">
          <Icon name="search" size={16} />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索空间…" aria-label="搜索空间" />
        </label>
      </div>
      {loading ? <div className="sp-skeleton" /> : spaces.length === 0 ? (
        <div className="sp-empty">
          <Icon name="space" size={42} />
          <h2>还没有空间</h2>
          <p>创建一个空间，或使用邀请加入他人的空间。</p>
          <div className="sp-empty-actions">
            <ButtonBase variant="primary" onPress={onNewSpace}><Icon name="plus" /> 创建第一个空间</ButtonBase>
            <ButtonBase onPress={onJoin}>用邀请加入</ButtonBase>
          </div>
        </div>
      ) : (
        <div className="sp-list">
          {spaces.map(item => (
            <button key={item.id} className="sp-row" onClick={() => onOpen(item.id)}>
              <span className="sp-row-icon"><Icon name="space" size={22} /></span>
              <span className="sp-row-main">
                <span className="sp-row-title">{item.name}</span>
                <span className="sp-row-meta">
                  {item.counts?.pages || 0} 页面 · {item.counts?.sheets || 0} 表格 · {item.counts?.slides || 0} 幻灯片
                  {item.members ? ` · ${item.members} 位成员` : ''}
                  {item.description ? ` · ${item.description}` : ''}
                </span>
              </span>
              <span className={`sp-badge ${item.sync?.state === 'idle' ? 'ok' : 'warn'}`}>{statusText(item.sync)}</span>
              <Icon name="back" size={16} />
            </button>
          ))}
        </div>
      )}
      <NewSpaceDialog open={newSpaceOpen} setOpen={setNewSpaceOpen} onCreate={onCreate} />
    </div>
  )
}

function SpaceDetail({ space, tree, expanded, onOpen, activePath, content, contentLoading, counts, conflicts, mode, draft, dirty, saving, sheetEdits, onModeChange, onDraftChange, onCellChange, onSave, onDiscard, onAddRow, onBack, onNewContent, onInvite, onMembers, onReviewConflicts, onSync }) {
  return (
    <div className="sp-detail">
      <div className="sp-detail-head">
        <ButtonBase variant="ghost" onPress={onBack} aria-label="返回空间列表"><Icon name="back" /> 全部空间</ButtonBase>
        <div className="sp-detail-title">
          <h1>{space?.name || '空间'}</h1>
          <button type="button" className={`sp-badge ${space?.sync?.state === 'idle' ? 'ok' : 'warn'}`} onClick={onSync}>
            <Icon name="sync" size={12} /> {statusText(space?.sync)}
          </button>
        </div>
        <div className="sp-detail-actions">
          <ButtonBase onPress={onNewContent}><Icon name="plus" /> 新建</ButtonBase>
          <ButtonBase onPress={onMembers}>成员</ButtonBase>
          <ButtonBase onPress={onInvite}>邀请</ButtonBase>
        </div>
      </div>
      {conflicts.length > 0 && (
        <div className="sp-conflict-banner" role="status">
          <Icon name="alert" size={16} />
          <span>{conflicts.length} 个文件有同步冲突，需要处理后才能继续编辑。</span>
          <ButtonBase variant="ghost" onPress={onReviewConflicts}>处理冲突</ButtonBase>
        </div>
      )}
      <div className="sp-detail-body">
        <aside className="sp-tree" aria-label="空间内容">
          <div className="sp-tree-summary">
            <span>{counts.pages} 页面</span><span>{counts.sheets} 表格</span><span>{counts.slides} 幻灯片</span>
          </div>
          {tree.length === 0 && <p className="sp-tree-empty">空间还是空的<br /><span>点击“新建”添加文档、表格或幻灯片。</span></p>}
          {tree.map(entry => <TreeNode key={entry.path} entry={entry} depth={0} expanded={expanded} onOpen={onOpen} activePath={activePath} />)}
        </aside>
        <main className="sp-content">
          {contentLoading ? <div className="sp-skeleton" /> : content ? (
            <ContentPane
              content={content}
              path={activePath}
              mode={mode}
              draft={draft}
              dirty={dirty}
              saving={saving}
              sheetEdits={sheetEdits}
              onModeChange={onModeChange}
              onDraftChange={onDraftChange}
              onCellChange={onCellChange}
              onSave={onSave}
              onDiscard={onDiscard}
              onAddRow={onAddRow}
            />
          ) : (
            <div className="sp-empty compact">
              <Icon name="page" size={36} />
              <h2>{tree.length ? '选择一个页面' : '这个空间还是空的'}</h2>
              <p>{tree.length ? '从左侧选择 Page、表格或幻灯片。' : '新建一个 Markdown 文档、CSV 表格或 Marp 幻灯片开始。'}</p>
              <ButtonBase variant="primary" onPress={onNewContent}><Icon name="plus" /> 新建内容</ButtonBase>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function ContentPane({ content, path, mode, draft, dirty, saving, sheetEdits, onModeChange, onDraftChange, onCellChange, onSave, onDiscard, onAddRow }) {
  const preview = () => {
    if (dirty && !window.confirm('放弃未保存的更改？')) return
    onDiscard()
  }
  return (
    <div className="sp-content-inner">
      <div className="sp-content-head">
        <span className="sp-path">{path}</span>
        <div className="sp-content-actions">
          {dirty && <span className="sp-dirty">未保存</span>}
          <div className="sp-seg" role="group" aria-label="查看模式">
            <button type="button" className={mode === 'preview' ? 'active' : ''} onClick={preview}>预览</button>
            <button type="button" className={mode === 'edit' ? 'active' : ''} onClick={() => onModeChange('edit')}>编辑</button>
          </div>
          {mode === 'edit' && (
            <>
              <ButtonBase variant="ghost" onPress={onDiscard}>取消</ButtonBase>
              <ButtonBase variant="primary" isDisabled={saving || !dirty} onPress={onSave}>{saving ? '保存中…' : '保存'}</ButtonBase>
            </>
          )}
        </div>
      </div>
      {mode === 'edit' ? (
        content.kind === 'table' ? (
          <SheetEditor content={content} sheetEdits={sheetEdits} onCellChange={onCellChange} onAddRow={onAddRow} />
        ) : (
          <textarea className="sp-editor" value={draft} onChange={event => onDraftChange(event.target.value)} spellCheck={false} aria-label="编辑内容" />
        )
      ) : (
        <Preview content={content} />
      )}
    </div>
  )
}

function SheetEditor({ content, sheetEdits, onCellChange, onAddRow }) {
  const columns = content.table?.columns || []
  return (
    <div className="sp-table-wrap">
      <table className="sp-table sp-table-edit">
        <thead><tr>{columns.map(column => <th key={column.key}>{column.title}</th>)}</tr></thead>
        <tbody>
          {content.table.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column, columnIndex) => {
                const key = `${rowIndex}:${columnIndex}`
                return <td key={column.key}><input className="sp-cell-input" value={sheetEdits[key] ?? row[columnIndex] ?? ''} onChange={event => onCellChange(rowIndex, columnIndex, event.target.value)} aria-label={`${column.title} 第 ${rowIndex + 1} 行`} /></td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="sp-table-foot">
        <p className="sp-muted">{content.table.rows.length} / {content.table.total} 行</p>
        <ButtonBase onPress={onAddRow}><Icon name="plus" size={14} /> 添加空行</ButtonBase>
      </div>
    </div>
  )
}

function TreeNode({ entry, depth, expanded, onOpen, activePath }) {
  const isDir = entry.type === 'directory'
  const isOpen = expanded.has(entry.path)
  if (entry.name === '.stignore' || entry.name === '.space.json') return null
  return (
    <div>
      <button
        className={`sp-tree-row ${activePath === entry.path ? 'active' : ''}`}
        style={{ paddingLeft: 10 + depth * 14 }}
        onClick={() => onOpen(entry)}
        aria-expanded={isDir ? isOpen : undefined}
      >
        {isDir ? <span className={`sp-caret ${isOpen ? 'open' : ''}`}>›</span> : <span className="sp-caret-space" />}
        <SpaceIcon kind={entry.kind || (isDir ? 'file' : 'document')} />
        <span className="sp-tree-label">{entry.title || entry.name}</span>
      </button>
      {isDir && isOpen && entry.children?.map(child => (
        <TreeNode key={child.path} entry={child} depth={depth + 1} expanded={expanded} onOpen={onOpen} activePath={activePath} />
      ))}
    </div>
  )
}

function Preview({ content }) {
  if (content.kind === 'document') {
    return <article className="sp-doc" dangerouslySetInnerHTML={{ __html: content.html }} />
  }
  if (content.kind === 'slides') {
    const srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#fff}${content.css}</style></head><body>${content.html}</body></html>`
    return <iframe className="sp-slides" sandbox="" title="幻灯片预览" srcDoc={srcdoc} />
  }
  if (content.kind === 'table') {
    return (
      <div className="sp-table-wrap">
        <table className="sp-table">
          <thead><tr>{content.table.columns.map(column => <th key={column.key}>{column.title}</th>)}</tr></thead>
          <tbody>{content.table.rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{String(cell ?? '')}</td>)}</tr>)}</tbody>
        </table>
        <p className="sp-muted">{content.table.rows.length} / {content.table.total} 行</p>
      </div>
    )
  }
  return <pre className="sp-pre">{content.text}</pre>
}

function MembersDialog({ open, setOpen, space, notify }) {
  const [data, setData] = useState(null)
  const [invite, setInvite] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const load = useCallback(async () => {
    if (!space?.id) return
    setError('')
    try {
      const [members, invitation] = await Promise.all([rpc('members', { space: space.id }), rpc('invite', { space: space.id })])
      setData(members)
      setInvite(invitation)
    } catch (e) { setError(e.message) }
  }, [space])
  useEffect(() => { if (open) load() }, [open, load])
  const approve = async (deviceId) => {
    setBusy(deviceId); setError('')
    try { await rpc('approve', { space: space.id, deviceId }); await load(); notify('设备已批准') } catch (e) { setError(e.message) } finally { setBusy('') }
  }
  return (
    <Modal isOpen={open} onOpenChange={setOpen} className="sp-modal-overlay">
      <Dialog className="sp-dialog sp-dialog-wide" aria-label="成员">
        {({ close }) => (
          <div>
            <Heading slot="title">成员与设备</Heading>
            <p className="sp-muted">加入空间即拥有全部文件的读写权限；设备需要在这里批准后才会同步。</p>
            {error && <p className="sp-form-error">{error}</p>}
            <h3 className="sp-section-title">已加入</h3>
            <div className="sp-members">
              {(data?.members || []).map(member => (
                <div className="sp-member" key={member.deviceId}>
                  <span className={`sp-dot ${member.connected ? 'on' : ''}`} />
                  <span className="sp-member-name">{member.name}{member.self ? '（本机）' : ''}</span>
                  <span className="sp-member-id">{member.deviceId.slice(0, 7)}…</span>
                  <span className="sp-muted">{member.self ? '本机' : member.connected ? '已连接' : '离线'}</span>
                </div>
              ))}
              {!data?.members?.length && <p className="sp-muted">还没有成员。</p>}
            </div>
            <h3 className="sp-section-title">待批准设备</h3>
            <div className="sp-members">
              {(data?.pending || []).map(device => (
                <div className="sp-member" key={device.deviceId}>
                  <span className="sp-dot" />
                  <span className="sp-member-name">{device.name}</span>
                  <span className="sp-member-id">{device.deviceId.slice(0, 7)}…</span>
                  <ButtonBase variant="primary" isDisabled={busy === device.deviceId} onPress={() => approve(device.deviceId)}>{busy === device.deviceId ? '批准中…' : '批准'}</ButtonBase>
                </div>
              ))}
              {!data?.pending?.length && <p className="sp-muted">没有待批准设备。</p>}
            </div>
            <h3 className="sp-section-title">邀请新设备</h3>
            {invite && (
              <>
                <label className="sp-field"><span>邀请 token</span><textarea readOnly rows={3} value={invite.invite} /></label>
                <div className="sp-dialog-actions">
                  <ButtonBase onPress={() => navigator.clipboard?.writeText(invite.invite).then(() => notify('邀请已复制')).catch(() => notify('复制失败，请手动选择'))}>复制邀请</ButtonBase>
                  <ButtonBase onPress={() => navigator.clipboard?.writeText(invite.deviceId).then(() => notify('Device ID 已复制')).catch(() => notify('复制失败'))}>复制我的 Device ID</ButtonBase>
                  <ButtonBase variant="primary" onPress={close}>完成</ButtonBase>
                </div>
              </>
            )}
          </div>
        )}
      </Dialog>
    </Modal>
  )
}

function ConflictDialog({ open, setOpen, space, conflicts, onResolved, notify }) {
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [merged, setMerged] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  useEffect(() => {
    if (!open) return
    setMerged('')
    setSelected(prev => conflicts.some(item => item.conflictPath === prev) ? prev : conflicts[0]?.conflictPath || null)
  }, [open, conflicts])

  useEffect(() => {
    if (!open || !space?.id || !selected) { setDetail(null); return }
    setError('')
    rpc('conflictDetail', { space: space.id, conflictPath: selected }).then(setDetail).catch(e => setError(e.message))
  }, [open, space, selected])

  const resolve = async (action) => {
    if (!space?.id || !selected) return
    setBusy(action); setError('')
    try {
      const result = await rpc('resolveConflict', { space: space.id, conflictPath: selected, action })
      if (result.resolved) {
        await onResolved()
        notify('冲突已解决')
      } else {
        setMerged(result.text || '')
        setError('自动合并仍有冲突，请手动处理下面的文本。')
      }
    } catch (e) { setError(e.message) } finally { setBusy('') }
  }

  return (
    <Modal isOpen={open} onOpenChange={setOpen} className="sp-modal-overlay">
      <Dialog className="sp-dialog sp-dialog-wide" aria-label="处理同步冲突">
        {({ close }) => (
          <div>
            <Heading slot="title">处理同步冲突</Heading>
            <p className="sp-muted">同一个文件在两台设备上被修改。保留一侧，或让工具做三方合并；合并后不会再自动覆盖。</p>
            {!conflicts.length ? <p className="sp-muted">没有待处理冲突。</p> : (
              <div className="sp-conflict-layout">
                <div className="sp-conflict-list">
                  {conflicts.map(item => (
                    <button key={item.conflictPath} type="button" className={`sp-conflict-item ${selected === item.conflictPath ? 'active' : ''}`} onClick={() => setSelected(item.conflictPath)}>
                      <span>{item.path}</span>
                      <small>{item.conflictPath.split('/').pop()}</small>
                    </button>
                  ))}
                </div>
                <div className="sp-conflict-detail">
                  {error && <p className="sp-form-error">{error}</p>}
                  {detail ? (
                    <>
                      <div className="sp-conflict-cols">
                        <div><h4>本机版本</h4><pre>{detail.local || '（文件不存在）'}</pre></div>
                        <div><h4>对端版本</h4><pre>{detail.remote}</pre></div>
                        <div><h4>基线</h4><pre>{detail.base || '（没有基线）'}</pre></div>
                      </div>
                      <div className="sp-dialog-actions">
                        <ButtonBase isDisabled={Boolean(busy)} onPress={() => resolve('keep-local')}>保留本机</ButtonBase>
                        <ButtonBase isDisabled={Boolean(busy)} onPress={() => resolve('keep-conflict')}>保留对端</ButtonBase>
                        <ButtonBase variant="primary" isDisabled={Boolean(busy)} onPress={() => resolve('merge')}>{busy === 'merge' ? '合并中…' : '尝试合并'}</ButtonBase>
                      </div>
                      {merged && <pre className="sp-pre sp-merged">{merged}</pre>}
                    </>
                  ) : <p className="sp-muted">加载冲突内容…</p>}
                </div>
              </div>
            )}
            <div className="sp-dialog-actions"><ButtonBase onPress={close}>关闭</ButtonBase></div>
          </div>
        )}
      </Dialog>
    </Modal>
  )
}

function SyncDialog({ open, setOpen, space, notify }) {
  const [info, setInfo] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    if (!space?.id) return
    setError('')
    try { setInfo(await rpc('sync', { space: space.id })) } catch (e) { setError(e.message) }
  }, [space])
  useEffect(() => { if (open) load() }, [open, load])
  const rescan = async () => {
    setBusy(true); setError('')
    try { await rpc('rescan', { space: space.id }); await load(); notify('已触发扫描') } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  return (
    <Modal isOpen={open} onOpenChange={setOpen} className="sp-modal-overlay">
      <Dialog className="sp-dialog" aria-label="同步状态">
        {({ close }) => (
          <div>
            <Heading slot="title">同步状态</Heading>
            {error && <p className="sp-form-error">{error}</p>}
            {info ? (
              <>
                <div className="sp-sync-summary">
                  <span className={`sp-badge ${info.state === 'idle' ? 'ok' : 'warn'}`}>{statusText(info)}</span>
                  <span className="sp-muted">待同步 {info.needFiles || 0} 个文件 · 冲突 {info.conflicts || 0}</span>
                </div>
                <div className="sp-members">
                  {(info.peers || []).map(peer => (
                    <div className="sp-member" key={peer.deviceId}>
                      <span className={`sp-dot ${peer.connected ? 'on' : ''}`} />
                      <span className="sp-member-name">{peer.deviceId.slice(0, 7)}…</span>
                      <span className="sp-muted">{peer.connected ? '已连接' : '离线'}{peer.completion != null ? ` · ${peer.completion}%` : ''}</span>
                    </div>
                  ))}
                  {!info.peers?.length && <p className="sp-muted">还没有其他设备。</p>}
                </div>
                <div className="sp-dialog-actions">
                  <ButtonBase isDisabled={busy} onPress={rescan}>{busy ? '扫描中…' : '重新扫描'}</ButtonBase>
                  <ButtonBase onPress={close}>关闭</ButtonBase>
                </div>
              </>
            ) : <p className="sp-muted">读取中…</p>}
          </div>
        )}
      </Dialog>
    </Modal>
  )
}

function NewSpaceDialog({ open, setOpen, onCreate }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async () => {
    if (!name.trim()) return
    setBusy(true); setError('')
    try { await onCreate(name.trim(), description.trim()); setName(''); setDescription('') } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  return (
    <Modal isOpen={open} onOpenChange={setOpen} className="sp-modal-overlay">
      <Dialog className="sp-dialog" aria-label="新建空间">
        {({ close }) => (
          <div>
            <Heading slot="title">新建空间</Heading>
            <p className="sp-muted">空间是一个 Syncthing 文件夹；所有内容都是可读、可 diff 的开放文本。</p>
            <label className="sp-field"><span>名称</span><input autoFocus value={name} onChange={e => setName(e.target.value)} maxLength={80} placeholder="例如：Q3 复盘" /></label>
            <label className="sp-field"><span>描述（可选）</span><input value={description} onChange={e => setDescription(e.target.value)} placeholder="这个空间用来做什么？" /></label>
            {error && <p className="sp-form-error">{error}</p>}
            <div className="sp-dialog-actions">
              <ButtonBase variant="ghost" onPress={close}>取消</ButtonBase>
              <ButtonBase variant="primary" isDisabled={busy || !name.trim()} onPress={submit}>{busy ? '创建中…' : '创建'}</ButtonBase>
            </div>
          </div>
        )}
      </Dialog>
    </Modal>
  )
}

function NewContentDialog({ open, setOpen, onCreate }) {
  const [kind, setKind] = useState('doc')
  const [title, setTitle] = useState('')
  const [template, setTemplate] = useState('blank')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async () => {
    if (!title.trim()) return
    setBusy(true); setError('')
    try { await onCreate(kind, title.trim(), template); setTitle('') } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  return (
    <Modal isOpen={open} onOpenChange={setOpen} className="sp-modal-overlay">
      <Dialog className="sp-dialog" aria-label="新建内容">
        {({ close }) => (
          <div>
            <Heading slot="title">新建内容</Heading>
            <div className="sp-type-grid">
              {[['doc', '文档', 'page'], ['slides', '幻灯片', 'slides'], ['sheet', '表格', 'sheet']].map(([value, label, icon]) => (
                <button key={value} className={`sp-type ${kind === value ? 'active' : ''}`} onClick={() => setKind(value)}>
                  <Icon name={icon} size={22} /><span>{label}</span>
                </button>
              ))}
            </div>
            <label className="sp-field"><span>标题</span><input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="例如：项目概览" /></label>
            <label className="sp-field"><span>模板</span>
              <select value={template} onChange={e => setTemplate(e.target.value)}>
                <option value="blank">空白</option>
                {kind === 'doc' && <option value="project-brief">项目简报</option>}
                {kind === 'doc' && <option value="meeting-notes">会议纪要</option>}
                {kind === 'slides' && <option value="review">复盘</option>}
                {kind === 'slides' && <option value="pitch">Pitch</option>}
                {kind === 'sheet' && <option value="tracker">Tracker</option>}
                {kind === 'sheet' && <option value="budget">预算</option>}
              </select>
            </label>
            {error && <p className="sp-form-error">{error}</p>}
            <div className="sp-dialog-actions">
              <ButtonBase variant="ghost" onPress={close}>取消</ButtonBase>
              <ButtonBase variant="primary" isDisabled={busy || !title.trim()} onPress={submit}>{busy ? '创建中…' : '创建'}</ButtonBase>
            </div>
          </div>
        )}
      </Dialog>
    </Modal>
  )
}

function JoinDialog({ open, setOpen, onJoin }) {
  const [invite, setInvite] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async () => {
    if (!invite.trim()) return
    setBusy(true); setError('')
    try { await onJoin(invite.trim()); setInvite('') } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  return (
    <Modal isOpen={open} onOpenChange={setOpen} className="sp-modal-overlay">
      <Dialog className="sp-dialog" aria-label="用邀请加入">
        {({ close }) => (
          <div>
            <Heading slot="title">用邀请加入空间</Heading>
            <p className="sp-muted">粘贴对方分享的 `dshspace:v1:...` token。加入后，对方还需要批准你的设备。</p>
            <label className="sp-field"><span>邀请 token</span><textarea autoFocus rows={4} value={invite} onChange={e => setInvite(e.target.value)} placeholder="dshspace:v1:..." /></label>
            {error && <p className="sp-form-error">{error}</p>}
            <div className="sp-dialog-actions">
              <ButtonBase variant="ghost" onPress={close}>取消</ButtonBase>
              <ButtonBase variant="primary" isDisabled={busy || !invite.trim()} onPress={submit}>{busy ? '加入中…' : '加入'}</ButtonBase>
            </div>
          </div>
        )}
      </Dialog>
    </Modal>
  )
}

function InviteDialog({ open, setOpen, invite, notify }) {
  if (!invite) return null
  return (
    <Modal isOpen={open} onOpenChange={setOpen} className="sp-modal-overlay">
      <Dialog className="sp-dialog sp-invite-dialog" aria-label="邀请成员">
        {({ close }) => (
          <div>
            <Heading slot="title">邀请到「{invite.space?.name}」</Heading>
            <p className="sp-muted">对方安装 DSH Space 后，在工具或页面里使用下面的邀请 token 加入；你还需要在这里批准对方的设备。</p>
            <label className="sp-field"><span>邀请 token</span><textarea readOnly value={invite.invite} rows={3} /></label>
            <label className="sp-field"><span>你的 Device ID</span><input readOnly value={invite.deviceId} /></label>
            <div className="sp-dialog-actions">
              <ButtonBase variant="ghost" onPress={() => navigator.clipboard?.writeText(invite.invite).then(() => notify('邀请已复制')).catch(() => notify('复制失败，请手动选择'))}>复制邀请</ButtonBase>
              <ButtonBase variant="primary" onPress={close}>完成</ButtonBase>
            </div>
          </div>
        )}
      </Dialog>
    </Modal>
  )
}

const STYLE = `
.sp-root{height:100%;min-height:0;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);font:14px/1.5 inherit;position:relative;overflow:hidden}
.sp-page{max-width:1040px;margin:0 auto;padding:clamp(24px,4vw,48px);box-sizing:border-box;height:100%;overflow:auto}
.sp-header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-bottom:28px}
.sp-header h1{margin:0;font-size:28px;line-height:1.2;font-weight:650}
.sp-subtitle{margin:6px 0 0;color:var(--dsw-alias-label-secondary);font-size:13px}
.sp-toolbar{display:flex;gap:16px;align-items:center;justify-content:space-between;margin-bottom:16px}
.sp-tabs{flex:0 0 auto}
.sp-tabs [role="tablist"]{display:flex;gap:4px;padding:3px;background:var(--dsw-alias-bg-layer-2);border-radius:9px}
.sp-tabs [role="tab"]{border:0;background:transparent;color:var(--dsw-alias-label-secondary);padding:6px 12px;border-radius:7px;font:inherit;cursor:pointer}
.sp-tabs [role="tab"][data-selected]{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:0 1px 2px rgba(0,0,0,.08)}
.sp-search{display:flex;align-items:center;gap:8px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:9px;padding:0 10px;height:34px;color:var(--dsw-alias-label-secondary);min-width:220px}
.sp-search input{border:0;outline:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;width:100%}
.sp-list{display:flex;flex-direction:column;gap:8px}
.sp-row{display:flex;align-items:center;gap:14px;text-align:left;width:100%;padding:14px 16px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:11px;color:inherit;cursor:pointer;font:inherit}
.sp-row:hover{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}
.sp-row-icon{display:grid;place-items:center;width:38px;height:38px;border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-brand-primary);flex:0 0 auto}
.sp-row-main{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
.sp-row-title{font-weight:600;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sp-row-meta{color:var(--dsw-alias-label-secondary);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sp-badge{font-size:11px;padding:3px 8px;border-radius:999px;white-space:nowrap;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary)}
.sp-badge.ok{color:var(--dsw-alias-state-success-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 35%,transparent)}
.sp-badge.warn{color:var(--dsw-alias-state-warn-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 35%,transparent)}
.sp-btn{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:0 12px;height:34px;font:inherit;cursor:pointer;white-space:nowrap}
.sp-btn:hover{border-color:var(--dsw-alias-border-l2)}
.sp-btn-primary{background:var(--dsw-alias-brand-primary);border-color:transparent;color:#fff}
.sp-btn-ghost{background:transparent;border-color:transparent;padding-left:6px;padding-right:6px}
.sp-btn[disabled]{opacity:.5;cursor:not-allowed}
.sp-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:8px;padding:80px 24px;color:var(--dsw-alias-label-secondary);border:1px dashed var(--dsw-alias-border-l1);border-radius:14px}
.sp-empty h2{margin:8px 0 0;font-size:18px;color:var(--dsw-alias-label-primary)}
.sp-empty p{margin:0 0 12px;max-width:440px}
.sp-empty-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.sp-empty.compact{padding:48px 24px;border:0}
.sp-skeleton{height:220px;border-radius:14px;background:linear-gradient(90deg,var(--dsw-alias-bg-layer-2),var(--dsw-alias-bg-layer-1),var(--dsw-alias-bg-layer-2));background-size:200% 100%;animation:sp-shimmer 1.4s infinite}
@keyframes sp-shimmer{to{background-position:-200% 0}}
.sp-detail{display:flex;flex-direction:column;height:100%;min-height:0}
.sp-detail-head{display:flex;align-items:center;gap:14px;padding:18px clamp(20px,3vw,36px);border-bottom:1px solid var(--dsw-alias-border-l1);flex-wrap:wrap}
.sp-detail-title{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
.sp-detail-title h1{margin:0;font-size:22px;font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sp-detail-actions{display:flex;gap:8px}
.sp-detail-body{display:grid;grid-template-columns:260px minmax(0,1fr);min-height:0;flex:1}
.sp-tree{border-right:1px solid var(--dsw-alias-border-l1);padding:12px 8px 24px;overflow:auto;background:var(--dsw-specific-sidebar-fill)}
.sp-tree-summary{display:flex;gap:10px;flex-wrap:wrap;color:var(--dsw-alias-label-secondary);font-size:11px;padding:4px 10px 10px}
.sp-tree-row{display:flex;align-items:center;gap:7px;width:100%;border:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;padding:6px 10px;border-radius:7px;cursor:pointer;text-align:left}
.sp-tree-row:hover{background:var(--dsw-alias-bg-layer-2)}
.sp-tree-row.active{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-brand-primary)}
.sp-tree-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}
.sp-caret{display:inline-block;width:10px;color:var(--dsw-alias-label-secondary);transition:transform .12s;flex:0 0 10px}
.sp-caret.open{transform:rotate(90deg)}
.sp-caret-space{width:10px;flex:0 0 10px}
.sp-content{overflow:auto;padding:clamp(20px,3vw,36px);min-width:0}
.sp-doc{max-width:780px;margin:0 auto;line-height:1.7}
.sp-doc h1{font-size:26px;margin:0 0 .6em}
.sp-doc h2{font-size:20px;margin:1.4em 0 .5em}
.sp-doc h3{font-size:17px;margin:1.2em 0 .4em}
.sp-doc p{margin:0 0 .9em}
.sp-doc code{background:var(--dsw-alias-bg-layer-2);border-radius:4px;padding:2px 5px;font-size:.9em}
.sp-doc pre{background:var(--dsw-alias-bg-layer-2);padding:14px;border-radius:9px;overflow:auto}
.sp-doc table{border-collapse:collapse;width:100%;margin:1em 0}
.sp-doc th,.sp-doc td{border:1px solid var(--dsw-alias-border-l1);padding:8px 10px;text-align:left}
.sp-doc th{background:var(--dsw-alias-bg-layer-2)}
.sp-doc blockquote{border-left:3px solid var(--dsw-alias-border-l2);margin:1em 0;padding:.2em 0 .2em 1em;color:var(--dsw-alias-label-secondary)}
.sp-slides{width:100%;aspect-ratio:16/9;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:#fff}
.sp-table-wrap{max-width:100%;overflow:auto}
.sp-table{border-collapse:collapse;min-width:480px;width:100%}
.sp-table th,.sp-table td{border:1px solid var(--dsw-alias-border-l1);padding:7px 10px;text-align:left;white-space:nowrap;max-width:320px;overflow:hidden;text-overflow:ellipsis}
.sp-table th{background:var(--dsw-alias-bg-layer-2);position:sticky;top:0}
.sp-muted{color:var(--dsw-alias-label-secondary);font-size:12px}
.sp-pre{white-space:pre-wrap;word-break:break-word;background:var(--dsw-alias-bg-layer-2);padding:14px;border-radius:9px}

.sp-badge{background:transparent;cursor:pointer;display:inline-flex;align-items:center;gap:4px}
.sp-tree-empty{margin:12px 10px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.7}
.sp-tree-empty span{color:var(--dsw-alias-label-secondary);opacity:.8}
.sp-conflict-banner{display:flex;align-items:center;gap:10px;padding:9px clamp(20px,3vw,36px);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 9%,var(--dsw-alias-bg-base));border-bottom:1px solid color-mix(in srgb,var(--dsw-alias-state-warn-primary) 30%,transparent);color:var(--dsw-alias-state-warn-primary);font-size:12px}
.sp-conflict-banner span{flex:1}
.sp-content-inner{display:flex;flex-direction:column;min-height:100%;height:100%;gap:14px}
.sp-content-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding-bottom:10px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.sp-path{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:140px}
.sp-content-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.sp-dirty{font-size:11px;color:var(--dsw-alias-state-warn-primary)}
.sp-seg{display:flex;padding:2px;background:var(--dsw-alias-bg-layer-2);border-radius:7px}
.sp-seg button{border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;padding:4px 9px;border-radius:5px;cursor:pointer}
.sp-seg button.active{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
.sp-editor{flex:1;min-height:360px;width:100%;box-sizing:border-box;resize:none;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);padding:16px 18px;font:13px/1.75 ui-monospace,SFMono-Regular,Menlo,monospace;outline:none;tab-size:2}
.sp-editor:focus{border-color:var(--dsw-alias-brand-primary)}
.sp-table-edit td{padding:3px 4px}
.sp-cell-input{width:100%;min-width:90px;box-sizing:border-box;border:1px solid transparent;background:transparent;color:inherit;font:inherit;padding:5px 6px;border-radius:4px;outline:none}
.sp-cell-input:hover{border-color:var(--dsw-alias-border-l1)}
.sp-cell-input:focus{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-1)}
.sp-table-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px}
.sp-dialog-wide{width:min(880px,100%)}
.sp-section-title{font-size:13px;margin:18px 0 8px;color:var(--dsw-alias-label-secondary);font-weight:600}
.sp-members{display:flex;flex-direction:column;gap:6px}
.sp-member{display:flex;align-items:center;gap:9px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);font-size:12px}
.sp-member-name{font-weight:550;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sp-member-id{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--dsw-alias-label-secondary);font-size:11px}
.sp-member .sp-muted{margin-left:auto}
.sp-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-idle-primary);flex:0 0 auto}
.sp-dot.on{background:var(--dsw-alias-state-success-primary)}
.sp-sync-summary{display:flex;align-items:center;gap:10px;margin:14px 0 10px;flex-wrap:wrap}
.sp-conflict-layout{display:grid;grid-template-columns:210px minmax(0,1fr);gap:14px;margin-top:14px;min-height:320px}
.sp-conflict-list{display:flex;flex-direction:column;gap:5px;max-height:440px;overflow:auto;border-right:1px solid var(--dsw-alias-border-l1);padding-right:10px}
.sp-conflict-item{text-align:left;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-primary);border-radius:7px;padding:7px 8px;font:inherit;font-size:12px;cursor:pointer;display:flex;flex-direction:column;gap:2px;min-width:0}
.sp-conflict-item small{color:var(--dsw-alias-label-secondary);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sp-conflict-item:hover{background:var(--dsw-alias-bg-layer-2)}
.sp-conflict-item.active{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l2)}
.sp-conflict-detail{min-width:0}
.sp-conflict-cols{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.sp-conflict-cols h4{margin:0 0 5px;font-size:11px;color:var(--dsw-alias-label-secondary);font-weight:600}
.sp-conflict-cols pre{height:260px;overflow:auto;margin:0;padding:10px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-layer-1);white-space:pre-wrap;word-break:break-word;font:11px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace}
.sp-merged{max-height:220px;overflow:auto;margin-top:12px}
@media(max-width:900px){.sp-conflict-layout{grid-template-columns:1fr}.sp-conflict-list{max-height:140px;border-right:0;border-bottom:1px solid var(--dsw-alias-border-l1);padding:0 0 10px}.sp-conflict-cols{grid-template-columns:1fr}.sp-conflict-cols pre{height:160px}}

.sp-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.38);display:grid;place-items:center;padding:24px;z-index:80}
.sp-dialog{width:min(520px,100%);max-height:min(86vh,720px);overflow:auto;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);border-radius:14px;padding:22px;box-shadow:0 24px 60px rgba(0,0,0,.28);outline:none}
.sp-dialog h2{margin:0 0 6px;font-size:19px}
.sp-field{display:flex;flex-direction:column;gap:6px;margin:14px 0;font-size:13px}
.sp-field span{color:var(--dsw-alias-label-secondary)}
.sp-field input,.sp-field select,.sp-field textarea{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:8px 10px;font:inherit;outline:none}
.sp-field input:focus,.sp-field select:focus,.sp-field textarea:focus{border-color:var(--dsw-alias-brand-primary)}
.sp-field textarea{resize:vertical;word-break:break-all}
.sp-type-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:16px 0}
.sp-type{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);cursor:pointer;font:inherit}
.sp-type.active{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.sp-dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:20px}
.sp-form-error{color:var(--dsw-alias-state-error-primary);font-size:12px;margin:8px 0 0}
.sp-error{position:absolute;top:12px;left:50%;transform:translateX(-50%);z-index:90;display:flex;align-items:center;gap:10px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary);padding:8px 12px;border-radius:9px;font-size:12px;max-width:80vw}
.sp-toast{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);z-index:90;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);padding:8px 14px;border-radius:999px;font-size:12px;box-shadow:0 8px 24px rgba(0,0,0,.18)}
@media(max-width:820px){.sp-detail-body{grid-template-columns:1fr}.sp-tree{border-right:0;border-bottom:1px solid var(--dsw-alias-border-l1);max-height:220px}.sp-header{flex-direction:column}.sp-toolbar{align-items:stretch;flex-direction:column}.sp-search{min-width:0}}
`

export const name = 'dsh-space-client'
export const inject = ['slots']

export function apply(ctx) {
  ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: 'spaces' }, App))
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist', id: 'spaces', order: 20, label: () => 'Spaces',
  }, function SpacesIcon({ size = 16 }) {
    return <Icon name="space" size={size} />
  }))
}
