import type {
  ActiveGraphView,
  PostRecord,
  ThreadLoadState,
  ThreadPage,
} from "../../domain/types";
import { createEmptyThreadGraph } from "../../domain/threadPosts";
import {
  collectPosts,
  fetchThreadDocument,
  parseHtml,
} from "../../adapters/forocoches/threadParser";
import { readThreadQueryState } from "../../services/queryState";
import {
  isCompleteThreadCache,
  readCurrentThreadCache,
  writeCurrentThreadCache,
} from "../../services/threadCache";
import { PAGE_LOAD_DELAY_MS } from "../../config/constants";
import { getPageNumber, sleep } from "../../shared/dom";

export interface ThreadPageLoaderOptions {
  prepareThreadPage: () => void;
  ensureThreadSummary: () => HTMLElement | null;
  getThreadPages: () => ThreadPage[];
  getThreadPagesForTotal: (totalPages: number) => ThreadPage[];
  getPendingInitialHashPostId: () => string | null;
  setThreadPages: (pages: ThreadPage[]) => void;
  setLoadedThreadPosts: (posts: PostRecord[]) => void;
  setLoadedThreadPageNumbers: (pageNumbers: Set<number>) => void;
  setThreadGraphEmpty: () => void;
  setActiveGraphView: (view: ActiveGraphView | null) => void;
  setPendingGraphView: (view: ActiveGraphView | null) => void;
  setActivePageFilter: (pageNumber: number | null) => void;
  setActiveAuthorFilters: (authors: Set<string>) => void;
  setActiveThreadSearchQuery: (query: string) => void;
  setThreadLoadState: (state: ThreadLoadState) => void;
  getThreadLoadState: () => ThreadLoadState;
  hydrateThreadPosts: (posts: PostRecord[]) => void;
  renderThreadPosts: () => void;
  renderThreadSummaryMenu: (summary: HTMLElement | null) => void;
  renderThreadSearchPanel: () => void;
  updateThreadPageUrl: (
    pageNumber: number,
    options?: { history?: "push" | "replace"; preserveHash?: boolean },
  ) => void;
  syncThreadStateUrl: () => void;
}

export async function enhanceThreadPage(
  options: ThreadPageLoaderOptions,
): Promise<void> {
  options.prepareThreadPage();

  const summary = options.ensureThreadSummary();
  const queryState = readThreadQueryState();
  const allPages = options.getThreadPages();
  const currentPageNumber = getPageNumber(new URL(location.href));
  const pages = [
    ...allPages.filter((page) => page.pageNumber === currentPageNumber),
    ...allPages.filter((page) => page.pageNumber !== currentPageNumber),
  ];
  const allPosts: PostRecord[] = [];
  let pageOffset = 0;

  options.setThreadPages(allPages);
  options.setLoadedThreadPosts([]);
  options.setLoadedThreadPageNumbers(new Set());
  options.setThreadGraphEmpty();
  options.setActiveGraphView(null);
  options.setPendingGraphView(queryState.graphView);
  options.setActivePageFilter(
    queryState.graphView
      ? null
      : queryState.authorFilters.length > 0 || queryState.searchQuery
        ? null
        : queryState.pageFilter || currentPageNumber,
  );
  options.setActiveAuthorFilters(new Set(queryState.authorFilters));
  options.setActiveThreadSearchQuery(queryState.searchQuery);

  const activePageFilter = queryState.graphView
    ? null
    : queryState.authorFilters.length > 0 || queryState.searchQuery
      ? null
      : queryState.pageFilter || currentPageNumber;

  if (activePageFilter) {
    options.updateThreadPageUrl(activePageFilter, {
      preserveHash: Boolean(options.getPendingInitialHashPostId()),
    });
  } else {
    options.syncThreadStateUrl();
  }

  if (!options.getPendingInitialHashPostId()) {
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  options.setThreadLoadState({
    loadedPages: 0,
    targetPages: pages.length,
    totalPages: allPages.length,
    loadedPosts: 0,
    isLoading: pages.length > 0,
  });

  if (summary) {
    summary.textContent = "";
  }

  options.renderThreadSummaryMenu(summary);
  options.renderThreadSearchPanel();

  const cachedThread = await readCurrentThreadCache();

  if (cachedThread && isCompleteThreadCache(cachedThread)) {
    const cachedPages = options.getThreadPagesForTotal(cachedThread.totalPages);
    const cachedPageNumbers = new Set(cachedThread.cachedPageNumbers);
    options.setThreadPages(cachedPages);
    options.setLoadedThreadPageNumbers(cachedPageNumbers);
    options.hydrateThreadPosts(cachedThread.posts);
    options.setThreadLoadState({
      loadedPages: cachedPageNumbers.size,
      targetPages: cachedThread.totalPages,
      totalPages: cachedThread.totalPages,
      loadedPosts: cachedThread.posts.length,
      isLoading: false,
    });
    options.renderThreadPosts();
    options.renderThreadSummaryMenu(summary);
    return;
  }

  const currentPageDocument = parseHtml(document.documentElement.outerHTML);
  const loadedPageNumbers = new Set<number>();

  for (const page of pages) {
    const doc =
      page.pageNumber === currentPageNumber
        ? currentPageDocument
        : await fetchThreadDocument(page.url);
    const pagePosts = collectPosts(doc, page.pageNumber, pageOffset);
    allPosts.push(...pagePosts);
    pageOffset += pagePosts.length;
    loadedPageNumbers.add(page.pageNumber);

    options.setLoadedThreadPageNumbers(new Set(loadedPageNumbers));
    options.hydrateThreadPosts(allPosts);
    options.setThreadLoadState({
      ...options.getThreadLoadState(),
      loadedPages: loadedPageNumbers.size,
      loadedPosts: allPosts.length,
      isLoading: true,
    });

    options.renderThreadPosts();
    options.renderThreadSummaryMenu(summary);

    const lastPage = pages[pages.length - 1];

    if (lastPage && page.pageNumber !== lastPage.pageNumber) {
      await sleep(PAGE_LOAD_DELAY_MS);
    }
  }

  options.setThreadLoadState({
    ...options.getThreadLoadState(),
    loadedPages: loadedPageNumbers.size,
    loadedPosts: allPosts.length,
    isLoading: false,
  });
  options.renderThreadPosts();
  options.renderThreadSummaryMenu(summary);

  if (loadedPageNumbers.size >= pages.length) {
    await writeCurrentThreadCache(
      allPosts,
      allPages.length,
      loadedPageNumbers,
    );
  }
}
