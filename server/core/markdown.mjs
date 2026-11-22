import MarkdownIt from 'markdown-it'
import sanitizeHtml from 'sanitize-html'

const md = new MarkdownIt({ html: false, linkify: true, typographer: false })
md.enable('table')
md.enable('strikethrough')

const SANITIZE = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'blockquote',
    'ul', 'ol', 'li', 'strong', 'em', 's', 'del', 'code', 'pre',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a', 'img', 'span',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'rel'],
    img: ['src', 'alt', 'title'],
    code: ['class'],
    th: ['align'],
    td: ['align'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, rel: 'noreferrer noopener' } }),
  },
}

export const DOC_TEMPLATES = {
  blank: '',
  'project-brief': `## 目标\n\n\n## 范围\n\n\n## 里程碑\n\n\n## 风险\n\n\n## 决策\n\n`,
  'meeting-notes': `## 参会人\n\n\n## 议题\n\n\n## 决定\n\n\n## 行动项\n\n- [ ] \n`,
  'decision-log': `## 决策\n\n\n## 背景\n\n\n## 备选方案\n\n\n## 影响\n\n`,
}

export function titleOf(text, fallback = 'Untitled') {
  const heading = String(text ?? '').match(/^\s{0,3}#\s+(.+)$/m)
  return heading ? heading[1].trim() : fallback
}

export function renderMarkdownHtml(text) {
  return sanitizeHtml(md.render(String(text ?? '')), SANITIZE)
}

export function outlineMarkdown(text) {
  const tokens = md.parse(String(text ?? ''), {})
  const headings = []
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]
    if (token.type !== 'heading_open') continue
    const level = Number(token.tag.slice(1))
    const inline = tokens[index + 1]
    headings.push({ level, text: inline?.content || '', line: token.map?.[0] ?? null })
  }
  return headings
}

export function createDocumentMarkdown({ title, markdown, template = 'blank' }) {
  const body = String(markdown ?? '').trim()
  const hasH1 = /^\s{0,3}#\s+/m.test(body)
  const heading = title && !hasH1 ? `# ${title}\n\n` : ''
  const templateBody = !body && template && DOC_TEMPLATES[template] ? DOC_TEMPLATES[template] : ''
  return `${heading}${body || templateBody}`.replace(/\s+$/, '') + '\n'
}

export function appendDocument(markdown, addition) {
  return String(markdown ?? '').replace(/\s*$/, '') + '\n\n' + String(addition ?? '').trim() + '\n'
}

export function renderDocument(rel, text) {
  return {
    kind: 'document',
    path: rel,
    html: renderMarkdownHtml(text),
    outline: outlineMarkdown(text),
    title: titleOf(text),
  }
}
