import {
  FORUM_THREAD_CACHE_MAX_RECORDS,
  FORUM_THREAD_CACHE_RECORD_VERSION,
  FORUM_THREAD_CACHE_STORE_NAME,
  THREAD_CACHE_DB_NAME,
  THREAD_CACHE_DB_VERSION,
  THREAD_CACHE_LEGACY_STORAGE_PREFIX,
  THREAD_CACHE_MAX_AGE_MS,
  THREAD_CACHE_MAX_BYTES,
  THREAD_CACHE_RECORD_VERSION,
  THREAD_CACHE_STORE_NAME,
} from "../config/constants";
import type {
  ForumThreadRecord,
  PostRecord,
  ThreadCacheRecord,
} from "../domain/types";
import { getTagsFromText } from "../domain/tags";
import {
  getThreadId,
  normalizeAuthorName,
  normalizeText,
} from "../shared/dom";

let threadCacheDbPromise: Promise<IDBDatabase> | null = null;

export function isCachedPostRecord(value: unknown): value is PostRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const post = value as PostRecord;

  return (
    typeof post.id === "string" &&
    typeof post.html === "string" &&
    typeof post.author === "string" &&
    typeof post.postNumber === "string" &&
    Number.isFinite(post.pageNumber) &&
    Number.isFinite(post.pageIndex) &&
    Number.isFinite(post.originalIndex) &&
    Array.isArray(post.quotedPostIds)
  );
}

export function normalizeCachedPostRecord(post: PostRecord): PostRecord {
  return {
    id: post.id,
    html: post.html,
    author: post.author,
    postNumber: post.postNumber,
    pageNumber: Number(post.pageNumber),
    pageIndex: Number(post.pageIndex),
    originalIndex: Number(post.originalIndex),
    quotedPostIds: post.quotedPostIds.filter(Boolean),
    replyingPostIds: [],
    isOriginalPoster: false,
    replyCount: 0,
  };
}

export function normalizeThreadCacheRecord(
  value: unknown,
): ThreadCacheRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as ThreadCacheRecord;

  if (
    record.version !== THREAD_CACHE_RECORD_VERSION ||
    typeof record.threadId !== "string" ||
    !Number.isFinite(record.totalPages) ||
    !Array.isArray(record.cachedPageNumbers) ||
    !Array.isArray(record.posts)
  ) {
    return null;
  }

  const posts = record.posts
    .filter(isCachedPostRecord)
    .map(normalizeCachedPostRecord);

  if (posts.length === 0) {
    return null;
  }

  return {
    version: record.version,
    threadId: record.threadId,
    totalPages: Number(record.totalPages),
    cachedPageNumbers: record.cachedPageNumbers
      .map(Number)
      .filter((pageNumber) => Number.isFinite(pageNumber) && pageNumber > 0),
    savedAt: Number(record.savedAt) || 0,
    byteSize: Number(record.byteSize) || estimateThreadCacheByteSize(record),
    posts,
  };
}

export function getRawThreadCacheRecordId(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const threadId = (value as { threadId?: unknown }).threadId;

  return typeof threadId === "string" ? threadId : null;
}

export function normalizeForumThreadRecord(
  value: unknown,
): ForumThreadRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as ForumThreadRecord;

  if (
    record.version !== FORUM_THREAD_CACHE_RECORD_VERSION ||
    typeof record.id !== "string" ||
    typeof record.forumId !== "string" ||
    typeof record.url !== "string" ||
    typeof record.title !== "string" ||
    typeof record.html !== "string" ||
    !Array.isArray(record.tags)
  ) {
    return null;
  }

  const title = normalizeText(record.title);

  return {
    version: record.version,
    id: record.id,
    forumId: record.forumId,
    url: record.url,
    title,
    tags: getTagsFromText(title),
    html: record.html,
    preview: normalizeText(record.preview),
    author: normalizeText(record.author),
    lastPostText: normalizeText(record.lastPostText),
    statsText: normalizeText(record.statsText),
    rowText: normalizeText(record.rowText),
    sourcePage: Number(record.sourcePage) || 1,
    sourceIndex: Number(record.sourceIndex) || 0,
    recentIndex: Number(record.recentIndex) || 0,
    lastSeen: Number(record.lastSeen) || 0,
    updatedAt: Number(record.updatedAt) || 0,
    isHidden: Boolean(record.isHidden),
    hiddenAt: Number(record.hiddenAt) || 0,
  };
}

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

export function getStringByteSize(value: unknown): number {
  const text = String(value || "");

  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(text).byteLength;
  }

  return text.length * 2;
}

export function estimateThreadCacheByteSize(value: unknown): number {
  try {
    return getStringByteSize(JSON.stringify(value));
  } catch (error) {
    console.warn("Forocoches Premium: no se pudo medir la cache", error);
    return 0;
  }
}

