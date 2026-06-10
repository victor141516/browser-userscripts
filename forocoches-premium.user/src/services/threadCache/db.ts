import {
  FORUM_THREAD_CACHE_STORE_NAME,
  THREAD_CACHE_DB_NAME,
  THREAD_CACHE_DB_VERSION,
  THREAD_CACHE_STORE_NAME,
} from "../../config/constants";

let threadCacheDbPromise: Promise<IDBDatabase> | null = null;

export function canUseThreadCache(): boolean {
  return typeof indexedDB !== "undefined";
}

export function openThreadCacheDb(): Promise<IDBDatabase> {
  if (threadCacheDbPromise) {
    return threadCacheDbPromise;
  }

  if (!canUseThreadCache()) {
    return Promise.reject(new Error("IndexedDB no esta disponible"));
  }

  threadCacheDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(
      THREAD_CACHE_DB_NAME,
      THREAD_CACHE_DB_VERSION,
    );

    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.objectStoreNames.contains(THREAD_CACHE_STORE_NAME)
        ? request.transaction?.objectStore(THREAD_CACHE_STORE_NAME)
        : db.createObjectStore(THREAD_CACHE_STORE_NAME, {
            keyPath: "threadId",
          });

      if (store && !store.indexNames.contains("savedAt")) {
        store.createIndex("savedAt", "savedAt", { unique: false });
      }

      const forumStore = db.objectStoreNames.contains(
        FORUM_THREAD_CACHE_STORE_NAME,
      )
        ? request.transaction?.objectStore(FORUM_THREAD_CACHE_STORE_NAME)
        : db.createObjectStore(FORUM_THREAD_CACHE_STORE_NAME, {
            keyPath: "id",
          });

      if (forumStore && !forumStore.indexNames.contains("forumId")) {
        forumStore.createIndex("forumId", "forumId", { unique: false });
      }

      if (forumStore && !forumStore.indexNames.contains("lastSeen")) {
        forumStore.createIndex("lastSeen", "lastSeen", { unique: false });
      }

      if (forumStore && !forumStore.indexNames.contains("isHidden")) {
        forumStore.createIndex("isHidden", "isHidden", { unique: false });
      }

      if (forumStore && !forumStore.indexNames.contains("hiddenAt")) {
        forumStore.createIndex("hiddenAt", "hiddenAt", { unique: false });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };

    request.onerror = () => {
      threadCacheDbPromise = null;
      reject(request.error || new Error("No se pudo abrir IndexedDB"));
    };

    request.onblocked = () => {
      console.warn(
        "Forocoches Premium: otra pestana esta bloqueando la cache",
      );
    };
  });

  return threadCacheDbPromise;
}

export function waitForIdbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      reject(request.error || new Error("Fallo una operacion de IndexedDB"));
    };
  });
}

export function waitForIdbTransaction(
  transaction: IDBTransaction,
): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => {
      reject(
        transaction.error || new Error("Fallo una transaccion de IndexedDB"),
      );
    };
    transaction.onabort = () => {
      reject(
        transaction.error ||
          new Error("Se aborto una transaccion de IndexedDB"),
      );
    };
  });
}

export async function readAllFromStore(storeName: string): Promise<unknown[]> {
  const db = await openThreadCacheDb();
  const transaction = db.transaction(storeName, "readonly");
  const records = await waitForIdbRequest(transaction.objectStore(storeName).getAll());
  await waitForIdbTransaction(transaction);
  return Array.isArray(records) ? records : [];
}

export async function deleteFromStore(
  storeName: string,
  ids: string[],
): Promise<void> {
  if (!ids.length) {
    return;
  }

  const db = await openThreadCacheDb();
  const transaction = db.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);

  ids.forEach((id) => store.delete(id));
  await waitForIdbTransaction(transaction);
}

export async function upsertInStore(
  storeName: string,
  records: unknown[],
): Promise<void> {
  if (records.length === 0) {
    return;
  }

  const db = await openThreadCacheDb();
  const transaction = db.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);

  for (const record of records) {
    store.put(record);
  }

  await waitForIdbTransaction(transaction);
}
