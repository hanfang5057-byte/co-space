/**
 * Grammar for Space document references in conversation text.
 *
 * A reference is always `space:<encoded docId>`: the composer codec writes it
 * as plain text, the MCP instructions teach agents to read it, and the Host
 * resolves it. Sent messages therefore keep the protocol token while the
 * client replaces the token with a document card.
 */

/** Token prefix understood by the Space MCP tools. */
export const SPACE_REFERENCE_PREFIX = 'space:';

/** Host-neutral review resource scheme used when an adapter has no native one. */
export const SPACE_RESOURCE_PREFIX = 'cospace://document/';

/** Sentence punctuation that may follow a reference without belonging to it. */
const TRAILING_PUNCTUATION = /[)\]}>.,;:!?，。；：！？、"']+$/u;

/**
 * One reference token after the search offset. The encoded id can only contain
 * URI-unreserved characters and percent escapes, so prose punctuation and CJK
 * text that follow without a space end the token instead of joining the id.
 */
const REFERENCE_TOKEN = /(?<!\S)space:([A-Za-z0-9\-_.!~*'()%]+)/gu;

/**
 * Build the protocol form of a document reference.
 * @param {string} docId - stored document id.
 * @returns {string} `space:` followed by the URI-encoded id.
 */
export function spaceReferenceFor(docId) {
  return `${SPACE_REFERENCE_PREFIX}${encodeURIComponent(String(docId))}`;
}

/**
 * Decode the document id from a protocol reference.
 * @param {string} reference - `space:<docId>` spelling.
 * @returns {string | null} decoded id, or null when the value is not a Space reference.
 */
export function documentIdFromReference(reference) {
  if (typeof reference !== 'string' || !reference.startsWith(SPACE_REFERENCE_PREFIX)) return null;
  const encoded = reference.slice(SPACE_REFERENCE_PREFIX.length);
  if (encoded === '') return null;
  try {
    return decodeURIComponent(encoded);
  } catch {
    // A hand-edited or truncated token still names a document; show it verbatim.
    return encoded;
  }
}

/**
 * Build the right-Sidebar resource address for a document.
 * @param {string} docId - stored document id.
 * @returns {string} `cospace://document/<encoded id>`.
 */
export function spaceResourceFor(docId) {
  return `${SPACE_RESOURCE_PREFIX}${encodeURIComponent(String(docId))}`;
}

/**
 * Decode the document id from a right-Sidebar resource address.
 * @param {string} address - a `cospace://document/…` address.
 * @returns {string | null} decoded id, or null for another resource.
 */
export function documentIdFromResource(address) {
  if (typeof address !== 'string' || !address.startsWith(SPACE_RESOURCE_PREFIX)) return null;
  const encoded = address.slice(SPACE_RESOURCE_PREFIX.length);
  if (encoded === '') return null;
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

/**
 * Find the next complete Space reference in original text.
 * The returned range excludes trailing sentence punctuation, so the node
 * covers exactly the protocol token and nothing else.
 * @param {string} text - complete original message text.
 * @param {number} from - inclusive UTF-16 offset to search from.
 * @returns {{ id: 'space-document', start: number, end: number, data: { docId: string } } | undefined}
 *   the nearest reference node, or undefined when none follows.
 */
export function matchSpaceReference(text, from) {
  REFERENCE_TOKEN.lastIndex = from;
  for (let match = REFERENCE_TOKEN.exec(text); match !== null; match = REFERENCE_TOKEN.exec(text)) {
    const raw = match[0].replace(TRAILING_PUNCTUATION, '');
    const docId = documentIdFromReference(raw);
    if (docId !== null) return { id: 'space-document', start: match.index, end: match.index + raw.length, data: { docId } };
  }
  return undefined;
}
