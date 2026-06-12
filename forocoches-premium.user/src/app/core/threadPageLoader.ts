import type {
  ActiveGraphView,
  PostRecord,
  ThreadCacheRecord,
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

function getUniqueThreadPages(pages: ThreadPage[]): ThreadPage[] {
  const seenPageNumbers = new Set<number>();
  const uniquePages: ThreadPage[] = [];

  for (const page of pages) {
    if (seenPageNumbers.has(page.pageNumber)) {
      continue;
    }

    seenPageNumbers.add(page.pageNumber);
    uniquePages.push(page);
  }

  return uniquePages;
}

function getThreadPagesToRefresh(options: {
  allPages: ThreadPage[];
  cachedThread: ThreadCacheRecord | null;
}): ThreadPage[] {
  const firstPage = options.allPages.find((page) => page.pageNumber === 1);

  if (!options.cachedThread || !isCompleteThreadCache(options.cachedThread)) {
    return options.allPages;
  }

  const currentLastPageNumber = options.allPages.length;
  const previousLastPageNumber = Math.min(
    Math.max(options.cachedThread.lastSeenPageNumber, 1),
    currentLastPageNumber,
  );
  const tailStartPageNumber =
    currentLastPageNumber > previousLastPageNumber
      ? previousLastPageNumber
      : currentLastPageNumber;
  const tailPages = options.allPages.filter(
    (page) => page.pageNumber >= tailStartPageNumber,
  );

  return getUniqueThreadPages([
    ...(firstPage ? [firstPage] : []),
    ...tailPages,
  ]);
}

function getPageOffset(posts: PostRecord[], pageNumber: number): number {
  return posts.filter((post) => post.pageNumber < pageNumber).length;
}

function replaceThreadPagePosts(
  posts: PostRecord[],
  pageNumber: number,
  pagePosts: PostRecord[],
): PostRecord[] {
  return posts
    .filter((post) => post.pageNumber !== pageNumber)
    .concat(pagePosts)
    .sort((left, right) => {
      if (left.originalIndex !== right.originalIndex) {
        return left.originalIndex - right.originalIndex;
      }

      if (left.pageNumber !== right.pageNumber) {
        return left.pageNumber - right.pageNumber;
      }

      return left.pageIndex - right.pageIndex;
    });
}

export async function enhanceThreadPage(
  options: ThreadPageLoaderOptions,
): Promise<void> {
  options.prepareThreadPage();

  const summary = options.ensureThreadSummary();
  const queryState = readThreadQueryState();
  const allPages = options.getThreadPages();
  const currentPageNumber = getPageNumber(new URL(location.href));
  const cachedThread = await readCurrentThreadCache();
  const pages = getThreadPagesToRefresh({ allPages, cachedThread });
  const allPosts: PostRecord[] = [];
  let loadedPosts: PostRecord[] =
    cachedThread && isCompleteThreadCache(cachedThread)
      ? cachedThread.posts.filter((post) => post.pageNumber <= allPages.length)
      : [];

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

  const currentPageDocument = parseHtml(document.documentElement.outerHTML);
  const loadedPageNumbers = new Set(
    loadedPosts.map((post) => post.pageNumber),
  );

  for (const page of pages) {
    const doc =
      page.pageNumber === currentPageNumber
        ? currentPageDocument
        : await fetchThreadDocument(page.url);
    const pagePosts = collectPosts(
      doc,
      page.pageNumber,
      getPageOffset(loadedPosts, page.pageNumber),
    );
    loadedPosts = replaceThreadPagePosts(
      loadedPosts,
      page.pageNumber,
      pagePosts,
    );
    allPosts.length = 0;
    allPosts.push(...loadedPosts);
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

  if (allPages.every((page) => loadedPageNumbers.has(page.pageNumber))) {
    await writeCurrentThreadCache(
      allPosts,
      allPages.length,
      loadedPageNumbers,
      allPages.length,
    );
  }
}
