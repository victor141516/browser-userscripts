import {
  FORUM_THREAD_FALLBACK_PAGE_SIZE,
  THREAD_TITLE_SELECTOR,
} from "../../config/constants";
import type { ForumThreadRecord } from "../../domain/types";
import {
  clampForumThreadListPage,
  getForumThreadListPage,
  getForumThreadListTotalPages,
  getForumThreadRowsSignature,
} from "../../domain/forumThreadList";
import { getVisiblePageNumbers } from "../../domain/pagination";
import { isForumDisplayPage } from "../../shared/dom";
import {
  getForumThreadsTable,
  setForumLayoutElementHidden,
} from "../../adapters/forocoches/forumLayout";
import {
  applyHiddenForumThreadRows as applyHiddenForumThreadRowsInDom,
  renderForumThreadRowsFromHtml,
  restoreForumThreadRowsFromHtml,
} from "../../adapters/forocoches/forumThreadListDom";
import { ForumPager } from "../../ui/components/ForumPager";

export interface ForumThreadListRendererOptions {
  getActiveTagFilter: () => string | null;
  getActiveForumTagPage: () => number;
  setActiveForumTagPage: (page: number) => void;
  getActiveForumSearchQuery: () => string;
  getCachedForumThreadsForCurrentForum: () => ForumThreadRecord[];
  getHiddenForumThreadRecordsForCurrentForum: () => ForumThreadRecord[];
  getForumThreadRecordsForTag: (tag: string | null) => ForumThreadRecord[];
  getForumDynamicPageUrl: (pageNumber: number) => URL;
  setForumTagPage: (pageNumber: number) => void;
  renderTaggedTitle: (title: HTMLAnchorElement) => void;
  renderVisibleForumThreadTitleTags: () => void;
}

export interface ForumThreadListRenderer {
  captureNativeForumThreadRows(): void;
  getForumThreadsPerPage(): number;
  setNativeForumThreadRows(
    rowHtmlList: string[],
    pageSize: number,
    signatureKey: string,
  ): boolean;
  applyHiddenForumThreadRows(): void;
  renderForumThreadList(): boolean;
}

