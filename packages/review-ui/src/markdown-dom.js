/** DOM coordinate mapping between annotated Markdown and browser ranges. */
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
