import {
  FORUM_THREAD_CACHE_RECORD_VERSION,
  THREAD_CACHE_MAX_AGE_MS,
  THREAD_CACHE_RECORD_VERSION,
} from "../../config/constants";
import type {
  ForumThreadRecord,
  PostRecord,
  ThreadCacheRecord,
} from "../../domain/types";
import { getTagsFromText } from "../../domain/tags";
import { normalizeText } from "../../shared/dom";

const LEGACY_THREAD_CACHE_RECORD_VERSION = 2;

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

export function estimateThreadCacheByteSize(value: unknown): number {
  try {
    return getStringByteSize(JSON.stringify(value));
  } catch (error) {
    console.warn("Forocoches Premium: no se pudo medir la cache", error);
    return 0;
  }
}

export function getStringByteSize(value: unknown): number {
  const text = String(value || "");

  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(text).byteLength;
  }

  return text.length * 2;
}

export function normalizeThreadCacheRecord(
  value: unknown,
): ThreadCacheRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as ThreadCacheRecord;

  const isSupportedVersion =
    record.version === THREAD_CACHE_RECORD_VERSION ||
    record.version === LEGACY_THREAD_CACHE_RECORD_VERSION;

  if (
    !isSupportedVersion ||
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
    version: THREAD_CACHE_RECORD_VERSION,
    threadId: record.threadId,
    totalPages: Number(record.totalPages),
    lastSeenPageNumber: Number.isFinite(record.lastSeenPageNumber)
      ? Number(record.lastSeenPageNumber)
      : Number(record.totalPages),
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

export function isThreadCacheExpired(cache: ThreadCacheRecord): boolean {
  return Date.now() - cache.savedAt > THREAD_CACHE_MAX_AGE_MS;
}
