import React, { useCallback, useEffect, useRef } from 'react'
import { CrepeBuilder } from '@milkdown/crepe/builder'
import { blockEdit } from '@milkdown/crepe/feature/block-edit'
import { codeMirror } from '@milkdown/crepe/feature/code-mirror'
import { cursor } from '@milkdown/crepe/feature/cursor'
import { imageBlock } from '@milkdown/crepe/feature/image-block'
import { linkTooltip } from '@milkdown/crepe/feature/link-tooltip'
import { listItem } from '@milkdown/crepe/feature/list-item'
import { placeholder } from '@milkdown/crepe/feature/placeholder'
import { table } from '@milkdown/crepe/feature/table'
import { toolbar } from '@milkdown/crepe/feature/toolbar'
import { topBar } from '@milkdown/crepe/feature/top-bar'
import { editorViewCtx } from '@milkdown/kit/core'
import { replaceAll } from '@milkdown/kit/utils'
import CREPE_CSS from './crepe-theme.generated.js'

/**
 * Composed explicitly instead of `new Crepe({ features })`: the `Crepe` class
 * imports every feature, so flags alone still ship AI/LaTeX/KaTeX code. Adding
 * the features one by one keeps unselected ones out of the bundle.
 *
 * LaTeX stays out (KaTeX fonts cannot be served from a single-file bundle) and
 * AI stays out (editing here is tool-driven on the Host, not an LLM palette).
 */
const FEATURES = [cursor, listItem, blockEdit, toolbar, table, topBar]

/** Crepe ships English copy for its widgets; localize the strings users see. */
const PLACEHOLDER = { text: '开始写…（输入 / 插入块，或直接粘贴图片）' }
const LINK_TOOLTIP = { inputPlaceholder: '粘贴链接…' }
const IMAGE_COPY = {
  inlineUploadButton: '上传',
  inlineUploadPlaceholderText: '或粘贴图片链接',
  blockUploadButton: '上传图片',
  blockCaptionPlaceholderText: '写图片说明',
  blockUploadPlaceholderText: '或粘贴图片链接',
}
const CODE_MIRROR_COPY = {
  previewToggleText: (previewOnly) => (previewOnly ? '编辑' : '隐藏'),
}

/**
 * Crepe-backed WYSIWYG Markdown editor.
 *
 * Crepe owns the whole editing surface (top bar, selection bubble, slash menu,
 * table and code-block widgets). This component only bridges it to React: one
 * instance per mount, external `value` pushed in without echo, read-only mode,
 * and a "nearest heading" report for presence.
 *
 * @param {object} props
 * @param {string} props.value - Markdown source.
 * @param {(next: string) => void} [props.onChange] - User edits as Markdown.
 * @param {boolean} [props.readOnly] - Render read-only (editing chrome hidden).
 * @param {string} [props.ariaLabel] - Accessible name for the editor body.
 * @param {number|string} [props.minHeight] - Minimum editor height.
 * @param {(heading: string) => void} [props.onSelectionChange] - Nearest
 *   heading above the caret, reported so presence can say which section a
 *   reader is in.
 */
export default function MilkdownEditor({
  value,
  onChange,
  onSelectionChange,
  onUploadImage,
  readOnly = false,
  ariaLabel = '编辑文档',
  minHeight = 360,
}) {
  const hostRef = useRef(null)
  const crepeRef = useRef(null)
  const onChangeRef = useRef(onChange)
  const onSelectionChangeRef = useRef(onSelectionChange)
  const suppressRef = useRef(false)
  const readOnlyRef = useRef(readOnly)
  const initialValueRef = useRef(value)
  const uploadRef = useRef(onUploadImage)
  onChangeRef.current = onChange
  onSelectionChangeRef.current = onSelectionChange
  readOnlyRef.current = readOnly
  uploadRef.current = onUploadImage

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined
    let disposed = false
    let created = false

    const crepe = new CrepeBuilder({
      root: host,
      defaultValue: initialValueRef.current == null ? '' : String(initialValueRef.current),
    })
    for (const feature of FEATURES) crepe.addFeature(feature)
    crepe.addFeature(placeholder, PLACEHOLDER)
    crepe.addFeature(linkTooltip, LINK_TOOLTIP)
    crepe.addFeature(codeMirror, CODE_MIRROR_COPY)
    // Paste/drop goes through the Host so the file lands in `assets/` and the
    // document keeps a relative path (the display URL is rewritten back on save).
    crepe.addFeature(imageBlock, {
      ...IMAGE_COPY,
      onUpload: (file) => (uploadRef.current ? uploadRef.current(file) : Promise.reject(new Error('图片上传未启用'))),
    })

    crepe.on((listener) => {
      listener.markdownUpdated((_ctx, markdown) => {
        if (suppressRef.current) return
        onChangeRef.current?.(markdown)
      })
      let timer = null
      listener.selectionUpdated((ctx, selection) => {
        if (!onSelectionChangeRef.current) return
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          try {
            const view = ctx.get(editorViewCtx)
            let heading = ''
            view.state.doc.descendants((node, pos) => {
              if (node.type.name === 'heading' && pos < selection.from) heading = node.textContent
              return pos < selection.from
            })
            onSelectionChangeRef.current?.(heading)
          } catch { /* editor torn down */ }
        }, 400)
      })
    })

    void crepe.create().then(() => {
      created = true
      if (disposed) { void crepe.destroy(); return }
      crepeRef.current = crepe
      crepe.setReadonly(readOnlyRef.current)
      try {
        host.querySelector('.ProseMirror')?.setAttribute('aria-label', ariaLabel)
        host.querySelector('.ProseMirror')?.setAttribute('role', 'textbox')
        host.querySelector('.ProseMirror')?.setAttribute('aria-multiline', 'true')
      } catch { /* cosmetic */ }
    }).catch((error) => {
      console.error('[dsh-space] editor create failed', error)
    })

    return () => {
      disposed = true
      const current = crepeRef.current
      crepeRef.current = null
      if (current) void current.destroy()
      else if (!created) void crepe.destroy()
    }
    // Created once per mount; live values are read through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Push external value changes in without echoing them back through onChange.
  useEffect(() => {
    const crepe = crepeRef.current
    if (!crepe) return
    const next = value == null ? '' : String(value)
    if (crepe.getMarkdown() === next) return
    suppressRef.current = true
    try {
      crepe.editor.action(replaceAll(next))
    } finally {
      suppressRef.current = false
    }
  }, [value])

  useEffect(() => {
    const crepe = crepeRef.current
    if (!crepe) return
    crepe.setReadonly(readOnly)
  }, [readOnly])

  return (
    <div
      className="dsh-md"
      data-readonly={readOnly ? 'true' : 'false'}
      style={{ minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight }}
    >
      <style>{CREPE_CSS}</style>
      <div ref={hostRef} className="dsh-md-host" />
    </div>
  )
}
