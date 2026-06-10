import {
  THREAD_CACHE_MAX_BYTES,
  THREAD_CACHE_RECORD_VERSION,
  THREAD_CACHE_LEGACY_STORAGE_PREFIX,
  THREAD_CACHE_STORE_NAME,
} from "../../config/constants";
import type { PostRecord, ThreadCacheRecord } from "../../domain/types";
import { getThreadId } from "../../shared/dom";
import {
  canUseThreadCache,
  deleteFromStore,
  openThreadCacheDb,
  readAllFromStore,
  upsertInStore,
  waitForIdbRequest,
  waitForIdbTransaction,
} from "./db";
import {
  getRawThreadCacheRecordId,
  isThreadCacheExpired,
  normalizeCachedPostRecord,
  normalizeThreadCacheRecord,
  estimateThreadCacheByteSize,
} from "./validation";

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
  return readAllFromStore(THREAD_CACHE_STORE_NAME);
}

export async function deleteThreadCacheRecords(
  threadIds: string[],
): Promise<void> {
  if (!threadIds.length) {
    return;
  }

  await deleteFromStore(THREAD_CACHE_STORE_NAME, threadIds);
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

export async function cleanupThreadCache(): Promise<void> {
  if (!canUseThreadCache()) {
    return;
  }

  clearLegacyThreadCaches();

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
    await upsertInStore(THREAD_CACHE_STORE_NAME, [record]);
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
