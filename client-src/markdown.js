import MarkdownIt from 'markdown-it';

const markdown = new MarkdownIt({ html: false, linkify: false, breaks: false });
const deletedMarkdown = new MarkdownIt({ html: false, linkify: false, breaks: false });
deletedMarkdown.renderer.rules.link_open = () => '';
deletedMarkdown.renderer.rules.link_close = () => '';
deletedMarkdown.renderer.rules.image = (tokens, index) => escapeHtml(tokens[index].content);

const escapeHtml = value => String(value).replace(/[&<>"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]);
const inlineMarkdown = value => markdown.renderInline(String(value)).replace(/\n/g, '<br>');
const insertedText = (item, mode = 'markdown') => `<ins class="space-suggestion-insert" data-suggestion-id="${escapeHtml(item.id)}">${mode === 'code' ? escapeHtml(item.replacement) : inlineMarkdown(item.replacement)}</ins>`;

/**
 * Match one rendered text token back onto the Markdown source.
 *
 * Markdown-it normalises entities and backslash escapes in text tokens, so the
 * rendered string is not always byte-identical to the source. Walk both strings
 * and return runs whose rendered text maps to an exact source range. Plain runs
 * stay merged so a DOM text offset inside a run maps 1:1 to a source offset;
 * entity/escape runs carry their whole source construct.
 * @param {string} source - complete Markdown source.
 * @param {number} start - source offset to begin searching from.
 * @param {string} rendered - decoded text emitted by markdown-it.
 * @returns {{runs: Array<{text: string, from: number, to: number}>, end: number}|null}
 */
function matchText(source, start, rendered) {
  if (!rendered) return { runs: [], end: start };
  let cursor = start;
  let index = 0;
  let plain = null;
  const runs = [];
  const pushPlain = (character, from, to) => {
    if (plain && plain.to === from) {
      plain.text += character;
      plain.to = to;
    } else {
      plain = { text: character, from, to };
      runs.push(plain);
    }
  };
  while (index < rendered.length) {
    const character = rendered[index];
    if (source[cursor] === '&') {
      const semi = source.indexOf(';', cursor + 1);
      if (semi > cursor && semi - cursor <= 32) {
        const decoded = markdown.utils.unescapeAll(source.slice(cursor, semi + 1));
        if (decoded && decoded !== source.slice(cursor, semi + 1) && rendered.startsWith(decoded, index)) {
          runs.push({ text: decoded, from: cursor, to: semi + 1 });
          plain = null;
          cursor = semi + 1;
          index += decoded.length;
          continue;
        }
      }
    }
    if (source[cursor] === '\\' && cursor + 1 < source.length && source[cursor + 1] === character) {
      runs.push({ text: character, from: cursor, to: cursor + 2 });
      plain = null;
      cursor += 2;
      index += 1;
      continue;
    }
    if (source[cursor] === character) {
      pushPlain(character, cursor, cursor + 1);
      cursor += 1;
      index += 1;
      continue;
    }
    return null;
  }
  return { runs, end: cursor };
}

/** Skip inline syntax only when the rendered text maps exactly to source. */
function findTextMatch(source, start, rendered) {
  const direct = matchText(source, start, rendered);
  if (direct) return direct;
  for (let position = start + 1; position < source.length; position += 1) {
    if (source[position] !== rendered[0] && source[position] !== '&' && source[position] !== '\\') continue;
    const matched = matchText(source, position, rendered);
    if (matched) return matched;
  }
  return null;
}

function findMatchingMarkdownBracket(source, openIndex) {
  let depth = 0;
  let codeTicks = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    if (source[index] === '\\') { index += 1; continue; }
    if (source[index] === '`') {
      let end = index;
      while (source[end + 1] === '`') end += 1;
      const run = end - index + 1;
      if (!codeTicks) codeTicks = run;
      else if (codeTicks === run) codeTicks = 0;
      index = end;
      continue;
    }
    if (codeTicks) continue;
    if (source[index] === '[') depth += 1;
    if (source[index] === ']' && --depth === 0) return index;
  }
  return -1;
}

function findMatchingMarkdownParen(source, openIndex) {
  let depth = 0;
  let codeTicks = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    if (source[index] === '\\') { index += 1; continue; }
    if (source[index] === '`') {
      let end = index;
      while (source[end + 1] === '`') end += 1;
      const run = end - index + 1;
      if (!codeTicks) codeTicks = run;
      else if (codeTicks === run) codeTicks = 0;
      index = end;
      continue;
    }
    if (codeTicks) continue;
    if (source[index] === '(') depth += 1;
    if (source[index] === ')' && --depth === 0) return index;
  }
  return -1;
}

function lineStartOffsets(source) {
  const starts = [0];
  for (let index = 0; index < source.length; index += 1) if (source[index] === '\n') starts.push(index + 1);
  return starts;
}

function fenceSource(token, source, starts) {
  if (!token.map) return null;
  const lineStart = starts[token.map[0]];
  if (!Number.isInteger(lineStart)) return null;
  const firstBreak = source.indexOf('\n', lineStart);
  if (firstBreak < 0) return null;
  const codeStart = firstBreak + 1;
  if (source.slice(codeStart, codeStart + token.content.length) === token.content) return { from: codeStart, to: codeStart + token.content.length };
  const at = source.indexOf(token.content, lineStart);
  return at < 0 ? null : { from: at, to: at + token.content.length };
}

