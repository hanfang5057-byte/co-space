import { fileSlug } from './util.mjs'
import { createDocumentMarkdown, appendDocument } from './markdown.mjs'
import { readFile, writeFile } from './files.mjs'

function defaultPath(title, parent) {
  const slug = fileSlug(title || 'untitled', 'untitled')
  const base = parent ? String(parent).replace(/\/+$/, '') : ''
  return `${base ? base + '/' : ''}${slug}.md`
}

export async function createDocumentFile(client, config, { space, path: rel, parent, title, markdown = '', template = 'blank' }) {
  const target = rel || defaultPath(title || 'Untitled', parent || 'pages')
  const content = createDocumentMarkdown({ title: title || 'Untitled', markdown, template })
  const file = await writeFile(client, config, { space, path: target, content, overwrite: false })
  return { ...file, title: title || 'Untitled', content }
}

export async function appendDocumentFile(client, config, { space, path: rel, markdown, expectedSha256 }) {
  const current = await readFile(client, config, { space, path: rel })
  const next = appendDocument(current.text, markdown)
  return writeFile(client, config, { space, path: rel, content: next, expectedSha256: expectedSha256 || current.sha256, overwrite: true, base: 'save' })
}
