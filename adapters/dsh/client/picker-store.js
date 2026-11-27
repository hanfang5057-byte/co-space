/**
 * Tiny observable for the document picker. The command opens it for one
 * Session; the `shell.overlay` slot renders it. A store keeps the command and
 * the overlay independent of component lifetimes.
 */

/**
 * @returns {{getSnapshot: () => {open: boolean, sessionId: string|null}, subscribe: (listener: () => void) => () => void, open: (sessionId: string) => void, close: () => void}}
 */
export function createDocumentPicker() {
  let state = { open: false, sessionId: null };
  const listeners = new Set();
  const publish = () => { for (const listener of listeners) listener(); };
  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    open(sessionId) {
      if (typeof sessionId !== 'string' || sessionId === '') return;
      state = { open: true, sessionId };
      publish();
    },
    close() {
      state = { open: false, sessionId: null };
      publish();
    },
  };
}
