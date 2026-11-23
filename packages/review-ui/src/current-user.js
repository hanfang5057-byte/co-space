/**
 * Signed-in DeepSeek account used to attribute local comments.
 *
 * One read per page load is shared by the Space page and every Sidebar review
 * panel. A missing account plugin, signed-out state, or failed network read
 * resolves to `null`, and comment cards keep their localized fallback author.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { api as defaultApi } from './api.js';

const stores = new WeakMap();

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
      store.loading = request('getUser')
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
 * @param {(method: string, args?: object) => Promise<any>} request - plugin API transport.
 * @returns {{signedIn: boolean, name: string|null, avatarUrl: string|null}|null} account or null.
 */
export function useCurrentUser(request = defaultApi) {
  const store = storeFor(request);
  useEffect(() => { if (!store.loaded) void store.load(); }, [store]);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => null);
}
