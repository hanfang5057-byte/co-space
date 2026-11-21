import React, { useCallback, useMemo } from 'react'
import DataGrid, { textEditor } from 'react-data-grid'

const EMPTY_COLUMNS = []
const EMPTY_ROWS = []

/**
 * Controlled, editable CSV grid for the DSH sheet editor.
 *
 * The parent owns the data: it merges pending edits into `rows` and passes the
 * merged matrix back in. This component keeps no copy of cell values, it only
 * derives DataGrid row/column objects and reports changed cells upwards.
 *
 * @param {object}   props
 * @param {Array<{key: string, title?: string}>} props.columns column definitions
 * @param {string[][]} props.rows  cell matrix, already merged with pending edits
 * @param {(rowIndex: number, columnIndex: number, value: string) => void} props.onCellChange
 * @param {number}   [props.minHeight=360] minimum wrapper height in px
 */
export default function CsvGridEditor({
  columns,
  rows,
  onCellChange,
  minHeight = 360,
}) {
  const columnDefs = columns || EMPTY_COLUMNS
  const rowData = rows || EMPTY_ROWS

  // Map the parent's {key, title} columns onto DataGrid's {key, name} columns.
  // The column key is also the property name used on the row objects below.
  const gridColumns = useMemo(() => columnDefs.map(column => ({
    key: column.key,
    name: column.title ?? column.key,
    editable: true,
    renderEditCell: textEditor,
  })), [columnDefs])

  // DataGrid rows: { id: rowIndex, c0: ..., c1: ... }. Row id is the row index
  // so it stays stable even while the parent merges edits into new arrays.
  const gridRows = useMemo(() => rowData.map((row, rowIndex) => {
    const gridRow = { id: rowIndex }
    for (let columnIndex = 0; columnIndex < columnDefs.length; columnIndex++) {
      gridRow[columnDefs[columnIndex].key] = row[columnIndex] ?? ''
    }
    return gridRow
  }), [rowData, columnDefs])

  const defaultColumnOptions = useMemo(() => ({
    resizable: true,
    minWidth: 100,
  }), [])

  // Controlled grid: compare the next rows against the current `rows` prop and
  // report only cells whose value actually changed. DataGrid's own
  // RowsChangeData (indexes/column) is intentionally not used as the source of
  // truth - the merged `rows` prop is.
  const handleRowsChange = useCallback((nextRows) => {
    if (typeof onCellChange !== 'function') return
    for (let rowIndex = 0; rowIndex < nextRows.length; rowIndex++) {
      const currentRow = rowData[rowIndex]
      if (!currentRow) continue
      const nextRow = nextRows[rowIndex]
      for (let columnIndex = 0; columnIndex < columnDefs.length; columnIndex++) {
        const key = columnDefs[columnIndex].key
        const nextValue = nextRow[key] ?? ''
        const currentValue = currentRow[columnIndex] ?? ''
        if (nextValue !== currentValue) {
          onCellChange(rowIndex, columnIndex, String(nextValue))
        }
      }
    }
  }, [rowData, columnDefs, onCellChange])

  // Tie RDG's theme variables to DSH aliases. The fallbacks are the DSH light
  // defaults; when DSH runs in dark mode the aliases resolve to dark values.
  const gridStyle = useMemo(() => ({
    height: '100%',
    '--rdg-color': 'var(--dsw-alias-label-primary, #1f2328)',
    '--rdg-background-color': 'var(--dsw-alias-bg-layer-1, #fff)',
    '--rdg-border-color': 'var(--dsw-alias-border-l1, #d0d7de)',
    '--rdg-selection-color': 'var(--dsw-alias-brand-primary, #3b6fd8)',
  }), [])

  return (
    <div style={{ height: '100%', minHeight, width: '100%', flex: '1 1 auto' }}>
      <DataGrid
        className="sp-csv-grid"
        style={gridStyle}
        columns={gridColumns}
        rows={gridRows}
        rowKeyGetter={(row) => row.id}
        onCellClick={({ selectCell }) => selectCell(true)}
        onRowsChange={handleRowsChange}
        defaultColumnOptions={defaultColumnOptions}
        rowHeight={32}
      />
    </div>
  )
}