function codeBlockLines(token, source, starts) {
  if (!token.map) return null;
  const parts = token.content.match(/[^\n]*\n|[^\n]+$/g);
  if (!parts) return null;
  const lines = [];
  for (let index = 0; index < parts.length; index += 1) {
    const lineStart = starts[token.map[0] + index];
    if (!Number.isInteger(lineStart)) return null;
    const lineEnd = source.indexOf('\n', lineStart);
    const sourceLine = source.slice(lineStart, lineEnd < 0 ? source.length : lineEnd);
    const part = parts[index];
    const body = part.endsWith('\n') ? part.slice(0, -1) : part;
    if (!body) {
      if (lineEnd < 0) return null;
      lines.push({ from: lineStart, to: lineStart + 1, text: '\n' });
      continue;
    }
    const at = sourceLine.indexOf(body);
    if (at < 0) return null;
    const from = lineStart + at;
    const to = from + part.length;
    if (source.slice(from, to) !== part) return null;
    lines.push({ from, to, text: part });
  }
  return lines;
}

function annotateInline(token, source, cursor) {
  let position = cursor;
  const children = token.children || [];
  const links = [];
  for (const child of children) {
    switch (child.type) {
      case 'text': {
        const matched = findTextMatch(source, position, child.content);
        if (matched) {
          if (matched.runs.length) child.meta = { ...(child.meta || {}), spaceRuns: matched.runs };
          position = matched.end;
        }
        break;
      }
      case 'code_inline': {
        const marker = child.markup || '`';
        const open = source.indexOf(marker, position);
        if (open < 0) break;
        const from = open + marker.length;
        const to = from + child.content.length;
        if (source.slice(from, to) === child.content) {
          child.meta = { ...(child.meta || {}), spaceSrc: { from, to } };
          position = to;
          if (source.slice(position, position + marker.length) === marker) position += marker.length;
        } else {
          const at = source.indexOf(child.content, open + marker.length);
          if (at >= 0) {
            child.meta = { ...(child.meta || {}), spaceSrc: { from: at, to: at + child.content.length } };
            position = at + child.content.length;
          }
        }
        break;
      }
      case 'image': {
        const open = source.indexOf('![', position);
        if (open < 0) break;
        const labelClose = findMatchingMarkdownBracket(source, open + 1);
        const destinationOpen = labelClose >= 0 && source[labelClose + 1] === '(' ? labelClose + 1 : -1;
        const referenceOpen = labelClose >= 0 && source[labelClose + 1] === '[' ? labelClose + 1 : -1;
        const referenceClose = referenceOpen >= 0 ? findMatchingMarkdownBracket(source, referenceOpen) : -1;
        const close = destinationOpen >= 0 ? findMatchingMarkdownParen(source, destinationOpen)
          : referenceClose >= 0 ? referenceClose : labelClose;
        if (close >= 0) position = close + 1;
        break;
      }
      case 'link_open': {
        const autolink = child.markup === 'autolink';
        const open = source.indexOf(autolink ? '<' : '[', position);
        child.meta = { ...(child.meta || {}), spaceAutolink: autolink, spaceLinkOpen: open };
        links.push(child);
        break;
      }
      case 'link_close': {
        const opening = links.pop();
        const autolink = opening?.meta?.spaceAutolink;
        if (autolink) {
          if (source[position] === '>') position += 1;
          break;
        }
        const open = opening?.meta?.spaceLinkOpen ?? -1;
        const close = open >= 0 ? findMatchingMarkdownBracket(source, open) : -1;
        if (close < 0) break;
        if (source[close + 1] === '(') {
          const end = findMatchingMarkdownParen(source, close + 1);
          position = end >= 0 ? end + 1 : close + 1;
        } else if (source[close + 1] === '[') {
          const end = findMatchingMarkdownBracket(source, close + 1);
          position = end >= 0 ? end + 1 : close + 1;
        } else {
          position = close + 1;
        }
        break;
      }
      case 'softbreak':
      case 'hardbreak': {
        const end = source.indexOf('\n', position);
        if (end >= 0) position = end + 1;
        break;
      }
      case 'html_inline':
        position += child.content.length;
        break;
      default:
        break;
    }
  }
  return position;
}

function annotateTokens(tokens, source) {
  const starts = lineStartOffsets(source);
  let cursor = 0;
  for (const token of tokens) {
    if (token.map) {
      token.meta = { ...(token.meta || {}), spaceBlockRange: {
        from: starts[token.map[0]],
        to: starts[token.map[1]] ?? source.length,
      } };
    }
    if (token.type === 'inline') {
      if (token.map && Number.isInteger(starts[token.map[0]])) cursor = Math.max(cursor, starts[token.map[0]]);
      cursor = annotateInline(token, source, cursor);
    } else if (token.type === 'fence') {
      const range = fenceSource(token, source, starts);
      if (range) {
        token.meta = { ...(token.meta || {}), spaceSrc: range };
        cursor = Math.max(cursor, range.to);
        const closing = source.indexOf('\n', range.to);
        if (closing >= 0) cursor = Math.max(cursor, closing + 1);
      }
    } else if (token.type === 'code_block') {
      const lines = codeBlockLines(token, source, starts);
      if (lines?.length) {
        token.meta = { ...(token.meta || {}), spaceLines: lines };
        cursor = Math.max(cursor, lines[lines.length - 1].to);
      }
    }
  }
}

markdown.renderer.rules.text = (tokens, index, options, env) => {
  const token = tokens[index];
  if (env.projection) {
    return (token.meta?.spaceBeforeHtml || '')
      + renderProjectedTextRun(token.meta?.spaceRuns || [], token.content, env)
      + (token.meta?.spaceAfterHtml || '');
  }
  const runs = token.meta?.spaceRuns;
  const before = token.meta?.spaceBeforeHtml || '';
  const rendered = runs?.length ? runs.map(run => renderTextRun(run, env.suggestions)).join('') : escapeHtml(token.content);
  return before + rendered + (token.meta?.spaceAfterHtml || '');
};

