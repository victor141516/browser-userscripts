import { POSTS_SELECTOR, POST_TABLE_SELECTOR } from "../../config/constants";
import type { PostRecord } from "../../domain/types";
import {
  getPageNumber,
  getThreadId,
  normalizeText,
  toUrl,
} from "../../shared/dom";

export function getMaxThreadPage(doc: Document): number {
  const currentUrl = new URL(location.href);
  const currentThreadId = getThreadId(currentUrl) || getThreadIdFromDocument(doc);
  let maxPage = getPageNumber(currentUrl);

  for (const link of doc.querySelectorAll("a[href*='showthread.php']")) {
    if (!(link instanceof HTMLAnchorElement)) {
      continue;
    }

    const url = toUrl(link.getAttribute("href") || link.href);

    if (!url || getThreadId(url) !== currentThreadId) {
      continue;
    }

    maxPage = Math.max(maxPage, getPageNumber(url));
  }

  return maxPage;
}

export function getThreadIdFromDocument(doc: Document = document): string | null {
  for (const link of doc.querySelectorAll("a[href*='showthread.php?t=']")) {
    if (!(link instanceof HTMLAnchorElement)) {
      continue;
    }

    const url = toUrl(link.getAttribute("href") || link.href);
    const threadId = url ? getThreadId(url) : null;

    if (threadId) {
      return threadId;
    }
  }

  return null;
}

export function getPostWrapper(doc: Document, postTable: Element): Element {
  const posts = doc.querySelector(POSTS_SELECTOR);

  if (!posts) {
    return postTable;
  }

  let wrapper = postTable;

  while (wrapper.parentElement && wrapper.parentElement !== posts) {
    wrapper = wrapper.parentElement;
  }

  return posts.contains(wrapper) ? wrapper : postTable;
}

export function getQuotedPostId(href: string): string | null {
  const url = toUrl(href);

  if (!url) {
    return null;
  }

  const fromPostParam = url.searchParams.get("p");

  if (fromPostParam && /^\d+$/.test(fromPostParam)) {
    return fromPostParam;
  }

  const hashMatch = url.hash.match(/^#post(\d+)$/);
  return hashMatch?.[1] || null;
}

export function getQuotedPostIds(doc: Document, postId: string): string[] {
  const message = doc.getElementById(`post_message_${postId}`);

  if (!message) {
    return [];
  }

  const quotedIds = new Set<string>();

  for (const link of message.querySelectorAll(
    "a[href*='showthread.php?p='][href*='#post']",
  )) {
    if (!(link instanceof HTMLAnchorElement)) {
      continue;
    }

    const quotedPostId = getQuotedPostId(
      link.getAttribute("href") || link.href,
    );

    if (quotedPostId && quotedPostId !== postId) {
      quotedIds.add(quotedPostId);
    }
  }

  return Array.from(quotedIds);
}

export function collectPosts(
  doc: Document,
  pageNumber: number,
  pageOffset: number,
): PostRecord[] {
  const posts: PostRecord[] = [];
  const seenWrappers = new Set<Element>();

  for (const table of doc.querySelectorAll(POST_TABLE_SELECTOR)) {
    if (!(table instanceof HTMLTableElement) || !/^post\d+$/.test(table.id)) {
      continue;
    }

    const id = table.id.replace(/^post/, "");
    const wrapper = getPostWrapper(doc, table);

    if (seenWrappers.has(wrapper)) {
      continue;
    }

    seenWrappers.add(wrapper);

    const author = normalizeText(
      doc.querySelector(`#postmenu_${id} .bigusername`)?.textContent ||
        doc.querySelector(`#postmenu_${id}`)?.textContent,
    );
    const postNumber: string =
      normalizeText(doc.querySelector(`#postcount${id}`)?.textContent) ||
      String(pageOffset + posts.length + 1);
    const postNumberValue = Number(postNumber);

    posts.push({
      id,
      html: wrapper.outerHTML,
      author,
      postNumber,
      pageNumber,
      pageIndex: posts.length,
      originalIndex:
        Number.isFinite(postNumberValue) && postNumberValue > 0
          ? postNumberValue - 1
          : pageOffset + posts.length,
      quotedPostIds: getQuotedPostIds(doc, id),
      replyingPostIds: [],
      isOriginalPoster: false,
      replyCount: 0,
    });
  }

  return posts;
}

export function parseHtml(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

export async function fetchThreadDocument(url: string): Promise<Document> {
  const response = await fetch(url, {
    cache: "no-cache",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(`Could not load ${url}: ${response.status}`);
  }

  return parseHtml(await response.text());
}
