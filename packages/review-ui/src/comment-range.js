/**
 * DOM-free normalization of comment anchors: locating a quoted phrase in the
 * Markdown source and trimming/repairing a source range before it is stored.
 * Kept isolated from the browser so these rules can be unit tested directly.
 */

/**
 * Find every non-overlapping occurrence of a quote in the source content.
 * @param {unknown} content - Markdown source text.
 * @param {unknown} quote - Exact phrase to locate.
 * @returns {number[]} UTF-16 start offsets, in source order.
 */
export function quoteOffsets(content, quote) {
  if (typeof content !== 'string' || typeof quote !== 'string' || quote === '') return [];
  const offsets = [];
  for (let offset = content.indexOf(quote); offset >= 0; offset = content.indexOf(quote, offset + quote.length)) offsets.push(offset);
  return offsets;
}

/**
 * Resolve one occurrence of a quote to an inclusive-exclusive source range.
 * @param {unknown} content - Markdown source text.
 * @param {unknown} quote - Exact phrase to locate.
 * @param {number|null} occurrenceIndex - Zero-based occurrence; null means the first one.
 * @returns {{from: number, to: number}|null} Resolved range, or null when not found.
 */
export function quoteOccurrenceRange(content, quote, occurrenceIndex = null) {
  const offsets = quoteOffsets(content, quote);
  let at;
  if (occurrenceIndex === null) at = offsets[0];
  else if (!Number.isInteger(occurrenceIndex) || occurrenceIndex < 0 || occurrenceIndex >= offsets.length) return null;
  else at = offsets[occurrenceIndex];
  if (at === undefined) return null;
  return { from: at, to: at + quote.length };
}

/**
 * Trim surrounding whitespace and reject ranges that split a surrogate pair.
 * @param {unknown} content - Markdown source text.
 * @param {unknown} from - Inclusive UTF-16 source offset.
 * @param {unknown} to - Exclusive UTF-16 source offset.
 * @returns {{from: number, to: number}|null} Normalized range, or null when invalid.
 */
export function normalizeCommentRange(content, from, to) {
  if (typeof content !== 'string' || content === '') return null;
  if (!Number.isInteger(from) || !Number.isInteger(to)) return null;
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
  return { from, to };
}
