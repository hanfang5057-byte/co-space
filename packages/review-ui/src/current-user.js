/**
 * Optional signed-in user supplied by the adapter for local comment attribution.
 *
 * One read per page load is shared by the Space page and every Sidebar review
 * panel. A missing identity capability, signed-out state, or failed request
 * resolves to `null`, and comment cards keep their localized fallback author.
 */
import { useEffect, useSyncExternalStore } from 'react';

const stores = new WeakMap();
const anonymousIdentity = async () => null;

function createStore(request) {
  const listeners = new Set();
  const store = {
    user: null,
    loaded: false,
    loading: null,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getSnapshot() {
      return store.user;
    },
    load() {
      if (store.loading !== null) return store.loading;
      if (store.loaded) return Promise.resolve(store.user);
      store.loading = request()
        .then(value => {
          store.user = value && value.signedIn ? value : null;
          store.loaded = true;
        })
        .catch(() => {
          // The endpoint is optional; attribution falls back without a user.
          store.user = null;
          store.loaded = true;
        })
        .finally(() => {
          store.loading = null;
          for (const listener of listeners) listener();
        });
      return store.loading;
    },
  };
  return store;
}

function storeFor(request) {
  let store = stores.get(request);
  if (!store) {
    store = createStore(request);
    stores.set(request, store);
  }
  return store;
}

/**
 * Subscribe to the signed-in account.
 * @param {() => Promise<any>|any} request - optional adapter identity bridge.
 * @returns {{signedIn: boolean, name: string|null, avatarUrl: string|null}|null} account or null.
 */
export function useCurrentUser(request = anonymousIdentity) {
  const store = storeFor(request);
  useEffect(() => { if (!store.loaded) void store.load(); }, [store]);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => null);
}
