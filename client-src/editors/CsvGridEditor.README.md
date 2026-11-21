# CsvGridEditor

A small, controlled, editable CSV grid built on `react-data-grid@7.0.0-beta.47`
for the DSH sheet editor.

## Usage

```jsx
import CsvGridEditor from './editors/CsvGridEditor.jsx'

<CsvGridEditor
  columns={columns}            // [{ key: 'c0', title: 'A' }, ...]
  rows={mergedRows}            // string[][] - parent merges pending edits
  onCellChange={(row, column, value) => changeCell(row, column, value)}
  minHeight={360}
/>
```

The host injects `react-data-grid/lib/styles.css`; this file does **not**
import any CSS.

## Contract

```jsx
export default function CsvGridEditor({
  columns,       // [{ key: 'c0', title: 'A' }, ...]
  rows,          // string[][]; already merged with pending edits by the parent
  onCellChange,  // (rowIndex, columnIndex, value) => void
  minHeight = 360,
})
```

## How edits flow

- DataGrid rows are built as `{ id: rowIndex, c0: ..., c1: ... }`; the row key is
  the row index.
- `columns` are mapped from the parent's `{ key, title }` to DataGrid's
  `{ key, name }` and made editable with `renderEditCell: textEditor`.
- `onRowsChange(nextRows)` walks `nextRows` and compares each cell against the
  current `rows` prop. For every cell whose value differs it calls
  `onCellChange(rowIndex, columnIndex, newValue)`. Unchanged cells are skipped,
  and DataGrid's `RowsChangeData` argument is not used as the source of truth.
- There is no local cell state: the parent applies the edit and passes a new
  merged `rows` matrix back in. The component never becomes a second source of
  truth.

## Styling

- Wrapper: `height: '100%', minHeight, width: '100%'`; the grid fills it with
  `height: '100%'`.
- `className="sp-csv-grid"`, `rowHeight={32}`,
  `defaultColumnOptions = { resizable: true, minWidth: 100 }`.
- RDG theme variables (`--rdg-color`, `--rdg-background-color`,
  `--rdg-border-color`, `--rdg-selection-color`) are set to DSH aliases with
  light fallbacks, so the grid follows DSH light/dark theming.

## Limitations / notes

- `react-data-grid` is a beta (`7.0.0-beta.47`). Column header text uses `name`
  in v7 (there is no `flex` property; use `width`/`minWidth`/`maxWidth`).
- Because the grid is fully controlled, the parent must merge the reported
  edit into `rows` synchronously (or near-synchronously) for the typed value to
  appear immediately; until the new `rows` prop arrives the grid re-renders
  from the old matrix.
- No "Add row" control is rendered - the parent owns row creation.
