import { promises as fs } from 'node:fs'
import { fileSlug, httpError, resolveInside, sha256 } from './util.mjs'
import { createDocumentMarkdown, appendDocument } from './markdown.mjs'
import { createSlidesMarkdown, parseSlides, renderSlides } from './slides.mjs'
import { createTableText, readTable, updateTableText, editTableCells } from './tables.mjs'
import { readFile, writeFile } from './files.mjs'
import { resolveSpace } from './spaces.mjs'

function defaultPath(title, parent, ext) {
  const slug = fileSlug(title || 'untitled', 'untitled')
  const base = parent ? String(parent).replace(/\/+$/, '') : ''
  return `${base ? base + '/' : ''}${slug}${ext}`
}

export async function createDocumentFile(client, config, { space, path: rel, parent, title, markdown = '', template = 'blank' }) {
  const target = rel || defaultPath(title || 'Untitled', parent || 'pages', '.md')
  const content = createDocumentMarkdown({ title: title || 'Untitled', markdown, template })
  const file = await writeFile(client, config, { space, path: target, content, overwrite: false })
  return { ...file, title: title || 'Untitled', content }
}

export async function appendDocumentFile(client, config, { space, path: rel, markdown, expectedSha256 }) {
  const current = await readFile(client, config, { space, path: rel })
  const next = appendDocument(current.text, markdown)
  return writeFile(client, config, { space, path: rel, content: next, expectedSha256: expectedSha256 || current.sha256, overwrite: true, base: 'save' })
}

export async function createSheetFile(client, config, { space, path: rel, title, template = 'blank', columns, rows, hasHeader = true }) {
  const target = rel || `sheets/${fileSlug(title || (template === 'blank' ? 'table' : template), 'table')}.csv`
  const content = createTableText({ columns, rows, hasHeader, template })
  const file = await writeFile(client, config, { space, path: target, content, overwrite: false })
  return { ...file, content }
}

export async function readSheetFile(client, config, { space, path: rel, offset = 0, limit = 200, header = true }) {
  const { root } = await resolveSpace(client, space, config)
  const { rel: normalized, full } = await resolveInside(root, rel)
  const text = await fs.readFile(full, 'utf8')
  const table = readTable(text, { offset, limit, hasHeader: header })
  return { path: normalized, ...table, sha256: sha256(Buffer.from(text)) }
}

export async function editSheetCellsFile(client, config, { space, path: rel, edits, expectedSha256 }) {
  const current = await readFile(client, config, { space, path: rel })
  const next = editTableCells(current.text, edits)
  return writeFile(client, config, { space, path: rel, content: next, expectedSha256: expectedSha256 || current.sha256, overwrite: true, base: 'save' })
}

export async function updateSheetFile(client, config, { space, path: rel, rows, mode = 'append', expectedSha256 }) {
  const current = await readFile(client, config, { space, path: rel })
  const next = updateTableText(current.text, { rows, mode })
  return writeFile(client, config, { space, path: rel, content: next, expectedSha256: expectedSha256 || current.sha256, overwrite: true, base: 'save' })
}

export async function createSlidesFile(client, config, { space, path: rel, parent, title, template = 'blank', slides, markdown }) {
  const target = rel || defaultPath(title || 'Untitled', parent || 'pages', '.slides.md')
  const content = createSlidesMarkdown({ title: title || 'Untitled', slides, markdown, template })
  const file = await writeFile(client, config, { space, path: target, content, overwrite: false })
  return { ...file, content }
}

export async function readSlidesFile(client, config, { space, path: rel }) {
  const { root } = await resolveSpace(client, space, config)
  const { rel: normalized, full } = await resolveInside(root, rel)
  const text = await fs.readFile(full, 'utf8')
  const parsed = parseSlides(text)
  const rendered = renderSlides(text)
  return { path: normalized, ...parsed, html: rendered.html, css: rendered.css, sha256: sha256(Buffer.from(text)) }
}

export async function updateSlidesFile(client, config, { space, path: rel, markdown, index = 0, mode = 'replace', expectedSha256 }) {
  const current = await readFile(client, config, { space, path: rel })
  const parsed = parseSlides(current.text)
  const chunks = parsed.slides.map(slide => slide.markdown)
  if (mode === 'append') chunks.push(markdown)
  else {
    if (index < 0 || index >= chunks.length) throw httpError('INVALID_INPUT', 'slide index out of range')
    chunks[index] = markdown
  }
  const frontmatter = { marp: true, theme: 'dsh', paginate: true, title: parsed.title }
  const front = ['---', ...Object.entries(frontmatter).map(([key, value]) => `${key}: ${JSON.stringify(value)}`), '---', ''].join('\n')
  const next = front + chunks.join('\n\n---\n\n') + '\n'
  return writeFile(client, config, { space, path: rel, content: next, expectedSha256: expectedSha256 || current.sha256, overwrite: true, base: 'save' })
}
