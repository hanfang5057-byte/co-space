/**
 * The document the main CoSpace panel shows.
 *
 * A right-Sidebar tab action or an action card can ask the page to open one
 * document; the page subscribes so it follows without a reload. Kept outside
 * React so both the adapter and the page share one value.
 */

/**
 * Build the observable document selection.
 * @returns {{get: () => string|null, set: (id: string|null) => void, subscribe: (listener: (id: string|null) => void) => () => void}} store.
 */
export function createMainDocumentStore() {
  let current = null;
  const listeners = new Set();
  const publish = () => {
    for (const listener of [...listeners]) listener(current);
  };
  return {
    get: () => current,
    set(next) {
      const value = typeof next === 'string' && next !== '' ? next : null;
      if (value === current) return;
      current = value;
      publish();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
