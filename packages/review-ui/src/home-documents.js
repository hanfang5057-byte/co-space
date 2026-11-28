/** Return a copied document list in the selected home-page order. */
export function sortHomeDocuments(documents, sort = 'recent') {
  const time = item => {
    const value = Date.parse(item.updatedAt || item.createdAt || '');
    return Number.isFinite(value) ? value : null;
  };
  return [...documents].sort((a, b) => {
    if (sort === 'title') {
      return (a.title || a.id || '').localeCompare(b.title || b.id || '', undefined, { numeric: true });
    }
    const left = time(a), right = time(b);
    if (left === null) return right === null ? 0 : 1;
    if (right === null) return -1;
    return right - left;
  });
}
