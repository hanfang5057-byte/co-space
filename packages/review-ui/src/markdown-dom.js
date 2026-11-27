/** DOM coordinate mapping between annotated Markdown and browser ranges. */
import { renderMarkdown } from './markdown.js';
import { normalizeCommentRange, quoteOccurrenceRange, quoteOffsets } from './comment-range.js';

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

/** Index the annotated DOM nodes of one rendered paper. */
export function readSourceSpans(surface, markdownSource = '') {
  if (!surface?.querySelectorAll) return [];
  const spans = [...surface.querySelectorAll('[data-src-from][data-src-to]')]
    .map((element, order) => {
      const from = Number(element.dataset.srcFrom);
      const to = Number(element.dataset.srcTo);
      const textNode = element.firstChild?.nodeType === 3 ? element.firstChild : null;
      return { element, textNode, from, to, order, textLength: textNode?.nodeValue.length || 0 };
    })
    .filter(span => Number.isInteger(span.from) && Number.isInteger(span.to) && span.to >= span.from && span.textNode)
    .sort((left, right) => left.from - right.from || left.to - right.to || left.order - right.order);
  if (spans.length || !markdownSource || typeof document === 'undefined') return spans;
  const root = surface.querySelector('.ProseMirror');
  if (!root) return [];
  const cached = surface.__spaceSourceSpans;
  if (cached?.source === markdownSource && cached.root === root) return cached.spans;

  const rendered = document.createElement('div');
  rendered.innerHTML = renderMarkdown(markdownSource);
  const sourceSegments = [...rendered.querySelectorAll('[data-src-from][data-src-to]')]
    .map((element, order) => ({
      from: Number(element.dataset.srcFrom),
      to: Number(element.dataset.srcTo),
      text: element.textContent || '',
      order,
    }))
    .filter(segment => Number.isInteger(segment.from) && Number.isInteger(segment.to) && segment.to >= segment.from && segment.text)
    .sort((left, right) => left.from - right.from || left.to - right.to || left.order - right.order);
  if (!sourceSegments.length) return [];

  const actualMap = [], walker = document.createTreeWalker(root, 4, {
    acceptNode(node) {
      return node.parentElement?.closest('.space-suggestion-insert,.label-wrapper,.milkdown-toolbar,.milkdown-block-handle,.milkdown-slash-menu,.milkdown-table-block .handle,.milkdown-table-block .line-handle,.milkdown-table-block .cell-handle,.milkdown-table-block .add-button,.milkdown-table-block .button-group,.milkdown-code-block .language-picker,.milkdown-code-block .tools') ? 2 : 1;
    },
  });
  let actualText = '', node;
  while ((node = walker.nextNode())) {
    for (let offset = 0; offset < node.nodeValue.length; offset += 1) {
      const character = node.nodeValue[offset];
      if (/\s/.test(character)) {
        if (actualText.endsWith(' ')) continue;
        actualText += ' ';
      } else actualText += character;
      actualMap.push({ node, offset });
    }
  }

  const mapped = [];
  let cursor = 0;
  for (const segment of sourceSegments) {
    const normalized = segment.text.replace(/\s+/g, ' ').trim();
    if (!normalized) continue;
    const start = actualText.indexOf(normalized, cursor);
    if (start < 0) continue;
    const end = start + normalized.length;
    let group = null;
    for (let index = start; index < end; index += 1) {
      const point = actualMap[index];
      if (!point) continue;
      if (group && group.node === point.node && group.end === point.offset) group.end += 1;
      else {
        if (group) mapped.push(group);
        group = { node: point.node, start: point.offset, end: point.offset + 1, indexStart: index, indexEnd: index + 1 };
      }
      if (group) group.indexEnd = index + 1;
    }
    if (group) mapped.push(group);
    const groups = mapped.splice(mapped.findIndex(item => item.indexStart >= start));
    const visibleLength = end - start;
    for (const part of groups) {
      const fromRatio = (part.indexStart - start) / visibleLength;
      const toRatio = (part.indexEnd - start) / visibleLength;
      mapped.push({
        element: part.node.parentElement,
        textNode: part.node,
        from: Math.round(segment.from + (segment.to - segment.from) * fromRatio),
        to: Math.round(segment.from + (segment.to - segment.from) * toRatio),
        order: mapped.length,
        textLength: part.end - part.start,
      });
    }
    cursor = end;
  }
  mapped.sort((left, right) => left.from - right.from || left.to - right.to || left.order - right.order);
  surface.__spaceSourceSpans = { source: markdownSource, root, spans: mapped };
  return mapped;
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

/** Map a point in the rendered editor back to the Markdown source. */
export function sourceOffsetAtDomPoint(surface, node, offset, markdownSource = '') {
  const spans = readSourceSpans(surface, markdownSource);
  const element = node?.nodeType === 3 ? node.parentElement?.closest('[data-src-from]') : node?.closest?.('[data-src-from]');
  const span = spans.find(item => item.textNode === node || item.element === element);
  return span ? sourceOffsetInside(span, node?.nodeType === 3 ? offset : offset ? span.textLength : 0) : null;
}

/** Every mapped range that lives inside one DOM node, in source order. */
function spansMappedIn(spans, node) {
  if (!node) return [];
  if (node.nodeType === 3) {
    const span = spans.find(item => item.textNode === node);
    return span ? [span] : [];
  }
  return spans.filter(item => item.element && node.contains?.(item.element));
}

/**
 * Resolve one selection boundary (a text offset or a child index inside an
 * element) to a Markdown source offset.
 * @param {Node} node - boundary container.
 * @param {number} offset - text offset, or child index for element containers.
 * @param {Array} spans - output of readSourceSpans.
 * @param {'start'|'end'} side - which end of the boundary to resolve.
 * @returns {number|null} UTF-16 source offset, or null when nothing maps.
 */
export function boundarySourceOffset(node, offset, spans, side) {
  if (!node) return null;
  if (node.nodeType === 3) {
    // Synthesized spans (built from the rendered Markdown when the editor paints
    // no decorations) carry no DOM attributes: the text node is the only identity
    // both mappings share. Without this a selection that crosses an inline run
    // (plain → bold, bold → plain) maps to nothing and the comment anchor is lost.
    const span = spans.find(item => item.textNode === node);
    if (span) return sourceOffsetInside(span, offset);
    const element = node.parentElement?.closest('[data-src-from]');
    const decorated = element ? spans.find(item => item.element === element) : null;
    return decorated ? sourceOffsetInside(decorated, offset) : null;
  }
  // An element boundary (a selection that starts or ends at a paragraph edge, at
  // the start of a bold run, or after a whole block) is a child index, not a
  // character offset. Resolve it to the nearest mapped run *inside that child*,
  // never to the container's first run: a paragraph whose first run is plain text
  // and whose last run is bold must end at the bold run's end, not at "plain ".
  const element = node.nodeType === 1 ? node : node.parentElement;
  const children = [...(element?.childNodes || [])];
  if (side === 'end') {
    for (let index = Math.min(offset, children.length) - 1; index >= 0; index -= 1) {
      const last = spansMappedIn(spans, children[index]).at(-1);
      if (last) return last.to;
    }
    const first = spansMappedIn(spans, element)[0];
    return first ? first.from : null;
  }
  for (let index = Math.max(offset, 0); index < children.length; index += 1) {
    const first = spansMappedIn(spans, children[index])[0];
    if (first) return first.from;
  }
  const last = spansMappedIn(spans, element).at(-1);
  return last ? last.to : null;
}

/**
 * Use a DOM selection inside the rendered paper as a comment anchor.
 * The returned offsets are UTF-16 source offsets, so the server keeps a single
 * coordinate system and comments never depend on the source textarea.
 */
export function capturePreviewSelection(surface, range, content, version) {
  if (!surface || !range || typeof content !== 'string' || !content) return null;
  const spans = readSourceSpans(surface, content);
  let from = spans.length ? boundarySourceOffset(range.startContainer, range.startOffset, spans, 'start') : null;
  let to = spans.length ? boundarySourceOffset(range.endContainer, range.endOffset, spans, 'end') : null;
  if (!Number.isInteger(from) || !Number.isInteger(to)) {
    const quote = range.toString().trim();
    if (!quote) return null;
    const offsets = quoteOffsets(content, quote);
    let index = 0;
    if (offsets.length > 1) {
      const textRoot = surface.querySelector('.ProseMirror');
      if (!textRoot || !textRoot.contains(range.startContainer)) return null;
      const prefix = document.createRange();
      prefix.selectNodeContents(textRoot);
      prefix.setEnd(range.startContainer, range.startOffset);
      const visibleText = textRoot.innerText || textRoot.textContent || '';
      const visibleOffsets = quoteOffsets(visibleText, quote);
      index = visibleOffsets.findIndex(offset => offset >= prefix.toString().length);
      if (visibleOffsets.length !== offsets.length || index < 0) return null;
    }
    const located = quoteOccurrenceRange(content, quote, index);
    if (!located) return null;
    from = located.from;
    to = located.to;
  }
  const normalized = normalizeCommentRange(content, from, to);
  if (!normalized) return null;
  [from, to] = [normalized.from, normalized.to];
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
export function scrollSourceRange(surface, from, to, markdownSource = '') {
  if (!surface) return false;
  const mapped = sourceRangeToDom(readSourceSpans(surface, markdownSource), from, to);
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
