const DOCUMENT_QUERY_KEY = 'document';

export function documentIdFromUrl(href) {
  try { return new URL(href).searchParams.get(DOCUMENT_QUERY_KEY) || null; }
  catch { return null; }
}

export function documentUrlFor(href, docId) {
  const url = new URL(href);
  if (typeof docId === 'string' && docId.length > 0) url.searchParams.set(DOCUMENT_QUERY_KEY, docId);
  else url.searchParams.delete(DOCUMENT_QUERY_KEY);
  return url;
}
