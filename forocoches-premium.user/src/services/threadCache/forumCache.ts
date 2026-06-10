import {
  FORUM_THREAD_CACHE_MAX_RECORDS,
  FORUM_THREAD_CACHE_STORE_NAME,
} from "../../config/constants";
import type { ForumThreadRecord } from "../../domain/types";
import {
  canUseThreadCache,
  deleteFromStore,
  readAllFromStore,
  upsertInStore,
} from "./db";
import { normalizeForumThreadRecord } from "./validation";

export async function readForumThreadCacheRecords(): Promise<
  ForumThreadRecord[]
> {
  if (!canUseThreadCache()) {
    return [];
  }

  try {
    const rawRecords = await readAllFromStore(FORUM_THREAD_CACHE_STORE_NAME);
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
    await upsertInStore(FORUM_THREAD_CACHE_STORE_NAME, records);
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

  await deleteFromStore(FORUM_THREAD_CACHE_STORE_NAME, threadIds);
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
