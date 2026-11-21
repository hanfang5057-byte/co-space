import { parse } from 'csv-parse/sync'
import { stringify } from 'csv-stringify/sync'
import { httpError } from './util.mjs'

function delimiterFor(text, requested) {
  if (requested) return requested
  const line = String(text).split(/\r?\n/).find(Boolean) || ''
  const candidates = [',', '\t', ';']
  let best = ','
  let bestCount = -1
  for (const candidate of candidates) {
    const count = line.split(candidate).length
    if (count > bestCount) { best = candidate; bestCount = count }
  }
  return best
}

export function parseTable(text, { delimiter, hasHeader = true } = {}) {
  const input = String(text ?? '').replace(/^\uFEFF/, '')
  const records = parse(input, {
    delimiter: delimiterFor(input, delimiter),
    skip_empty_lines: true,
    relax_column_count: true,
    trim: false,
  })
  const width = Math.max(0, ...records.map(row => row.length))
  const padded = records.map(row => [...row, ...Array(Math.max(0, width - row.length)).fill('')])
  const header = hasHeader ? padded.shift() || [] : Array.from({ length: width }, (_, index) => `Column ${index + 1}`)
  return { header, rows: padded }
}

export function readTable(text, { delimiter, hasHeader = true, offset = 0, limit = 200 } = {}) {
  const parsed = parseTable(text, { delimiter, hasHeader })
  const total = parsed.rows.length
  const start = Math.max(0, Number(offset) || 0)
  const end = Math.min(total, start + Math.max(1, Math.min(2000, Number(limit) || 200)))
  return {
    delimiter: delimiterFor(String(text ?? ''), delimiter),
    columns: parsed.header.map((title, index) => ({ key: `c${index}`, title })),
    rows: parsed.rows.slice(start, end),
    total,
    offset: start,
    limit: end - start,
    hasHeader,
  }
}

function normalizeRows(rows, columns) {
  if (!Array.isArray(rows)) return []
  if (!rows.length) return []
  if (Array.isArray(rows[0])) return rows
  if (columns?.length) return rows.map(row => columns.map(column => row?.[column.key] ?? row?.[column.title] ?? ''))
  return rows.map(row => Object.values(row ?? {}))
}

export function tableText({ columns, rows, hasHeader = true, delimiter = ',' }) {
  const header = hasHeader ? (columns || []).map(column => column.title ?? column.key ?? '') : []
  const body = normalizeRows(rows, columns).map(row => row.map(cell => {
    if (cell && typeof cell === 'object' && 'formula' in cell) return `=${cell.formula}`
    return cell
  }))
  return stringify(hasHeader ? [header, ...body] : body, { delimiter })
}

export function createTableText({ columns, rows, hasHeader = true, delimiter = ',', template = 'blank' }) {
  if (Array.isArray(rows) && rows.length && !columns?.length) {
    return stringify(rows, { delimiter })
  }
  if (template === 'tracker' && !columns?.length) {
    return stringify([
      ['Status', 'Owner', 'Due', 'Notes'],
      ['Todo', '', '', ''],
      ['Doing', '', '', ''],
      ['Done', '', '', ''],
    ], { delimiter })
  }
  if (template === 'budget' && !columns?.length) {
    return stringify([
      ['Item', 'Budget', 'Actual', 'Variance'],
      ['', 0, 0, ''],
    ], { delimiter })
  }
  return tableText({ columns: columns || [{ key: 'a', title: 'A' }, { key: 'b', title: 'B' }], rows: rows || [['', '']], hasHeader, delimiter })
}

export function updateTableText(text, { rows, mode = 'append', range, hasHeader = true, delimiter = ',' }) {
  if (!Array.isArray(rows)) throw httpError('INVALID_INPUT', 'rows must be an array')
  const parsed = parseTable(text, { delimiter, hasHeader })
  const additions = normalizeRows(rows)
  let nextRows
  if (mode === 'replace') nextRows = additions
  else nextRows = [...parsed.rows, ...additions]
  return stringify(hasHeader ? [parsed.header, ...nextRows] : nextRows, { delimiter: delimiterFor(String(text ?? ''), delimiter) })
}
