import {
  normalizeAuthorName,
  normalizeText,
} from "../shared/dom";
import { sortPostsChronologically } from "./threadPosts";
import type { PostRecord, ThreadAuthorOption } from "./types";

export function getThreadOriginalPosterName(posts: PostRecord[]): string {
  return sortPostsChronologically(posts)[0]?.author || "";
}

export function getThreadAuthorOptions(
  posts: PostRecord[],
  currentUsername: string,
): ThreadAuthorOption[] {
  const optionsByKey = new Map<string, ThreadAuthorOption>();
  const originalPosterKey = normalizeAuthorName(
    getThreadOriginalPosterName(posts),
  );
  const currentUserKey = normalizeAuthorName(currentUsername);

  for (const post of posts) {
    const key = normalizeAuthorName(post.author);

    if (!key) {
      continue;
    }

    const option = optionsByKey.get(key) || {
      key,
      name: post.author,
      count: 0,
      isOriginalPoster: key === originalPosterKey,
      isCurrentUser: key === currentUserKey,
    };

    option.count += 1;
    option.isOriginalPoster = option.isOriginalPoster || key === originalPosterKey;
    option.isCurrentUser = option.isCurrentUser || key === currentUserKey;
    optionsByKey.set(key, option);
  }

  if (currentUserKey && !optionsByKey.has(currentUserKey)) {
    optionsByKey.set(currentUserKey, {
      key: currentUserKey,
      name: currentUsername,
      count: 0,
      isOriginalPoster: currentUserKey === originalPosterKey,
      isCurrentUser: true,
    });
  }

  return Array.from(optionsByKey.values()).sort((left, right) => {
    if (left.isOriginalPoster !== right.isOriginalPoster) {
      return left.isOriginalPoster ? -1 : 1;
    }

    if (left.isCurrentUser !== right.isCurrentUser) {
      return left.isCurrentUser ? -1 : 1;
    }

    return left.name.localeCompare(right.name, "es", {
      sensitivity: "base",
    });
  });
}

export function getThreadAuthorOptionLabel(
  option: ThreadAuthorOption,
): string {
  const markers = [];

  if (option.isOriginalPoster) {
    markers.push("autor");
  }

  if (option.isCurrentUser) {
    markers.push("tú");
  }

  return markers.length > 0
    ? `${option.name} (${markers.join(", ")})`
    : option.name;
}

export function getThreadAuthorOptionByKey(
  options: ThreadAuthorOption[],
  authorKey: string,
): ThreadAuthorOption | null {
  return options.find((option) => option.key === authorKey) || null;
}

export function resolveThreadAuthorInputValue(
  value: string,
  options: ThreadAuthorOption[],
): string | null {
  const input = normalizeText(value);
  const inputKey = normalizeAuthorName(input);

  if (!inputKey) {
    return null;
  }

  for (const option of options) {
    const labelKey = normalizeAuthorName(getThreadAuthorOptionLabel(option));

    if (
      option.key === inputKey ||
      normalizeAuthorName(option.name) === inputKey ||
      labelKey === inputKey
    ) {
      return option.key;
    }
  }

  return null;
}