const blockOpenTypes = ['blockquote_open', 'bullet_list_open', 'ordered_list_open', 'list_item_open', 'heading_open', 'paragraph_open', 'table_open', 'thead_open', 'tbody_open', 'tr_open', 'th_open', 'td_open'];
const blockCloseTypes = ['blockquote_close', 'bullet_list_close', 'ordered_list_close', 'list_item_close', 'heading_close', 'paragraph_close', 'table_close', 'thead_close', 'tbody_close', 'tr_close', 'th_close', 'td_close'];

for (const type of blockOpenTypes) {
  markdown.renderer.rules[type] = (tokens, index, options) =>
    markdown.renderer.renderToken(tokens, index, options) + (tokens[index].meta?.spaceAfterHtml || '');
}

for (const type of blockCloseTypes) {
  markdown.renderer.rules[type] = (tokens, index, options) =>
    (tokens[index].meta?.spaceAfterHtml || '') + markdown.renderer.renderToken(tokens, index, options);
}

function renderTextRun(run, suggestions) {
  return renderSourceSegments(run.text, run.from, suggestions, {
    sourceEnd: run.to,
    mode: 'markdown',
    showDeletedWhitespace: true,
  });
}

/** Apply pending replacements to a preview copy and retain a source map. */
function createReviewProjection(source, suggestions) {
  const edits = suggestions
    .filter(item => item.status === 'pending'
      && Number.isInteger(item.from) && Number.isInteger(item.to)
      && item.from >= 0 && item.from <= item.to && item.to <= source.length
      && source.slice(item.from, item.to) === item.expected)
    .toSorted((left, right) => left.from - right.from || left.to - right.to || (left.order || 0) - (right.order || 0));
  const chunks = [];
  const projectedEdits = [];
  let sourceCursor = 0;
  let projectedCursor = 0;
  let projectedSource = '';
  for (const item of edits) {
    if (item.from < sourceCursor) continue;
    if (item.from > sourceCursor) {
      const text = source.slice(sourceCursor, item.from);
      chunks.push({ kind: 'source', projectedFrom: projectedCursor, projectedTo: projectedCursor + text.length, sourceFrom: sourceCursor });
      projectedSource += text;
      projectedCursor += text.length;
    }
    const previewFrom = projectedCursor;
    projectedSource += item.replacement;
    projectedCursor += item.replacement.length;
    projectedEdits.push({ ...item, previewFrom, previewTo: projectedCursor });
    sourceCursor = item.to;
  }
  if (sourceCursor < source.length) {
    const text = source.slice(sourceCursor);
    chunks.push({ kind: 'source', projectedFrom: projectedCursor, projectedTo: projectedCursor + text.length, sourceFrom: sourceCursor });
    projectedSource += text;
  }
  return {
    source: projectedSource,
    edits: projectedEdits,
    sourceRange(from, to) {
      const chunk = chunks.find(item => from >= item.projectedFrom && to <= item.projectedTo);
      return chunk ? { from: chunk.sourceFrom + from - chunk.projectedFrom, to: chunk.sourceFrom + to - chunk.projectedFrom } : null;
    },
  };
}

function projectedDeletion(edit, mode) {
  const content = mode === 'code' ? escapeHtml(edit.expected) : deletedMarkdown.renderInline(edit.expected);
  return `<del class="space-src space-suggestion-delete" data-src-from="${edit.from}" data-src-to="${edit.to}" data-suggestion-id="${suggestionId(edit)}">${content}</del>`;
}

function renderProjectedTextRun(runs, fallbackText, env) {
  if (!runs.length) return escapeHtml(fallbackText);
  return runs.map(run => renderProjectedSourceSegments(run.text, run.from, env, 'markdown', run.to)).join('');
}

function placeProjectionFallbacks(tokens, projection) {
  const ranges = tokenSourceRanges(tokens);
  for (const edit of projection.edits) {
    if (!edit.replacement || ranges.some(range => edit.previewFrom < range.to && edit.previewTo > range.from)) continue;
    const deleted = edit.expected
      ? `<del class="space-src space-suggestion-delete" data-src-from="${edit.from}" data-src-to="${edit.to}" data-suggestion-id="${suggestionId(edit)}">${sourceTextForDisplay(edit.expected)}</del>`
      : '';
    const inserted = `<ins class="space-suggestion-insert space-suggestion-source-insert" data-suggestion-id="${suggestionId(edit)}">${sourceTextForDisplay(edit.replacement)}</ins>`;
    const markup = deleted + inserted;
    const inlineIndex = tokens.findIndex(token => token.type === 'inline' && tokenContains(token, { from: edit.previewFrom, to: edit.previewTo }));
    const targetIndex = inlineIndex >= 0 ? inlineIndex : tokens.findIndex(token => token.type === 'inline');
    if (targetIndex < 0) continue;
    const target = tokens[targetIndex];
    const mappedChildren = (target.children || []).flatMap((child, index) => {
      const childRanges = child.meta?.spaceRuns || (child.meta?.spaceSrc ? [child.meta.spaceSrc] : []);
      return child.type === 'text' && childRanges.length ? [{ child, index, ranges: childRanges }] : [];
    });
    const next = mappedChildren.find(entry => entry.ranges.some(range => range.from >= edit.previewFrom));
    const previous = mappedChildren.filter(entry => entry.ranges.some(range => range.to <= edit.previewFrom)).at(-1);
    const anchor = next?.child || previous?.child;
    if (anchor) {
      const edge = next ? 'spaceBeforeHtml' : 'spaceAfterHtml';
      anchor.meta = { ...(anchor.meta || {}), [edge]: `${anchor.meta?.[edge] || ''}${markup}` };
      continue;
    }
    const block = tokens[targetIndex + 1]?.type?.endsWith('_close') ? tokens[targetIndex + 1]
      : tokens[targetIndex - 1]?.type?.endsWith('_open') ? tokens[targetIndex - 1] : null;
    if (block) block.meta = { ...(block.meta || {}), spaceAfterHtml: `${block.meta?.spaceAfterHtml || ''}${markup}` };
  }
}

