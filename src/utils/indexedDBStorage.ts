/**
 * Universal IndexedDB Storage Engine
 * Replaces all localStorage usage across the entire application.
 * All application states, file data, and configurations are consistently saved and retrieved using IndexedDB.
 */

const DB_NAME = 'AnalytixGrid_AppDB_v2';
const DB_VERSION = 2;
const STORE_APP_STATE = 'app_state';
const STORE_BLOBS = 'file_blobs';

let dbPromise: Promise<IDBDatabase> | null = null;
let isHydrated = false;
let initPromise: Promise<Map<string, any>> | null = null;
const hydrationListeners = new Set<(cache: Map<string, any>) => void>();

// Synchronous memory cache for instant zero-latency retrieval during React render loops
const memoryStateCache = new Map<string, any>();
export const memoryBlobCache = new Map<string, Blob>();

/**
 * Check if the IndexedDB state store has preloaded its records into memory.
 */
export function isIDBHydrated(): boolean {
  return isHydrated;
}

/**
 * Register a listener to be notified when IndexedDB state finishes loading.
 */
export function onIDBHydrated(callback: (cache: Map<string, any>) => void): () => void {
  if (isHydrated) {
    try {
      callback(memoryStateCache);
    } catch (err) {
      console.warn('Hydration callback warning:', err);
    }
  }
  hydrationListeners.add(callback);
  return () => {
    hydrationListeners.delete(callback);
  };
}

/**
 * Open or retrieve the application's IndexedDB database connection.
 */
export function getIndexedDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_APP_STATE)) {
        db.createObjectStore(STORE_APP_STATE);
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Initialize IndexedDB: preloads all saved states into memory cache.
 * Cleans and migrates any remaining legacy keys from localStorage once and for all.
 */
export function initIndexedDB(): Promise<Map<string, any>> {
  if (initPromise) return initPromise;

  initPromise = new Promise(async (resolve) => {
    try {
      const db = await getIndexedDB();

      // One-time migration of any legacy localStorage keys to IndexedDB
      if (typeof window !== 'undefined' && window.localStorage && window.localStorage.length > 0) {
        try {
          const legacyKeys: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('dyn_') || k.startsWith('app_'))) {
              legacyKeys.push(k);
            }
          }
          if (legacyKeys.length > 0) {
            const migTx = db.transaction(STORE_APP_STATE, 'readwrite');
            const migStore = migTx.objectStore(STORE_APP_STATE);
            legacyKeys.forEach((k) => {
              const raw = localStorage.getItem(k);
              if (raw !== null) {
                let parsed: any;
                try {
                  parsed = JSON.parse(raw);
                } catch {
                  parsed = raw;
                }
                migStore.put(parsed, k);
                memoryStateCache.set(k, parsed);
                localStorage.removeItem(k);
              }
            });
          }
        } catch (mErr) {
          console.warn('Legacy storage migration note:', mErr);
        }
      }

      // Preload all app_state records from IndexedDB
      const tx = db.transaction([STORE_APP_STATE], 'readonly');
      const store = tx.objectStore(STORE_APP_STATE);
      const req = store.openCursor();

      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          memoryStateCache.set(String(cursor.key), cursor.value);
          cursor.continue();
        } else {
          isHydrated = true;
          hydrationListeners.forEach((fn) => {
            try {
              fn(memoryStateCache);
            } catch (err) {
              console.warn('Hydration listener error:', err);
            }
          });
          resolve(memoryStateCache);
        }
      };

      req.onerror = () => {
        isHydrated = true;
        resolve(memoryStateCache);
      };
    } catch {
      isHydrated = true;
      resolve(memoryStateCache);
    }
  });

  return initPromise;
}

// Automatically initiate IndexedDB preloading immediately upon module import
if (typeof window !== 'undefined') {
  initIndexedDB().catch((err) => console.warn('IndexedDB preload note:', err));
}

// =========================================================================
// APP STATE KEY-VALUE OPERATIONS (Persistent in IndexedDB)
// =========================================================================

/**
 * Persist an item into IndexedDB under the specified key.
 */
export async function idbSetItem<T = any>(key: string, value: T): Promise<void> {
  memoryStateCache.set(key, value);
  try {
    const db = await getIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_APP_STATE, 'readwrite');
      const store = tx.objectStore(STORE_APP_STATE);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error(`Failed to set item in IndexedDB [${key}]:`, err);
  }
}

/**
 * Retrieve an item asynchronously from IndexedDB.
 */
export async function idbGetItem<T = any>(key: string, fallback?: T): Promise<T> {
  if (memoryStateCache.has(key)) {
    return memoryStateCache.get(key) as T;
  }
  try {
    const db = await getIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_APP_STATE, 'readonly');
      const store = tx.objectStore(STORE_APP_STATE);
      const req = store.get(key);
      req.onsuccess = () => {
        const res = req.result !== undefined ? req.result : fallback;
        if (req.result !== undefined) {
          memoryStateCache.set(key, req.result);
        }
        resolve(res as T);
      };
      req.onerror = () => resolve(fallback as T);
    });
  } catch {
    return fallback as T;
  }
}

/**
 * Synchronous get for React initial state hooks.
 * Reads instantly from memory cache with optional fallback.
 */
export function idbGetItemSync<T = any>(key: string, fallback?: T): T {
  if (memoryStateCache.has(key)) {
    return memoryStateCache.get(key) as T;
  }
  return fallback as T;
}

/**
 * Remove an item from IndexedDB and memory cache.
 */
export async function idbRemoveItem(key: string): Promise<void> {
  memoryStateCache.delete(key);
  try {
    const db = await getIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_APP_STATE, 'readwrite');
      const store = tx.objectStore(STORE_APP_STATE);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error(`Failed to remove item from IndexedDB [${key}]:`, err);
  }
}

/**
 * Clear all application states in IndexedDB.
 */
export async function idbClearAppState(): Promise<void> {
  memoryStateCache.clear();
  try {
    const db = await getIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_APP_STATE, 'readwrite');
      const store = tx.objectStore(STORE_APP_STATE);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to clear app_state store in IndexedDB:', err);
  }
}

// =========================================================================
// BINARY BLOB OPERATIONS (Videos, Audio, Images, Documents)
// =========================================================================

export async function storeFileBlob(blobKey: string, blob: Blob): Promise<void> {
  if (blobKey && blob) {
    memoryBlobCache.set(blobKey, blob);
  }
  try {
    const db = await getIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_BLOBS, 'readwrite');
      const store = tx.objectStore(STORE_BLOBS);
      const req = store.put(blob, blobKey);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error(`Failed to store blob in IndexedDB [${blobKey}]:`, err);
  }
}

export async function getFileBlob(blobKey: string): Promise<Blob | null> {
  if (memoryBlobCache.has(blobKey)) {
    return memoryBlobCache.get(blobKey) || null;
  }
  try {
    const db = await getIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_BLOBS, 'readonly');
      const store = tx.objectStore(STORE_BLOBS);
      const req = store.get(blobKey);
      req.onsuccess = () => {
        const res = (req.result as Blob) || null;
        if (res) memoryBlobCache.set(blobKey, res);
        resolve(res);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error(`Failed to get blob from IndexedDB [${blobKey}]:`, err);
    return null;
  }
}

export async function deleteFileBlob(blobKey: string): Promise<void> {
  memoryBlobCache.delete(blobKey);
  try {
    const db = await getIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_BLOBS, 'readwrite');
      const store = tx.objectStore(STORE_BLOBS);
      const req = store.delete(blobKey);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error(`Failed to delete blob from IndexedDB [${blobKey}]:`, err);
  }
}
