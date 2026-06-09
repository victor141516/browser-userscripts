import {
  FORUM_THREAD_CACHE_RECORD_VERSION,
  HIDDEN_THREAD_ATTRIBUTE,
  SELECTED_ATTRIBUTE,
  THREAD_TITLE_SELECTOR,
} from "../../config/constants";
import { getTagsFromText } from "../../domain/tags";
import type { ForumThreadRecord } from "../../domain/types";
import {
  getThreadId,
  normalizeText,
  toUrl,
} from "../../shared/dom";

export function getTitleTags(title: HTMLAnchorElement): string[] {
  const source = title.title || normalizeText(title.textContent);
  return getTagsFromText(source);
}

export function collectForumThreadRecords(
  doc: Document,
  sourceUrl: string,
  forumId: string,
  pageNumber: number,
  pageSize: number,
  scrapeStartedAt: number,
): ForumThreadRecord[] {
  const table = getForumThreadsTableFromDocument(doc);

  if (!table) {
    return [];
  }

  const rows = Array.from(table.querySelectorAll("tr")).filter(
    (row) =>
      row instanceof HTMLTableRowElement &&
      row.querySelector(THREAD_TITLE_SELECTOR),
  );

  return rows
    .map((row, index) => {
      const title = row.querySelector(THREAD_TITLE_SELECTOR);
      const url =
        title instanceof HTMLAnchorElement
          ? toUrl(title.getAttribute("href") || title.href)
          : null;
      const threadId = url ? getThreadId(url) : null;

      return threadId
        ? createForumThreadRecordFromRow(
            row as HTMLTableRowElement,
            threadId,
            sourceUrl,
            forumId,
            pageNumber,
            pageSize,
            index,
            scrapeStartedAt,
          )
        : null;
    })
    .filter((record) => record !== null);
}

function getSerializableForumThreadRowHtml(
  row: HTMLElement,
  sourceUrl: string,
): string {
  const clone = row.cloneNode(true);

  if (!(clone instanceof HTMLElement)) {
    return row.outerHTML;
  }

  clone.removeAttribute(SELECTED_ATTRIBUTE);
  clone.removeAttribute(HIDDEN_THREAD_ATTRIBUTE);
  clone.querySelectorAll(`[${SELECTED_ATTRIBUTE}]`).forEach((element) => {
    element.removeAttribute(SELECTED_ATTRIBUTE);
  });
  clone
    .querySelectorAll(`[${HIDDEN_THREAD_ATTRIBUTE}]`)
    .forEach((element) => {
      element.removeAttribute(HIDDEN_THREAD_ATTRIBUTE);
    });

  for (const link of clone.querySelectorAll("a[href]")) {
    if (link instanceof HTMLAnchorElement) {
      link.href = new URL(link.getAttribute("href") || "", sourceUrl).href;
    }
  }

  for (const image of clone.querySelectorAll("img[src]")) {
    if (image instanceof HTMLImageElement) {
      image.src = new URL(image.getAttribute("src") || "", sourceUrl).href;
    }
  }

  return clone.outerHTML;
}

function getForumThreadsTableFromDocument(
  doc: Document,
): HTMLTableElement | null {
  const table = doc.getElementById("threadslist");

  if (table instanceof HTMLTableElement) {
    return table;
  }

  const title = doc.querySelector(THREAD_TITLE_SELECTOR);
  const owner = title?.closest("table");

  return owner instanceof HTMLTableElement ? owner : null;
}

function createForumThreadRecordFromRow(
  row: HTMLTableRowElement,
  threadId: string,
  sourceUrl: string,
  forumId: string,
  pageNumber: number,
  pageSize: number,
  pageIndex: number,
  scrapeStartedAt: number,
): ForumThreadRecord | null {
  const title = row.querySelector(THREAD_TITLE_SELECTOR);

  if (!(title instanceof HTMLAnchorElement)) {
    return null;
  }

  const titleText = normalizeText(title.textContent);
  const cells = Array.from(row.cells);
  const titleCell = title.closest("td");
  const titleCellIndex =
    titleCell instanceof HTMLTableCellElement ? cells.indexOf(titleCell) : -1;
  const author = normalizeText(
    titleCell?.querySelector(".smallfont span")?.textContent,
  );
  const lastPostCell = titleCellIndex >= 0 ? cells[titleCellIndex + 1] : null;
  const statsCell = titleCellIndex >= 0 ? cells[titleCellIndex + 2] : null;
  const recentIndex = (pageNumber - 1) * pageSize + pageIndex;

  return {
    version: FORUM_THREAD_CACHE_RECORD_VERSION,
    id: threadId,
    forumId,
    url: new URL(title.getAttribute("href") || "", sourceUrl).href,
    title: titleText,
    tags: getTagsFromText(titleText),
    html: getSerializableForumThreadRowHtml(row, sourceUrl),
    preview: normalizeText(titleCell?.getAttribute("title")),
    author,
    lastPostText: normalizeText(lastPostCell?.textContent),
    statsText: normalizeText(
      statsCell?.getAttribute("title") || statsCell?.textContent,
    ),
    rowText: normalizeText(row.textContent),
    sourcePage: pageNumber,
    sourceIndex: pageIndex,
    recentIndex,
    lastSeen: scrapeStartedAt,
    updatedAt: Date.now(),
    isHidden: false,
    hiddenAt: 0,
  };
}