/** Render one parsed text run against the post-acceptance preview source. */
function renderProjectedSourceSegments(text, from, env, mode = 'code', sourceEnd = from + text.length) {
  const projection = env.projection;
  const sourceAt = offset => from + Math.round(offset / (text.length || 1) * (sourceEnd - from));
  const textAt = offset => Math.round((offset - from) / ((sourceEnd - from) || 1) * text.length);
  const relevant = projection.edits.filter(edit => edit.previewFrom === edit.previewTo
    ? edit.previewFrom >= from && edit.previewFrom <= sourceEnd
    : edit.previewFrom < sourceEnd && edit.previewTo > from);
  const points = new Set([0, text.length]);
  for (const edit of relevant) {
    points.add(clamp(textAt(Math.max(from, Math.min(sourceEnd, edit.previewFrom))), 0, text.length));
    points.add(clamp(textAt(Math.max(from, Math.min(sourceEnd, edit.previewTo))), 0, text.length));
  }
  const cuts = [...points].sort((left, right) => left - right);
  let html = '';
  for (let index = 0; index < cuts.length - 1; index += 1) {
    const start = cuts[index], end = cuts[index + 1];
    const previewFrom = sourceAt(start), previewTo = sourceAt(end);
    for (const edit of relevant) {
      if (!env.deletedEdits.has(edit.id) && edit.expected && edit.previewFrom < previewTo && edit.previewTo > previewFrom) {
        html += projectedDeletion(edit, mode);
        env.deletedEdits.add(edit.id);
      }
      if (edit.previewFrom === edit.previewTo && edit.expected && edit.previewFrom === previewFrom && !env.deletedEdits.has(edit.id)) {
        html += projectedDeletion(edit, mode);
        env.deletedEdits.add(edit.id);
      }
    }
    const raw = text.slice(start, end);
    const edit = relevant.find(item => item.previewFrom < item.previewTo && item.previewFrom < previewTo && item.previewTo > previewFrom);
    if (edit) {
      html += `<ins class="space-suggestion-insert" data-suggestion-id="${suggestionId(edit)}">${escapeHtml(raw)}</ins>`;
      env.insertedEdits.add(edit.id);
    } else {
      const mapped = projection.sourceRange(previewFrom, previewTo);
      html += mapped
        ? `<span class="space-src" data-src-from="${mapped.from}" data-src-to="${mapped.to}">${escapeHtml(raw)}</span>`
        : escapeHtml(raw);
    }
  }
  for (const edit of relevant) {
    if (edit.previewFrom === edit.previewTo && edit.expected && edit.previewFrom === sourceEnd && !env.deletedEdits.has(edit.id)) {
      html += projectedDeletion(edit, mode);
      env.deletedEdits.add(edit.id);
    }
  }
  return html;
}

/** Render source-backed text with the same interval logic in prose and code. */
function renderSourceSegments(text, from, suggestions, { sourceEnd = from + text.length, mode = 'code', showDeletedWhitespace = false } = {}) {
  const sourceLength = sourceEnd - from;
  const sourceAt = offset => from + Math.round(offset / (text.length || 1) * sourceLength);
  const textAt = offset => sourceLength === text.length ? offset - from : Math.round((offset - from) / (sourceLength || 1) * text.length);
  const relevant = suggestions.filter(item => item.from === item.to
    ? item.from >= from && item.from <= sourceEnd
    : item.from < sourceEnd && item.to > from);
  const points = new Set([0, text.length]);
  for (const item of relevant) {
    points.add(clamp(textAt(Math.max(from, Math.min(sourceEnd, item.from))), 0, text.length));
    points.add(clamp(textAt(Math.max(from, Math.min(sourceEnd, item.to))), 0, text.length));
  }
  const cuts = [...points].sort((left, right) => left - right);
  let html = '';
  for (let index = 0; index < cuts.length - 1; index += 1) {
    const start = cuts[index], end = cuts[index + 1];
    const sourceFrom = sourceAt(start), sourceTo = sourceAt(end);
    for (const item of relevant.filter(entry => entry.from === entry.to && textAt(entry.from) === start)) html += insertedText(item, mode);
    const suggestion = relevant.find(item => item.from < item.to && item.from < sourceTo && item.to > sourceFrom);
    const raw = text.slice(start, end);
    const content = suggestion && showDeletedWhitespace && !raw.trim() ? sourceTextForDisplay(raw) : escapeHtml(raw);
    html += suggestion
      ? `<del class="space-src space-suggestion-delete" data-src-from="${sourceFrom}" data-src-to="${sourceTo}" data-suggestion-id="${suggestionId(suggestion)}">${content}</del>`
      : `<span class="space-src" data-src-from="${sourceFrom}" data-src-to="${sourceTo}">${content}</span>`;
    for (const item of relevant.filter(entry => entry.from < entry.to && entry.replacement && entry.to > sourceFrom && entry.to <= sourceTo)) html += insertedText(item, mode);
  }
  for (const item of relevant.filter(entry => entry.from === entry.to && textAt(entry.from) === text.length)) html += insertedText(item, mode);
  return html;
}

markdown.renderer.rules.code_inline = (tokens, index, options, env) => {
  const token = tokens[index];
  const range = token.meta?.spaceSrc;
  if (env.projection && range) return `<code class="space-inline-code">${renderProjectedSourceSegments(token.content, range.from, env, 'code', range.to)}</code>`;
  if (!range || !hasSuggestionInRange(range.from,range.to,env.suggestions)) {
    const data=range?` data-src-from="${range.from}" data-src-to="${range.to}"`:'';
    return `<code class="space-src space-inline-code"${data}>${escapeHtml(token.content)}</code>`;
  }
  return `<code class="space-inline-code">${renderSourceText(token.content,range.from,env.suggestions)}</code>`;
};

