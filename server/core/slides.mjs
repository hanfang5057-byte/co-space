import { Marp } from '@marp-team/marp-core'
import matter from 'gray-matter'

const THEME_CSS = `/* @theme dsh */
section {
  background: #ffffff;
  color: #1f2328;
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", sans-serif;
  font-size: 32px;
  padding: 64px 72px;
}
section.lead {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
h1 { color: #111827; font-size: 56px; line-height: 1.15; }
h2 { color: #1f2937; font-size: 40px; }
h3 { color: #374151; font-size: 32px; }
p, li { line-height: 1.55; }
strong { color: #0f172a; }
code { background: #f3f4f6; padding: 0.1em 0.35em; border-radius: 4px; }
table { border-collapse: collapse; font-size: 26px; }
th, td { border: 1px solid #d1d5db; padding: 8px 14px; text-align: left; }
th { background: #f3f4f6; }
blockquote { border-left: 4px solid #9ca3af; padding-left: 16px; color: #4b5563; }
`

const marp = new Marp({ html: false })
marp.themeSet.add(THEME_CSS)

export const SLIDE_TEMPLATES = {
  blank: [{ layout: 'title', title: 'Untitled', subtitle: '' }, { layout: 'bullets', title: 'Overview', bullets: [''] }],
  review: [
    { layout: 'title', title: 'Review', subtitle: '' },
    { layout: 'bullets', title: 'Results', bullets: [''] },
    { layout: 'bullets', title: 'Risks', bullets: [''] },
    { layout: 'bullets', title: 'Next steps', bullets: [''] },
  ],
  pitch: [
    { layout: 'title', title: 'Pitch', subtitle: '' },
    { layout: 'bullets', title: 'Problem', bullets: [''] },
    { layout: 'bullets', title: 'Solution', bullets: [''] },
    { layout: 'bullets', title: 'Market', bullets: [''] },
    { layout: 'bullets', title: 'Ask', bullets: [''] },
  ],
}

function tableMarkdown(table) {
  const columns = table.columns || table.headers || []
  const rows = table.rows || []
  if (!columns.length) return ''
  const cell = value => String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
  return [
    `| ${columns.map(cell).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map(row => `| ${columns.map((_, index) => cell(row[index])).join(' | ')} |`),
  ].join('\n')
}

export function serializeSlide(slide) {
  const notes = slide.notes ? `\n\n<!-- ${String(slide.notes).replace(/-->/g, '--&gt;')} -->` : ''
  const layout = slide.layout || (slide.layout === 'section' ? 'section' : 'bullets')
  if (layout === 'title') {
    return `<!-- _class: lead -->\n\n# ${slide.title || 'Untitled'}${slide.subtitle ? `\n\n${slide.subtitle}` : ''}${notes}`
  }
  if (layout === 'section') {
    return `<!-- _class: lead -->\n\n# ${slide.title || 'Section'}${notes}`
  }
  if (layout === 'table') {
    return `## ${slide.title || 'Table'}\n\n${tableMarkdown(slide.table || slide)}${notes}`
  }
  const bullets = Array.isArray(slide.bullets) ? slide.bullets : []
  const body = bullets.map(item => {
    if (typeof item === 'string') return `- ${item}`
    const indent = '  '.repeat(Math.max(0, Number(item.level) || 0))
    return `${indent}- ${item.text ?? ''}`
  }).join('\n')
  return `## ${slide.title || 'Untitled'}${body ? `\n\n${body}` : ''}${notes}`
}

export function createSlidesMarkdown({ title, slides, markdown, template = 'blank' }) {
  if (markdown && String(markdown).trim()) {
    let text = String(markdown).trim()
    if (!text.startsWith('---\n')) {
      text = ['---', 'marp: true', 'theme: dsh', 'paginate: true', `title: ${JSON.stringify(title || 'Untitled')}`, '---', '', text].join('\n')
    }
    return text.replace(/\s*$/, '') + '\n'
  }
  const list = Array.isArray(slides) && slides.length ? slides : SLIDE_TEMPLATES[template] || SLIDE_TEMPLATES.blank
  const front = ['---', 'marp: true', 'theme: dsh', 'paginate: true', `title: ${JSON.stringify(title || 'Untitled')}`, '---', ''].join('\n')
  return front + list.map(serializeSlide).join('\n\n---\n\n') + '\n'
}

export function parseSlides(text) {
  const raw = String(text ?? '')
  let data = {}
  let content = raw
  try {
    const parsed = matter(raw)
    data = parsed.data || {}
    content = parsed.content
  } catch {}
  const chunks = content.split(/\n\s*---\s*\n/)
  const slides = chunks.map((chunk, index) => {
    const clean = chunk.trim()
    const notes = [...clean.matchAll(/<!--([\s\S]*?)-->/g)].map(match => match[1].trim()).filter(note => note && !note.startsWith('_')).join('\n')
    const heading = clean.match(/^\s{0,3}#{1,6}\s+(.+)$/m)
    return { index, title: heading ? heading[1].trim() : `Slide ${index + 1}`, markdown: clean, notes }
  }).filter(slide => slide.markdown)
  return { frontmatter: data, slides, title: data.title || slides[0]?.title || 'Untitled' }
}

export function renderSlides(text) {
  const { html, css, comments } = marp.render(String(text ?? ''))
  return { kind: 'slides', html, css, comments, title: parseSlides(text).title }
}

export function slideOutline(text) {
  return parseSlides(text).slides.map(slide => ({ index: slide.index, title: slide.title, notes: slide.notes }))
}
