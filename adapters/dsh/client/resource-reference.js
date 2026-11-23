/** DSH's persisted host resource address; keep this protocol at the DSH boundary. */
const DSH_SPACE_RESOURCE_PREFIX = 'dsh-resource://space/';

export function dshSpaceResourceFor(docId) {
  return `${DSH_SPACE_RESOURCE_PREFIX}${encodeURIComponent(String(docId))}`;
}

export function documentIdFromDshResource(address) {
  if (typeof address !== 'string' || !address.startsWith(DSH_SPACE_RESOURCE_PREFIX)) return null;
  const encoded = address.slice(DSH_SPACE_RESOURCE_PREFIX.length);
  if (encoded === '') return null;
  try { return decodeURIComponent(encoded); }
  catch { return encoded; }
}