markdown.renderer.rules.fence = (tokens, index, options, env) => {
  const token = tokens[index];
  const info = token.info ? markdown.utils.unescapeAll(token.info).trim() : '';
  const language = info.split(/\s+/g)[0];
  const range = token.meta?.spaceSrc;
  const languageClass = language ? ` class="language-${escapeHtml(language)} space-src"` : ' class="space-src"';
  if (env.projection && range) {
    return `<pre class="space-code-block"><code${languageClass}>${renderProjectedSourceSegments(token.content, range.from, env, 'code', range.to)}</code></pre>\n`;
  }
  if (env.projection && range) {
    return `<pre class="space-code-block"><code${languageClass}>${renderProjectedSourceSegments(token.content, range.from, env, 'code')}</code></pre>\n`;
  }
  if (!range || !hasSuggestionInRange(range.from,range.to,env.suggestions)) {
    const data=range?` data-src-from="${range.from}" data-src-to="${range.to}"`:'';
    return `<pre class="space-code-block"><code${languageClass}${data}>${escapeHtml(token.content)}${token.meta?.spaceAfterCodeHtml || ''}</code></pre>\n`;
  }
  return `<pre class="space-code-block"><code${languageClass}>${renderSourceText(token.content,range.from,env.suggestions)}${token.meta?.spaceAfterCodeHtml || ''}</code></pre>\n`;
};

markdown.renderer.rules.code_block = (tokens, index, options, env) => {
  const token = tokens[index];
  const lines = token.meta?.spaceLines;
  if (env.projection && lines?.length) {
    const body = lines.map(line => renderProjectedSourceSegments(line.text, line.from, env, 'code', line.to)).join('');
    return `<pre class="space-code-block"><code class="space-src">${body}</code></pre>\n`;
  }
  if (lines?.length) {
    if (!lines.some(line=>hasSuggestionInRange(line.from,line.to,env.suggestions))) {
      const body=lines.map(line=>`<span class="space-src" data-src-from="${line.from}" data-src-to="${line.to}">${escapeHtml(line.text)}</span>`).join('');
      return `<pre class="space-code-block"><code class="space-src">${body}${token.meta?.spaceAfterCodeHtml || ''}</code></pre>\n`;
    }
    const body = lines.map(line => renderSourceText(line.text,line.from,env.suggestions)).join('');
    return `<pre class="space-code-block"><code class="space-src">${body}${token.meta?.spaceAfterCodeHtml || ''}</code></pre>\n`;
  }
  return `<pre class="space-code-block"><code class="space-src">${escapeHtml(token.content)}${token.meta?.spaceAfterCodeHtml || ''}</code></pre>\n`;
};

function renderSourceText(text, from, suggestions, mode = 'code') {
  return renderSourceSegments(text, from, suggestions, { mode });
}

function hasSuggestionInRange(from,to,suggestions) {
  return suggestions.some(item=>item.from===item.to?item.from>=from&&item.from<=to:item.from<to&&item.to>from);
}

markdown.renderer.rules.table_open = (tokens, index) =>
  `<div class="space-table-wrap"><table>\n${tokens[index].meta?.spaceAfterHtml || ''}`;
markdown.renderer.rules.table_close = (tokens, index) =>
  (tokens[index].meta?.spaceAfterHtml || '') + '</table></div>\n';

/**
 * Render Markdown and annotate text/code nodes with their source ranges.
 * Raw HTML stays escaped; callers keep using a single sanitised HTML insertion.
 * @param {string} source - accepted Markdown source.
 * @returns {string} escaped HTML with `data-src-from` / `data-src-to` markers.
 */
export function renderMarkdown(source, suggestions = []) {
  const active = suggestions.filter(item => item.status === 'pending' || item.status === 'conflicted');
  if (active.some(item => item.status === 'conflicted')) {
    const tokens = markdown.parse(source, {});
    annotateTokens(tokens, source);
    placeUnmappedSuggestions(tokens, source, active);
    return markdown.renderer.render(tokens, markdown.options, { suggestions: active });
  }
  const projection = createReviewProjection(source, active);
  if (projection.edits.length !== active.length) {
    const tokens = markdown.parse(source, {});
    annotateTokens(tokens, source);
    placeUnmappedSuggestions(tokens, source, active);
    return markdown.renderer.render(tokens, markdown.options, { suggestions: active });
  }
  const tokens = markdown.parse(projection.source, {});
  annotateTokens(tokens, projection.source);
  placeProjectionFallbacks(tokens, projection);
  const env = { projection, deletedEdits: new Set(), insertedEdits: new Set() };
  return markdown.renderer.render(tokens, markdown.options, env);
}

const suggestionId = item => escapeHtml(item.id);

function listItemsForInsertion(replacement) {
  const lines=replacement.split(/\r?\n/).map(line=>line.replace(/^(?:\s*>\s*)+/,''));
  const roots=[],stack=[];
  for(const line of lines){
    if(!line.trim())continue;
    const match=line.match(/^(\s*)([-+*]|\d+[.)])\s+(.+)$/);
    if(match){
      const item={text:match[3],level:match[1].replace(/\t/g,'  ').length,ordered:/^\d/.test(match[2]),children:[]};
      while(stack.length&&stack.at(-1).level>=item.level)stack.pop();
      if(stack.length)stack.at(-1).children.push(item);else roots.push(item);
      stack.push(item);
    }
    else if(stack.length)stack.at(-1).text+=`\n${line.trim()}`;
    else return null;
  }
  return roots.length?roots:null;
}

