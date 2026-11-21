import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets'
import { UniverDocsCorePreset } from '@univerjs/preset-docs-core'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import DocsZh from '@univerjs/preset-docs-core/locales/zh-CN'
import SheetsZh from '@univerjs/preset-sheets-core/locales/zh-CN'
import '@univerjs/preset-docs-core/lib/index.css'
import '@univerjs/preset-sheets-core/lib/index.css'
import './style.css'

function App() {
  const docsRef = useRef(null)
  const sheetsRef = useRef(null)
  const [tab, setTab] = useState('docs')
  const [snapshot, setSnapshot] = useState('')
  const [error, setError] = useState('')
  const docsApi = useRef(null)
  const sheetsApi = useRef(null)
  const docsUniver = useRef(null)
  const sheetsUniver = useRef(null)

  useEffect(() => {
    try {
      const docs = createUniver({
        locale: LocaleType.ZH_CN,
        locales: { [LocaleType.ZH_CN]: mergeLocales(DocsZh) },
        presets: [UniverDocsCorePreset({ container: docsRef.current })],
      })
      docsUniver.current = docs.univer
      docsApi.current = docs.univerAPI
      docs.univerAPI.createDocument({ id: 'doc-1', title: 'Univer Doc' })
    } catch (e) { setError('Docs: ' + e.message + '\n' + e.stack) }
    try {
      const sheets = createUniver({
        locale: LocaleType.ZH_CN,
        locales: { [LocaleType.ZH_CN]: mergeLocales(SheetsZh) },
        presets: [UniverSheetsCorePreset({ container: sheetsRef.current })],
      })
      sheetsUniver.current = sheets.univer
      sheetsApi.current = sheets.univerAPI
      sheets.univerAPI.createWorkbook({ id: 'wb-1', name: 'Univer Sheet' })
    } catch (e) { setError(prev => prev + '\nSheets: ' + e.message + '\n' + e.stack) }
    return () => { docsUniver.current?.dispose?.(); sheetsUniver.current?.dispose?.() }
  }, [])

  const save = () => {
    try {
      if (tab === 'docs') {
        const doc = docsApi.current.getActiveDocument()
        setSnapshot(JSON.stringify(doc.save(), null, 2).slice(0, 4000))
      } else {
        const wb = sheetsApi.current.getActiveWorkbook()
        setSnapshot(JSON.stringify(wb.save(), null, 2).slice(0, 4000))
      }
    } catch (e) { setError(e.stack || e.message) }
  }

  return (
    <div className="app">
      <header>
        <h1>Univer 1.6.0 Spike</h1>
        <nav>
          <button className={tab === 'docs' ? 'active' : ''} onClick={() => setTab('docs')}>Docs</button>
          <button className={tab === 'sheets' ? 'active' : ''} onClick={() => setTab('sheets')}>Sheets</button>
          <button onClick={save}>保存快照</button>
        </nav>
      </header>
      {error && <pre className="error">{error}</pre>}
      <div className="panes">
        <div ref={docsRef} className="pane" style={{ display: tab === 'docs' ? 'block' : 'none' }} />
        <div ref={sheetsRef} className="pane" style={{ display: tab === 'sheets' ? 'block' : 'none' }} />
      </div>
      {snapshot && <pre className="snapshot">{snapshot}</pre>}
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