export function isThreadCacheExpired(cache: ThreadCacheRecord): boolean {
  return Date.now() - cache.savedAt > THREAD_CACHE_MAX_AGE_MS;
}

export function clearLegacyThreadCaches(): void {
  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);

      if (key?.startsWith(THREAD_CACHE_LEGACY_STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.warn(
      "Forocoches Premium: no se pudo limpiar la cache antigua",
      error,
    );
  }
}

export async function deleteThreadCacheRecord(threadId: string): Promise<void> {
  if (!canUseThreadCache()) {
    return;
  }

  const db = await openThreadCacheDb();
  const transaction = db.transaction(THREAD_CACHE_STORE_NAME, "readwrite");
  transaction.objectStore(THREAD_CACHE_STORE_NAME).delete(threadId);
  await waitForIdbTransaction(transaction);
}

export async function getAllThreadCacheRecords(): Promise<unknown[]> {
  const db = await openThreadCacheDb();
  const transaction = db.transaction(THREAD_CACHE_STORE_NAME, "readonly");
  const records = await waitForIdbRequest(
    transaction.objectStore(THREAD_CACHE_STORE_NAME).getAll(),
  );
  await waitForIdbTransaction(transaction);

  return Array.isArray(records) ? records : [];
}

export async function deleteThreadCacheRecords(
  threadIds: string[],
): Promise<void> {
  if (!threadIds.length) {
    return;
  }

  const db = await openThreadCacheDb();
  const transaction = db.transaction(THREAD_CACHE_STORE_NAME, "readwrite");
  const store = transaction.objectStore(THREAD_CACHE_STORE_NAME);
  threadIds.forEach((threadId) => store.delete(threadId));
  await waitForIdbTransaction(transaction);
}

export async function cleanupThreadCache(): Promise<void> {
  clearLegacyThreadCaches();

  if (!canUseThreadCache()) {
    return;
  }

  try {
    const rawRecords = await getAllThreadCacheRecords();
    const records: ThreadCacheRecord[] = [];
    const threadIdsToDelete: Set<string> = new Set();

    rawRecords.forEach((rawRecord) => {
      const record = normalizeThreadCacheRecord(rawRecord);
      const rawThreadId = getRawThreadCacheRecordId(rawRecord);

      if (!record) {
        if (rawThreadId) {
          threadIdsToDelete.add(rawThreadId);
        }
        return;
      }

      if (isThreadCacheExpired(record)) {
        threadIdsToDelete.add(record.threadId);
        return;
      }

      records.push(record);
    });

    let totalBytes = records.reduce(
      (total, record) =>
        total + (record.byteSize || estimateThreadCacheByteSize(record)),
      0,
    );

    records
      .slice()
      .sort((left, right) => left.savedAt - right.savedAt)
      .forEach((record) => {
        if (totalBytes <= THREAD_CACHE_MAX_BYTES) {
          return;
        }

        threadIdsToDelete.add(record.threadId);
        totalBytes -= record.byteSize || estimateThreadCacheByteSize(record);
      });

    await deleteThreadCacheRecords(Array.from(threadIdsToDelete));
  } catch (error) {
    console.warn("Forocoches Premium: no se pudo limpiar la cache", error);
  }
}

export async function readCurrentThreadCache(): Promise<ThreadCacheRecord | null> {
  const threadId = getThreadId(new URL(location.href));

  if (!threadId || !canUseThreadCache()) {
    return null;
  }

  try {
    const db = await openThreadCacheDb();
    const transaction = db.transaction(THREAD_CACHE_STORE_NAME, "readonly");
    const rawRecord = await waitForIdbRequest(
      transaction.objectStore(THREAD_CACHE_STORE_NAME).get(threadId),
    );
    await waitForIdbTransaction(transaction);

    const record = normalizeThreadCacheRecord(rawRecord);

    if (!record) {
      return null;
    }

    if (isThreadCacheExpired(record)) {
      await deleteThreadCacheRecord(threadId);
      return null;
    }

    return record;
  } catch (error) {
    console.warn("Forocoches Premium: no se pudo leer la cache", error);
    return null;
  }
}

export function isCompleteThreadCache(cache: ThreadCacheRecord): boolean {
  const cachedPages = new Set(cache.cachedPageNumbers);

  return (
    cache.totalPages > 0 &&
    cachedPages.size >= cache.totalPages &&
    cache.posts.length > 0
  );
}