function renderListItems(items,suggestionId,point=null){
  let first=true;
  const render=item=>{
    const anchor=point&&first?point:`data-suggestion-id="${suggestionId}"`;
    first=false;
    const nested=item.children.length?`<${item.children[0].ordered?'ol':'ul'}>${item.children.map(render).join('')}</${item.children[0].ordered?'ol':'ul'}>`:'';
    return `<li class="space-suggestion-insert-block"><ins class="space-suggestion-insert" ${anchor}>${inlineMarkdown(item.text)}</ins>${nested}</li>`;
  };
  return items.map(render).join('');
}

function splitTableRow(line) {
  const value=line.trim().replace(/^\|/,'').replace(/\|$/,'');
  const cells=[];let cell='',escaped=false,codeTicks=0;
  for(let index=0;index<value.length;index+=1){
    const character=value[index];
    if(character==='`'&&!escaped){let end=index;while(value[end+1]==='`')end+=1;const run=end-index+1;codeTicks=codeTicks===0?run:codeTicks===run?0:codeTicks;cell+=value.slice(index,end+1);index=end;continue;}
    if(character==='|'&&!escaped&&codeTicks===0){cells.push(cell.trim());cell='';continue;}
    cell+=character;
    if(character==='\\'&&!escaped)escaped=true;else escaped=false;
  }
  cells.push(cell.trim());
  return cells.length>1?cells:null;
}

function tableRowsForInsertion(replacement) {
  const lines=replacement.split(/\r?\n/).filter(line=>line.trim());
  if(!lines.length||lines.some(line=>!line.trim().startsWith('|')))return null;
  const rows=lines.map(splitTableRow);
  return rows.every(row=>row?.length>1)?rows:null;
}

function replacementStructure(text) {
  const list = listItemsForInsertion(text);
  if (list?.length) return { kind: 'list', items: list };
  const rows = tableRowsForInsertion(text);
  if (rows?.length) return { kind: 'table', rows };
  return null;
}

function sourceTextForDisplay(text) {
  if (!text) return '';
  const whitespaceOnly = !text.trim();
  return escapeHtml(text)
    .replace(/\t/g, whitespaceOnly ? '⇥' : '\t')
    .replace(/ /g, whitespaceOnly ? '·' : ' ')
    .replace(/\r?\n/g, '↵<br>');
}

function tokenSourceRanges(tokens) {
  return tokens.flatMap(token => {
    if (token.type === 'inline') return (token.children || []).flatMap(child => [
      ...(child.meta?.spaceRuns || []),
      ...(child.meta?.spaceSrc ? [child.meta.spaceSrc] : []),
    ]);
    if (token.meta?.spaceSrc) return [token.meta.spaceSrc];
    return token.meta?.spaceLines || [];
  });
}

function suggestionIsRendered(item, ranges) {
  return item.from === item.to
    ? ranges.some(range => item.from >= range.from && item.from <= range.to)
    : ranges.some(range => item.from < range.to && item.to <= range.to && item.to > range.from);
}

function pairTokenBlocks(tokens) {
  const stack = [];
  const closeByOpen = new Map();
  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index].nesting === 1) stack.push(index);
    if (tokens[index].nesting === -1) {
      const open = stack.pop();
      if (open !== undefined) closeByOpen.set(open, index);
    }
  }
  return closeByOpen;
}

function tokenContains(token, item) {
  const range = token.meta?.spaceBlockRange;
  if (!range) return false;
  return item.from === item.to
    ? item.from >= range.from && item.from <= range.to
    : item.from < range.to && item.to > range.from;
}

function tableInsertionMarkup(rows, item) {
  const id = suggestionId(item);
  const point = `data-src-from="${item.from}" data-src-to="${item.to}" data-suggestion-id="${id}"`;
  return rows.map((cells, rowIndex) => `<tr class="space-suggestion-insert-row">${cells.map((cell, cellIndex) => {
    const anchor = rowIndex === 0 && cellIndex === 0 ? point : `data-suggestion-id="${id}"`;
    return `<td><ins class="space-suggestion-insert" ${anchor}>${inlineMarkdown(cell)}</ins></td>`;
  }).join('')}</tr>`).join('');
}

function fallbackMarkup(item, source, hasVisibleDeletion) {
  const id = suggestionId(item);
  const structure = replacementStructure(item.replacement || '');
  if (structure?.kind === 'list') {
    const point = item.from === item.to ? `data-src-from="${item.from}" data-src-to="${item.to}" data-suggestion-id="${id}"` : null;
    return renderListItems(structure.items, id, point);
  }
  if (structure?.kind === 'table') return tableInsertionMarkup(structure.rows, item);
  if (item.from === item.to) {
    const point = `data-src-from="${item.from}" data-src-to="${item.to}" data-suggestion-id="${id}"`;
    return `<ins class="space-suggestion-insert" ${point}>${inlineMarkdown(item.replacement)}</ins>`;
  }
  const inserted = `<ins class="space-suggestion-insert" data-suggestion-id="${id}">${inlineMarkdown(item.replacement)}</ins>`;
  if (hasVisibleDeletion) return inserted;
  return `<span class="space-suggestion-source-diff" data-suggestion-id="${id}"><del class="space-src space-suggestion-delete" data-src-from="${item.from}" data-src-to="${item.to}" data-suggestion-id="${id}">${sourceTextForDisplay(source.slice(item.from, item.to))}</del>${inserted}</span>`;
}

