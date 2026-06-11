import { THREAD_STATE_QUERY_PARAMS } from "../../config/constants";
import type { ActiveGraphView, NavigationItem, PostRecord, ThreadPage } from "../../domain/types";
import { getThreadIdFromDocument } from "../../adapters/forocoches/threadParser";
import { getPostIdFromNavigationElement } from "../../ui/navigationDom";
import { clearThreadStateQueryParams } from "../../services/queryState";
import { getThreadId, isThreadPage } from "../../shared/dom";

export interface ThreadUrlControllerOptions {
  getThreadPages: () => ThreadPage[];
  getLoadedThreadPosts: () => PostRecord[];
  getActiveGraphView: () => ActiveGraphView | null;
  getPendingGraphView: () => ActiveGraphView | null;
  getActiveThreadSearchQuery: () => string;
  getActiveAuthorFilters: () => Set<string>;
}

export interface ThreadUrlController {
  writeCurrentThreadStateQueryParams(url: URL): void;
  syncThreadStateUrl(options?: { history?: "push" | "replace" }): void;
  updateSelectedPostUrl(selected: NavigationItem): void;
  getThreadPagesForTotal(totalPages: number): ThreadPage[];
  getThreadPageUrl(
    pageNumber: number,
    options?: { includeState?: boolean; preserveHash?: boolean },
  ): URL;
  updateThreadPageUrl(
    pageNumber: number,
    options?: { history?: "push" | "replace"; preserveHash?: boolean },
  ): void;
}

export function createThreadUrlController(
  options: ThreadUrlControllerOptions,
): ThreadUrlController {
  function writeCurrentThreadStateQueryParams(url: URL): void {
    clearThreadStateQueryParams(url);
    const graphView = options.getActiveGraphView() || options.getPendingGraphView();

    if (graphView) {
      url.searchParams.set(THREAD_STATE_QUERY_PARAMS.graphType, graphView.type);
      url.searchParams.set(
        THREAD_STATE_QUERY_PARAMS.graphRoot,
        graphView.rootPostId,
      );
      if (graphView.relatedPostId) {
        url.searchParams.set(
          THREAD_STATE_QUERY_PARAMS.graphRelated,
          graphView.relatedPostId,
        );
      }
    }

    const searchQuery = options.getActiveThreadSearchQuery();
    if (searchQuery) {
      url.searchParams.set(THREAD_STATE_QUERY_PARAMS.searchQuery, searchQuery);
    }

    for (const author of options.getActiveAuthorFilters()) {
      url.searchParams.append(THREAD_STATE_QUERY_PARAMS.authorFilter, author);
    }
  }

  function updateBrowserHistory(url: URL, historyMode: "push" | "replace") {
    if (historyMode === "push" && url.href !== location.href) {
      window.history.pushState(window.history.state, "", url.href);
      return;
    }
    window.history.replaceState(window.history.state, "", url.href);
  }

  function syncThreadStateUrl(
    syncOptions: { history?: "push" | "replace" } = {},
  ) {
    if (!isThreadPage()) {
      return;
    }
    const url = new URL(location.href);
    writeCurrentThreadStateQueryParams(url);
    updateBrowserHistory(url, syncOptions.history || "replace");
  }

  function resolveCurrentThreadId(): string | null {
    return (
      getThreadId(new URL(location.href)) ||
      getThreadIdFromDocument(document) ||
      options
        .getThreadPages()
        .map((page) => getThreadId(new URL(page.url)))
        .find(Boolean) ||
      null
    );
  }

  function getThreadPageUrl(
    pageNumber: number,
    urlOptions: { includeState?: boolean; preserveHash?: boolean } = {},
  ): URL {
    const currentUrl = new URL(location.href);
    const threadId = resolveCurrentThreadId() || "";
    const url = new URL(currentUrl.origin + currentUrl.pathname);

    if (threadId) {
      url.searchParams.set("t", threadId);
    }

    if (pageNumber > 1) {
      url.searchParams.set("page", String(pageNumber));
    }

    if (urlOptions.includeState) {
      writeCurrentThreadStateQueryParams(url);
    }

    if (urlOptions.preserveHash) {
      url.hash = location.hash;
    }

    return url;
  }

  function updateThreadPageUrl(
    pageNumber: number,
    updateOptions: { history?: "push" | "replace"; preserveHash?: boolean } = {},
  ) {
    const url = getThreadPageUrl(pageNumber, {
      includeState: true,
      preserveHash: updateOptions.preserveHash,
    });
    updateBrowserHistory(url, updateOptions.history || "replace");
  }

  function updateSelectedPostUrl(selected: NavigationItem) {
    const postId = getPostIdFromNavigationElement(selected.element);

    if (!postId) {
      return;
    }

    const threadId = resolveCurrentThreadId();

    if (!threadId) {
      return;
    }

    const post = options
      .getLoadedThreadPosts()
      .find((item) => item.id === postId);
    const url = new URL(location.href);
    url.search = "";
    url.searchParams.set("t", threadId);

    if (post && post.pageNumber > 1) {
      url.searchParams.set("page", String(post.pageNumber));
    }

    writeCurrentThreadStateQueryParams(url);
    url.hash = `post${postId}`;
    window.history.replaceState(window.history.state, "", url.href);
  }

  function getThreadPagesForTotal(totalPages: number): ThreadPage[] {
    const pages: ThreadPage[] = [];

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      pages.push({ pageNumber, url: getThreadPageUrl(pageNumber).href });
    }

    return pages;
  }

  return {
    writeCurrentThreadStateQueryParams,
    syncThreadStateUrl,
    updateSelectedPostUrl,
    getThreadPagesForTotal,
    getThreadPageUrl,
    updateThreadPageUrl,
  };
}
