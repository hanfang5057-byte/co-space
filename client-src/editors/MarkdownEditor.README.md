# MarkdownEditor

A controlled CodeMirror 6 Markdown editor for DSH spaces. It is a single,
self-contained React component: CodeMirror injects its own styles, so there are
no CSS imports and no extra stylesheet files to wire up.

## Usage

```jsx
import MarkdownEditor from './editors/MarkdownEditor.jsx'

<MarkdownEditor
  value={draft}
  onChange={(next) => setDraft(next)}
  ariaLabel="编辑内容"
  minHeight={360}
/>
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `string` | — | Controlled Markdown source. |
| `onChange` | `(next: string) => void` | — | Fired only for user document edits. |
| `ariaLabel` | `string` | `'编辑内容'` | `aria-label` on the editable `.cm-content` element. |
| `minHeight` | `number \| string` | `360` | Minimum height of the container (`number` is treated as px). |

## Behavior / implementation notes

- One `EditorView` is created on mount and destroyed on unmount.
- `onChange` and the initial `value` are read from refs, so the view is never
  recreated on re-render.
- External `value` changes are compared with `view.state.doc.toString()` before
  dispatching a replacement. The replacement transaction is tagged with a
  custom `Annotation`, and the update listener ignores annotated doc changes.
  This prevents both echoing an external update back through `onChange` and
  infinite update loops.
- `ariaLabel` is held in a `Compartment` and reconfigured if the prop changes.

## Enabled features

Markdown language, line wrapping, tab size 2, history (undo/redo), default,
history, search and `Tab`-indent keymaps, `indentOnInput`, bracket matching,
`drawSelection`, `dropCursor`, and a DSH-variable-based theme (all colors use
`var(--dsw-alias-…, fallback)`, so dark mode is readable).

## Limitations

- No search panel styling is provided. The search keymap works (`Mod-f`,
  `Mod-g`, etc.), but the default CodeMirror search panel is left unstyled, so
  it may not match the DSH theme visually.
- No explicit syntax-highlight style or line-number gutter is configured (the
  gutter style rules exist in case one is added later).
- The container uses `minHeight` plus `.cm-editor { height: 100% }`; for the
  editor to fill available space, place it in a parent with a definite height
  (for example a flex column), as the existing `sp-content-inner` layout does.
