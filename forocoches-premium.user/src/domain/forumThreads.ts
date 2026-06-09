import type { ForumThreadRecord } from "./types";
import { normalizeLayoutText } from "../shared/dom";

export function getForumSearchTokens(
  query: string | null | undefined,
): string[] {
  return normalizeLayoutText(query)
    .split(/\s+/)
    .filter(Boolean);
}

export function forumThreadMatchesSearchTokens(
  record: ForumThreadRecord,
  tokens: string[],
): boolean {
  if (tokens.length === 0) {
    return true;
  }

  const text = normalizeLayoutText(record.title);
  return tokens.every((token) => text.includes(token));
}

export function sortForumThreadRecords(
  records: ForumThreadRecord[],
): ForumThreadRecord[] {
  return records.slice().sort((left, right) => {
    if (left.lastSeen !== right.lastSeen) {
      return right.lastSeen - left.lastSeen;
    }

    if (left.recentIndex !== right.recentIndex) {
      return left.recentIndex - right.recentIndex;
    }

    return right.updatedAt - left.updatedAt;
  });
}

export function getVisibleForumThreadRecords(
  records: ForumThreadRecord[],
): ForumThreadRecord[] {
  return records.filter((record) => !record.isHidden);
}

export function getHiddenForumThreadRecords(
  records: ForumThreadRecord[],
): ForumThreadRecord[] {
  return sortForumThreadRecords(
    records.filter((record) => record.isHidden),
  ).sort((left, right) => right.hiddenAt - left.hiddenAt);
}

export function filterForumThreadRecords(
  records: ForumThreadRecord[],
  filters: { tag: string | null; searchQuery: string },
): ForumThreadRecord[] {
  const tokens = getForumSearchTokens(filters.searchQuery);

  return sortForumThreadRecords(
    getVisibleForumThreadRecords(records).filter(
      (record) =>
        (!filters.tag || record.tags.includes(filters.tag)) &&
        forumThreadMatchesSearchTokens(record, tokens),
    ),
  );
}