/** Attach suggestions with no visible source anchor to their Markdown token. */
function placeUnmappedSuggestions(tokens, source, suggestions) {
  const ranges = tokenSourceRanges(tokens);
  const closeByOpen = pairTokenBlocks(tokens);
  for (const item of suggestions) {
    if (suggestionIsRendered(item, ranges)) continue;
    const structure = replacementStructure(item.replacement || '');
    const blockType = structure?.kind === 'table' ? 'tr_open' : structure?.kind === 'list' ? 'list_item_open' : null;
    const blockOpen = blockType ? tokens.findIndex(token => token.type === blockType && tokenContains(token, item)) : -1;
    const blockClose = blockOpen >= 0 ? closeByOpen.get(blockOpen) : undefined;
    const inlineIndex = tokens.findIndex(token => token.type === 'inline' && tokenContains(token, item));
    const nearestInline = inlineIndex >= 0 ? inlineIndex : tokens.findIndex(token => token.type === 'inline');
    const codeIndex = tokens.findIndex(token => ['fence', 'code_block'].includes(token.type) && tokenContains(token, item));
    const hasVisibleDeletion = item.from < item.to && ranges.some(range => item.from < range.to && item.to > range.from);
    const markup = fallbackMarkup(item, source, hasVisibleDeletion);
    let targetIndex = blockClose ?? (codeIndex >= 0 ? codeIndex : nearestInline);
    if (targetIndex < 0) continue;
    let target = tokens[targetIndex];
    if (target.type === 'inline') {
      const children = target.children || [];
      const mappedChildren = children.flatMap((child, index) => {
        const childRanges = child.meta?.spaceRuns || (child.meta?.spaceSrc ? [child.meta.spaceSrc] : []);
        return child.type === 'text' && childRanges.length ? [{ child, index, ranges: childRanges }] : [];
      });
      let anchor;
      let edge;
      if (hasVisibleDeletion) {
        const overlap = mappedChildren.filter(entry => entry.ranges.some(range => item.from < range.to && item.to > range.from)).at(-1);
        if (overlap) { anchor = overlap.child; edge = 'spaceAfterHtml'; }
      } else if (mappedChildren.length) {
        const previous = mappedChildren.filter(entry => entry.ranges.some(range => range.to <= item.from)).at(-1);
        if (previous) { anchor = previous.child; edge = 'spaceAfterHtml'; }
        else { anchor = mappedChildren[0].child; edge = 'spaceBeforeHtml'; }
      }
      if (anchor) {
        anchor.meta = { ...(anchor.meta || {}), [edge]: `${anchor.meta?.[edge] || ''}${markup}` };
        continue;
      }
      const blockIndex = hasVisibleDeletion ? targetIndex + 1 : targetIndex - 1;
      const block = tokens[blockIndex];
      if (block && block.type.endsWith(hasVisibleDeletion ? '_close' : '_open')) {
        targetIndex = blockIndex;
        target = block;
      }
    }
    const code = ['fence', 'code_block'].includes(target.type);
    const codeMarkup = code
      ? `<span class="space-suggestion-insert" data-suggestion-id="${suggestionId(item)}">${sourceTextForDisplay(item.replacement)}</span>`
      : markup;
    const property = code ? 'spaceAfterCodeHtml' : 'spaceAfterHtml';
    target.meta = { ...(target.meta || {}), [property]: `${target.meta?.[property] || ''}${codeMarkup}` };
  }
}

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

/** Index the annotated DOM nodes of one rendered paper. */
export function readSourceSpans(surface) {
  if (!surface?.querySelectorAll) return [];
  return [...surface.querySelectorAll('[data-src-from][data-src-to]')]
    .map((element, order) => {
      const from = Number(element.dataset.srcFrom);
      const to = Number(element.dataset.srcTo);
      const textNode = element.firstChild?.nodeType === 3 ? element.firstChild : null;
      return { element, textNode, from, to, order, textLength: textNode?.nodeValue.length || 0 };
    })
    .filter(span => Number.isInteger(span.from) && Number.isInteger(span.to) && span.to >= span.from && span.textNode)
    .sort((left, right) => left.from - right.from || left.to - right.to || left.order - right.order);
}

function textOffsetFor(span, sourceOffset) {
  const sourceLength = span.to - span.from;
  if (sourceLength <= 0) return 0;
  if (span.textLength === sourceLength) return clamp(sourceOffset - span.from, 0, span.textLength);
  if (sourceOffset <= span.from) return 0;
  if (sourceOffset >= span.to) return span.textLength;
  return Math.round(((sourceOffset - span.from) / sourceLength) * span.textLength);
}

function startSpanFor(spans, offset) {
  for (const span of spans) if (span.from <= offset && offset < span.to) return span;
  for (const span of spans) if (span.from === offset) return span;
  for (let index = spans.length - 1; index >= 0; index -= 1) if (spans[index].to === offset) return spans[index];
  const next = spans.find(span => span.from >= offset);
  if (next) return next;
  return offset >= spans[spans.length - 1].to ? spans[spans.length - 1] : spans[0];
}

function endSpanFor(spans, offset) {
  for (const span of spans) if (span.from < offset && offset <= span.to) return span;
  for (let index = spans.length - 1; index >= 0; index -= 1) if (spans[index].from < offset) return spans[index];
  const next = spans.find(span => span.from >= offset);
  if (next) return next;
  return offset > spans[spans.length - 1].to ? spans[spans.length - 1] : spans[0];
}

/**
 * Map one Markdown source range onto a DOM Range over annotated text.
 * @param {Array} spans - output of readSourceSpans.
 * @param {number} from - inclusive UTF-16 source offset.
 * @param {number} to - exclusive UTF-16 source offset.
 * @returns {{range: Range, startSpan: object, endSpan: object}|null}
 */