export function createForumThreadListRenderer(
  options: ForumThreadListRendererOptions,
): ForumThreadListRenderer {
  let renderedForumThreadListSignature: string | null = null;
  let forumThreadsPerPage = FORUM_THREAD_FALLBACK_PAGE_SIZE;
  let nativeForumThreadRowHtml: string[] = [];
  let nativeForumThreadHeaderRowHtml: string[] = [];
  let nativeForumPagerHtml: string[] = [];

  function captureNativeForumThreadRows() {
    if (nativeForumThreadRowHtml.length > 0) {
      return;
    }

    const table = getForumThreadsTable();

    if (!table) {
      return;
    }

    const rows = Array.from(table.rows);
    const firstThreadIndex = rows.findIndex((row) =>
      row.querySelector(THREAD_TITLE_SELECTOR),
    );

    const threadRows =
      firstThreadIndex >= 0 ? rows.slice(firstThreadIndex) : rows;
    nativeForumThreadHeaderRowHtml =
      firstThreadIndex > 0
        ? rows.slice(0, firstThreadIndex).map((row) => row.outerHTML)
        : [];
    nativeForumThreadRowHtml = threadRows.map((row) => row.outerHTML);
    forumThreadsPerPage =
      threadRows.filter((row) => row.querySelector(THREAD_TITLE_SELECTOR))
        .length || FORUM_THREAD_FALLBACK_PAGE_SIZE;
    renderedForumThreadListSignature = getForumThreadRowsSignature(
      nativeForumThreadRowHtml,
      "native",
    );
    captureNativeForumPagers();
  }

  function captureNativeForumPagers(): void {
    if (nativeForumPagerHtml.length > 0) {
      return;
    }

    nativeForumPagerHtml = Array.from(document.querySelectorAll(".pagenav"))
      .filter((pager) => pager instanceof HTMLElement)
      .map((pager) => pager.innerHTML);
  }

  function replaceNativeForumPagers(): void {
    nativeForumPagerHtml = Array.from(document.querySelectorAll(".pagenav"))
      .filter((pager) => pager instanceof HTMLElement)
      .map((pager) => pager.innerHTML);
  }

  function restoreNativeForumPagers(): void {
    for (const [index, pager] of Array.from(
      document.querySelectorAll(".pagenav"),
    ).entries()) {
      if (!(pager instanceof HTMLElement) || !nativeForumPagerHtml[index]) {
        continue;
      }

      const container = pager.closest("table[width='100%']") || pager;

      if (container instanceof HTMLElement) {
        setForumLayoutElementHidden(container, false);
      }

      pager.innerHTML = nativeForumPagerHtml[index];
    }
  }

  function getForumThreadsPerPage(): number {
    return forumThreadsPerPage || FORUM_THREAD_FALLBACK_PAGE_SIZE;
  }

  function getForumDynamicPageUrl(pageNumber: number): URL {
    return options.getForumDynamicPageUrl(pageNumber);
  }

  function renderNativeForumPagers(total: number) {
    const pageSize = getForumThreadsPerPage();
    const totalPages = getForumThreadListTotalPages(total, pageSize);
    const currentPage = clampForumThreadListPage(
      options.getActiveForumTagPage(),
      totalPages,
    );
    options.setActiveForumTagPage(currentPage);

    for (const pager of document.querySelectorAll(".pagenav")) {
      if (!(pager instanceof HTMLElement)) {
        continue;
      }

      const container = pager.closest("table[width='100%']") || pager;

      if (container instanceof HTMLElement) {
        setForumLayoutElementHidden(container, false);
      }

      pager.textContent = "";
      pager.append(
        ForumPager({
          currentPage,
          totalPages,
          visiblePages: getVisiblePageNumbers(totalPages, currentPage),
          hrefForPage: (pageNumber) => getForumDynamicPageUrl(pageNumber).href,
          onPageClick: options.setForumTagPage,
        }),
      );
    }
  }

  function renderForumThreadRows(
    rowHtmlList: string[],
    signature: string,
  ): boolean {
    const changed = renderForumThreadRowsFromHtml({
      headerRowHtml: nativeForumThreadHeaderRowHtml,
      rowHtmlList,
      signature,
      currentSignature: renderedForumThreadListSignature,
      renderTaggedTitle: options.renderTaggedTitle,
    });

    if (!changed) {
      return false;
    }

    renderedForumThreadListSignature = signature;
    return true;
  }

  function setNativeForumThreadRows(
    rowHtmlList: string[],
    pageSize: number,
    signatureKey: string,
  ): boolean {
    nativeForumThreadRowHtml = rowHtmlList;
    forumThreadsPerPage = pageSize || FORUM_THREAD_FALLBACK_PAGE_SIZE;
    renderedForumThreadListSignature = null;
    replaceNativeForumPagers();

    return renderForumThreadRows(
      nativeForumThreadRowHtml,
      getForumThreadRowsSignature(nativeForumThreadRowHtml, signatureKey),
    );
  }

  function restoreNativeForumThreadRows(): boolean {
    const nativeSignature = getForumThreadRowsSignature(
      nativeForumThreadRowHtml,
      "native",
    );
    const changed = restoreForumThreadRowsFromHtml({
      headerRowHtml: nativeForumThreadHeaderRowHtml,
      nativeRowHtml: nativeForumThreadRowHtml,
      nativeSignature,
      currentSignature: renderedForumThreadListSignature,
      renderTaggedTitle: options.renderTaggedTitle,
    });

    if (changed) {
      renderedForumThreadListSignature = nativeSignature;
    }

    restoreNativeForumPagers();
    options.renderVisibleForumThreadTitleTags();
    return changed;
  }

  function applyHiddenForumThreadRows(): void {
    const hiddenThreadIds = new Set(
      options
        .getHiddenForumThreadRecordsForCurrentForum()
        .map((record) => record.id),
    );
    applyHiddenForumThreadRowsInDom(hiddenThreadIds);
  }

  function renderForumThreadList(): boolean {
    if (!isForumDisplayPage()) {
      return false;
    }

    captureNativeForumThreadRows();

    const activeTagFilter = options.getActiveTagFilter();
    const activeForumSearchQuery = options.getActiveForumSearchQuery();
    const cachedForumRecords = options.getCachedForumThreadsForCurrentForum();
    const records = options.getForumThreadRecordsForTag(activeTagFilter);

    if (!activeTagFilter && !activeForumSearchQuery) {
      const changed = restoreNativeForumThreadRows();
      applyHiddenForumThreadRows();
      return changed;
    }

    if (cachedForumRecords.length === 0) {
      const changed = restoreNativeForumThreadRows();
      applyHiddenForumThreadRows();
      return changed;
    }

    const page = getForumThreadListPage(
      records,
      options.getActiveForumTagPage(),
      getForumThreadsPerPage(),
    );
    options.setActiveForumTagPage(page.currentPage);
    const signature = getForumThreadRowsSignature(
      page.rowHtmlList,
      [
        "dynamic",
        activeTagFilter || "",
        activeForumSearchQuery,
        page.currentPage,
        page.pageSize,
      ].join(":"),
    );
    const changed = renderForumThreadRows(page.rowHtmlList, signature);

    renderNativeForumPagers(records.length);
    return changed;
  }

  return {
    captureNativeForumThreadRows,
    getForumThreadsPerPage,
    setNativeForumThreadRows,
    applyHiddenForumThreadRows,
    renderForumThreadList,
  };
}
