/**
 * Minimal async key-value store for Phase 1 mock data.
 * Uses IndexedDB (large quota, needed for uploaded images) and falls back to
 * memory where IndexedDB is unavailable (tests, some private modes).
 */
export interface KeyValueStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

const DB_NAME = 'store-demo';
const STORE = 'kv';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbStore(): KeyValueStore {
  let dbPromise: Promise<IDBDatabase> | null = null;
  const db = () => (dbPromise ??= openDb());
  const run = <R>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<R>) =>
    db().then(
      (d) =>
        new Promise<R>((resolve, reject) => {
          const tx = d.transaction(STORE, mode);
          const req = fn(tx.objectStore(STORE));
          tx.oncomplete = () => resolve(req.result);
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        }),
    );
  return {
    get: <T>(key: string) => run('readonly', (s) => s.get(key)) as Promise<T | undefined>,
    set: async (key, value) => {
      await run('readwrite', (s) => s.put(value, key));
    },
    delete: async (key) => {
      await run('readwrite', (s) => s.delete(key));
    },
  };
}

export function memoryStore(): KeyValueStore {
  const map = new Map<string, unknown>();
  return {
    get: async <T>(key: string) => structuredClone(map.get(key)) as T | undefined,
    set: async (key, value) => {
      map.set(key, structuredClone(value));
    },
    delete: async (key) => {
      map.delete(key);
    },
  };
}

export const kv: KeyValueStore = typeof indexedDB !== 'undefined' ? idbStore() : memoryStore();