export async function writeCurrentThreadCache(
  posts: PostRecord[],
  totalPages: number,
  cachedPageNumbers: Set<number>,
): Promise<void> {
  const threadId = getThreadId(new URL(location.href));

  if (
    !threadId ||
    !canUseThreadCache() ||
    posts.length === 0 ||
    cachedPageNumbers.size === 0
  ) {
    return;
  }

  const record: ThreadCacheRecord = {
    version: THREAD_CACHE_RECORD_VERSION,
    threadId,
    totalPages,
    cachedPageNumbers: Array.from(cachedPageNumbers).sort(
      (left, right) => left - right,
    ),
    savedAt: Date.now(),
    byteSize: 0,
    posts: posts.map(normalizeCachedPostRecord),
  };
  record.byteSize = estimateThreadCacheByteSize(record);

  if (record.byteSize > THREAD_CACHE_MAX_BYTES) {
    console.warn(
      "Forocoches Premium: este hilo supera el limite de cache configurado",
    );
    return;
  }

  try {
    await cleanupThreadCache();
    const db = await openThreadCacheDb();
    const transaction = db.transaction(THREAD_CACHE_STORE_NAME, "readwrite");
    transaction.objectStore(THREAD_CACHE_STORE_NAME).put(record);
    await waitForIdbTransaction(transaction);
  } catch (error) {
    console.warn("Forocoches Premium: no se pudo guardar la cache", error);
  }
}

export async function clearCurrentThreadCache(): Promise<void> {
  const threadId = getThreadId(new URL(location.href));

  clearLegacyThreadCaches();

  if (!threadId) {
    return;
  }

  try {
    await deleteThreadCacheRecord(threadId);
  } catch (error) {
    console.warn("Forocoches Premium: no se pudo borrar la cache", error);
  }
}

export async function readForumThreadCacheRecords(): Promise<
  ForumThreadRecord[]
> {
  if (!canUseThreadCache()) {
    return [];
  }

  try {
    const db = await openThreadCacheDb();
    const transaction = db.transaction(
      FORUM_THREAD_CACHE_STORE_NAME,
      "readonly",
    );
    const rawRecords = await waitForIdbRequest(
      transaction.objectStore(FORUM_THREAD_CACHE_STORE_NAME).getAll(),
    );
    await waitForIdbTransaction(transaction);

    return Array.isArray(rawRecords)
      ? rawRecords
          .map(normalizeForumThreadRecord)
          .filter((record) => record !== null)
      : [];
  } catch (error) {
    console.warn(
      "Forocoches Premium: no se pudo leer la cache del foro",
      error,
    );
    return [];
  }
}

export async function writeForumThreadCacheRecords(
  records: ForumThreadRecord[],
): Promise<void> {
  if (!canUseThreadCache() || records.length === 0) {
    return;
  }

  try {
    const db = await openThreadCacheDb();
    const transaction = db.transaction(
      FORUM_THREAD_CACHE_STORE_NAME,
      "readwrite",
    );
    const store = transaction.objectStore(FORUM_THREAD_CACHE_STORE_NAME);

    for (const record of records) {
      store.put(record);
    }

    await waitForIdbTransaction(transaction);
  } catch (error) {
    console.warn(
      "Forocoches Premium: no se pudo guardar la cache del foro",
      error,
    );
  }
}

export async function deleteForumThreadCacheRecords(
  threadIds: string[],
): Promise<void> {
  if (!canUseThreadCache() || threadIds.length === 0) {
    return;
  }

  const db = await openThreadCacheDb();
  const transaction = db.transaction(
    FORUM_THREAD_CACHE_STORE_NAME,
    "readwrite",
  );
  const store = transaction.objectStore(FORUM_THREAD_CACHE_STORE_NAME);
  threadIds.forEach((threadId) => store.delete(threadId));
  await waitForIdbTransaction(transaction);
}

export async function cleanupForumThreadCache(): Promise<void> {
  if (!canUseThreadCache()) {
    return;
  }

  try {
    const records = await readForumThreadCacheRecords();

    if (records.length <= FORUM_THREAD_CACHE_MAX_RECORDS) {
      return;
    }

    const idsToDelete = records
      .slice()
      .sort((left, right) => {
        if (left.isHidden !== right.isHidden) {
          return left.isHidden ? 1 : -1;
        }

        const leftHasTags = left.tags.length > 0;
        const rightHasTags = right.tags.length > 0;

        if (leftHasTags !== rightHasTags) {
          return leftHasTags ? 1 : -1;
        }

        if (left.lastSeen !== right.lastSeen) {
          return left.lastSeen - right.lastSeen;
        }

        return left.recentIndex - right.recentIndex;
      })
      .slice(0, records.length - FORUM_THREAD_CACHE_MAX_RECORDS)
      .map((record) => record.id);

    await deleteForumThreadCacheRecords(idsToDelete);
  } catch (error) {
    console.warn(
      "Forocoches Premium: no se pudo limpiar la cache del foro",
      error,
    );
  }
}
