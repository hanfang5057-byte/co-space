import React, { useEffect, useRef } from 'react'
import { Annotation, Compartment, EditorState } from '@codemirror/state'
import {
  EditorView,
  drawSelection,
  dropCursor,
  keymap,
  lineNumbers,
} from '@codemirror/view'
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands'
import { bracketMatching, indentOnInput } from '@codemirror/language'
import { searchKeymap } from '@codemirror/search'
import { markdown } from '@codemirror/lang-markdown'

// Marker used to tag programmatic (external `value`) doc replacements, so the
// update listener can tell them apart from real user edits.
const externalDocChange = Annotation.define()

// All colors come from DSH CSS variables with safe fallbacks. Because DSH
// redefines those variables for dark mode, the editor stays readable in both
// themes without hardcoding a light-only palette.
const theme = EditorView.theme({
  '&': {
    height: '100%',
    boxSizing: 'border-box',
    border: '1px solid var(--dsw-alias-border-l1, #d0d7de)',
    borderRadius: '9px',
    backgroundColor: 'var(--dsw-alias-bg-layer-1, #fff)',
    color: 'var(--dsw-alias-label-primary, #1f2328)',
    fontSize: '13px',
  },
  '&.cm-focused': {
    outline: 'none',
    borderColor: 'var(--dsw-alias-brand-primary, #3b6fd8)',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    lineHeight: '1.7',
  },
  '.cm-content': {
    padding: '16px 18px',
    caretColor: 'var(--dsw-alias-brand-primary, #3b6fd8)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--dsw-alias-bg-layer-1, #fff)',
    color: 'var(--dsw-alias-label-secondary, #6b7280)',
    borderRight: '1px solid var(--dsw-alias-border-l1, #d0d7de)',
    borderTopLeftRadius: '8px',
    borderBottomLeftRadius: '8px',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: 'var(--dsw-alias-label-primary, #1f2328)',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--dsw-alias-brand-primary, #3b6fd8)',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'color-mix(in srgb, var(--dsw-alias-brand-primary, #3b6fd8) 24%, transparent)',
  },
  '.cm-panels': {
    backgroundColor: 'var(--dsw-alias-bg-layer-2, #f6f8fa)',
    color: 'var(--dsw-alias-label-primary, #1f2328)',
    borderColor: 'var(--dsw-alias-border-l1, #d0d7de)',
  },
  '.cm-panels input, .cm-panels button': {
    backgroundColor: 'var(--dsw-alias-bg-layer-1, #fff)',
    color: 'var(--dsw-alias-label-primary, #1f2328)',
    border: '1px solid var(--dsw-alias-border-l1, #d0d7de)',
    borderRadius: '5px',
  },
  '.cm-selectionMatch': {
    backgroundColor: 'color-mix(in srgb, var(--dsw-alias-brand-primary, #3b6fd8) 18%, transparent)',
  },
  '.cm-matchingBracket': {
    backgroundColor: 'color-mix(in srgb, var(--dsw-alias-brand-primary, #3b6fd8) 22%, transparent)',
    outline: '1px solid var(--dsw-alias-brand-primary, #3b6fd8)',
  },
})

/**
 * Controlled CodeMirror 6 Markdown editor.
 *
 * @param {object} props
 * @param {string} props.value          Markdown source (controlled).
 * @param {(next: string) => void} props.onChange  Called only for user edits.
 * @param {string} [props.ariaLabel]    aria-label on the editable element.
 * @param {number|string} [props.minHeight] Minimum height of the container.
 */
export default function MarkdownEditor({
  value,
  onChange,
  ariaLabel = '编辑内容',
  minHeight = 360,
}) {
  const containerRef = useRef(null)
  const viewRef = useRef(null)
  const onChangeRef = useRef(onChange)
  const valueRef = useRef(value)
  const ariaCompartmentRef = useRef(null)

  // Always call the latest onChange without recreating the EditorView.
  onChangeRef.current = onChange
  valueRef.current = value

  if (!ariaCompartmentRef.current) {
    ariaCompartmentRef.current = new Compartment()
  }

  // Create exactly one EditorView for the lifetime of the component.
  useEffect(() => {
    const parent = containerRef.current
    if (!parent) return undefined

    const state = EditorState.create({
      doc: valueRef.current == null ? '' : String(valueRef.current),
      extensions: [
        history(),
        markdown(),
        EditorView.lineWrapping,
        EditorState.tabSize.of(2),
        indentOnInput(),
        bracketMatching(),
        drawSelection(),
        dropCursor(),
        lineNumbers(),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          indentWithTab,
        ]),
        ariaCompartmentRef.current.of(
          EditorView.contentAttributes.of({ 'aria-label': ariaLabel }),
        ),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return
          // Ignore doc changes produced by our own external-value sync.
          const userEdit = update.transactions.some(
            (tr) => tr.docChanged && !tr.annotation(externalDocChange),
          )
          if (userEdit) onChangeRef.current(update.state.doc.toString())
        }),
        theme,
      ],
    })

    const view = new EditorView({ state, parent })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // The view is intentionally created once; live values are read from refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reconcile external `value` changes into the doc. The annotation marks the
  // transaction so the listener does not echo it back via onChange. When the
  // incoming value already equals the doc (the usual result of a user edit
  // round-tripping through the parent), we dispatch nothing, so no loop occurs.
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const next = value == null ? '' : String(value)
    if (view.state.doc.toString() === next) return
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: next },
      annotations: externalDocChange.of(true),
    })
  }, [value])

  // Keep the editable element's aria-label in sync if the prop changes.
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: ariaCompartmentRef.current.reconfigure(
        EditorView.contentAttributes.of({ 'aria-label': ariaLabel }),
      ),
    })
  }, [ariaLabel])

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight,
        height: '100%',
        flex: '1 1 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    />
  )
}
