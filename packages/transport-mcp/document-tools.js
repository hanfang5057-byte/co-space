import MarkdownIt from 'markdown-it';
import { createHash } from 'node:crypto';

const markdown = new MarkdownIt('commonmark');
const fail = (code, message, details) => { throw Object.assign(new Error(message), { code, details }); };
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const boundary = (text, position) => position === 0 || position === text.length || !(text.charCodeAt(position - 1) >= 0xd800 && text.charCodeAt(position - 1) <= 0xdbff && text.charCodeAt(position) >= 0xdc00 && text.charCodeAt(position) <= 0xdfff);

export function requireVersion(document, version) {
  if (document.version !== version) fail('VERSION_CONFLICT', 'Document changed; read it again', { currentVersion: document.version });
}

export function page(items, { limit = 50, cursor }, identity) {
  const fingerprint = hash(identity);
  let offset = 0;
  if (cursor) {
    let state;
    try { state = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')); } catch { fail('INVALID_CURSOR', 'Invalid pagination cursor'); }
    if (state.fingerprint !== fingerprint || !Number.isSafeInteger(state.offset) || state.offset < 0 || state.offset > items.length) fail('INVALID_CURSOR', 'Pagination cursor is stale or invalid');
    offset = state.offset;
  }
  const result = items.slice(offset, offset + limit);
  const next = offset + result.length;
  return { items: result, ...(next < items.length ? { nextCursor: Buffer.from(JSON.stringify({ fingerprint, offset: next })).toString('base64url') } : {}) };
}

export function outline(content) {
  const offsets = [0];
  for (let i = 0; i < content.length; i++) if (content[i] === '\n') offsets.push(i + 1);
  const tokens = markdown.parse(content, {});
  const headings = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type !== 'heading_open' || !token.map) continue;
    const [start, end] = token.map;
    headings.push({ title: tokens[i + 1]?.content || '', level: Number(token.tag.slice(1)), from: offsets[start] ?? content.length, headingTo: offsets[end] ?? content.length });
  }
  return headings.map((heading, index) => ({ ...heading, to: headings.slice(index + 1).find(item => item.level <= heading.level)?.from ?? content.length }));
}

export function readRange(content, from, to) {
  if (to < from || to > content.length || !boundary(content, from) || !boundary(content, to)) fail('INVALID_RANGE', 'Invalid UTF-16 range');
  if (to - from > 100_000) fail('LIMIT_EXCEEDED', 'Range exceeds 100000 UTF-16 code units');
  return content.slice(from, to);
}

export function findMatches(content, query, caseSensitive) {
  // Match original text so positions remain valid when Unicode case folding expands.
  const escape = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expression = new RegExp(escape, caseSensitive ? 'gu' : 'giu');
  const matches = [];
  for (const match of content.matchAll(expression)) {
    const from = match.index;
    const to = from + match[0].length;
    let contextFrom = Math.max(0, from - 80), contextTo = Math.min(content.length, to + 80);
    if (!boundary(content, contextFrom)) contextFrom--;
    if (!boundary(content, contextTo)) contextTo++;
    matches.push({ from, to, text: match[0], contextFrom, contextTo, context: content.slice(contextFrom, contextTo) });
  }
  return matches;
}