export function sourceRangeToDom(spans, from, to) {
  if (!spans.length || !Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < from) return null;
  const startSpan = startSpanFor(spans, from);
  const endSpan = to > from ? endSpanFor(spans, to) : startSpan;
  if (!startSpan || !endSpan) return null;
  const range = document.createRange();
  range.setStart(startSpan.textNode, textOffsetFor(startSpan, from));
  range.setEnd(endSpan.textNode, textOffsetFor(endSpan, to));
  return { range, startSpan, endSpan };
}

/** Convert client rects into coordinates relative to the stage/wrap origin. */
export function rangeRects(range, origin) {
  let list = [];
  try { list = [...range.getClientRects()]; } catch { list = []; }
  if (!list.length) {
    try {
      const rect = range.getBoundingClientRect();
      if (rect && (rect.width || rect.height)) list = [rect];
    } catch { list = []; }
  }
  return list
    .filter(rect => rect && (rect.width > 0 || rect.height > 0))
    .map(rect => ({
      left: rect.left - origin.left,
      top: rect.top - origin.top,
      right: rect.right - origin.left,
      bottom: rect.bottom - origin.top,
      width: rect.width,
      height: rect.height,
    }));
}

function sourceOffsetInside(span, localOffset) {
  const clamped = clamp(localOffset, 0, span.textLength);
  const sourceLength = span.to - span.from;
  if (span.textLength === sourceLength) return span.from + clamped;
  if (!span.textLength) return span.from;
  return span.from + Math.round((clamped / span.textLength) * sourceLength);
}

function boundarySourceOffset(node, offset, spans, side) {
  if (!node) return null;
  if (node.nodeType === 3) {
    const element = node.parentElement?.closest('[data-src-from]');
    const span = spans.find(item => item.element === element);
    return span ? sourceOffsetInside(span, offset) : null;
  }
  const element = node.nodeType === 1 ? node : node.parentElement;
  const ownSpan = spans.find(item => item.element === element);
  if (ownSpan) return sourceOffsetInside(ownSpan, offset === 0 ? 0 : ownSpan.textLength);
  const children = [...(element?.childNodes || [])];
  const order = side === 'end' ? children.slice(0, offset).reverse() : children.slice(offset);
  for (const child of order) {
    const candidate = child.nodeType === 1 ? (child.closest?.('[data-src-from]') || child.querySelector?.('[data-src-from]')) : null;
    if (!candidate) continue;
    const span = spans.find(item => item.element === candidate);
    if (span) return side === 'end' ? span.to : span.from;
  }
  return null;
}

/**
 * Use a DOM selection inside the rendered paper as a comment anchor.
 * The returned offsets are UTF-16 source offsets, so the server keeps a single
 * coordinate system and comments never depend on the source textarea.
 */
export function capturePreviewSelection(surface, range, content, version) {
  if (!surface || !range || !content) return null;
  const spans = readSourceSpans(surface);
  if (!spans.length) return null;
  let from = boundarySourceOffset(range.startContainer, range.startOffset, spans, 'start');
  let to = boundarySourceOffset(range.endContainer, range.endOffset, spans, 'end');
  if (!Number.isInteger(from) || !Number.isInteger(to)) {
    const quote = range.toString().trim();
    if (!quote) return null;
    const at = content.indexOf(quote);
    if (at < 0) return null;
    from = at;
    to = at + quote.length;
  }
  if (from > to) [from, to] = [to, from];
  const raw = content.slice(from, to);
  const leading = raw.length - raw.trimStart().length;
  const trailing = raw.length - raw.trimEnd().length;
  from += leading;
  to -= trailing;
  if (from >= to) return null;
  if (from > 0 && content.charCodeAt(from - 1) >= 0xd800 && content.charCodeAt(from - 1) <= 0xdbff
    && content.charCodeAt(from) >= 0xdc00 && content.charCodeAt(from) <= 0xdfff) return null;
  if (to < content.length && content.charCodeAt(to - 1) >= 0xd800 && content.charCodeAt(to - 1) <= 0xdbff
    && content.charCodeAt(to) >= 0xdc00 && content.charCodeAt(to) <= 0xdfff) return null;
  const wrap = surface.closest('.space-paper-wrap');
  if (!wrap) return null;
  const wrapRect = wrap.getBoundingClientRect();
  const rects = rangeRects(range, wrapRect).map(rect => ({ ...rect, left: rect.left + wrap.scrollLeft, top: rect.top + wrap.scrollTop }));
  const first = rects[0] || { left: 0, top: 0, bottom: 0, width: 0, height: 0 };
  return {
    from,
    to,
    version,
    quote: content.slice(from, to),
    anchor: {
      x: first.left + first.width / 2,
      top: first.top,
      bottom: Math.max(first.top + first.height, ...rects.map(rect => rect.bottom)),
      wrapWidth: wrap.clientWidth,
    },
    rects,
  };
}

function scrollableAncestor(element) {
  let node = element?.parentElement;
  while (node && node !== document.body) {
    const style = getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) return node;
    node = node.parentElement;
  }
  return element?.closest('.space-paper-wrap') || null;
}

/** Scroll the preview so a source range is visible, without opening the source. */
export function scrollSourceRange(surface, from, to) {
  if (!surface) return false;
  const mapped = sourceRangeToDom(readSourceSpans(surface), from, to);
  if (!mapped) return false;
  let rect = null;
  try { rect = mapped.range.getBoundingClientRect(); } catch { rect = null; }
  if (!rect || (!rect.width && !rect.height)) rect = mapped.startSpan.element.getBoundingClientRect();
  if (!rect) return false;
  const container = scrollableAncestor(surface);
  if (!container) return true;
  const containerRect = container.getBoundingClientRect();
  let top = container.scrollTop;
  if (rect.top < containerRect.top + 64) top += rect.top - containerRect.top - 64;
  else if (rect.bottom > containerRect.bottom - 64) top += rect.bottom - containerRect.bottom + 64;
  container.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
  return true;
}
