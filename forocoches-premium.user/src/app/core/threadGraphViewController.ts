import type {
  ActiveGraphView,
  GraphViewType,
  PostRecord,
  ThreadGraph,
} from "../../domain/types";
import {
  getPostsForGraphView,
  getReplyIndentDepth as getReplyIndentDepthForView,
  getThreadViewPosts as getPostsForThreadView,
  getValidGraphView,
} from "../../domain/threadPosts";
import { readThreadQueryState } from "../../services/queryState";
import { getLocationPostHashId, getPageNumber, isThreadPage } from "../../shared/dom";

export interface ThreadGraphViewControllerOptions {
  getThreadGraph: () => ThreadGraph;
  getLoadedThreadPosts: () => PostRecord[];
  getActiveGraphView: () => ActiveGraphView | null;
  setActiveGraphViewState: (view: ActiveGraphView | null) => void;
  getPendingGraphView: () => ActiveGraphView | null;
  setPendingGraphView: (view: ActiveGraphView | null) => void;
  getActivePageFilter: () => number | null;
  setActivePageFilter: (pageNumber: number | null) => void;
  setActiveAuthorFilters: (authors: Set<string>) => void;
  setActiveThreadSearchQuery: (query: string) => void;
  hasActiveThreadPostFilters: () => boolean;
  syncThreadStateUrl: (options?: { history?: "push" | "replace" }) => void;
  updateThreadPageUrl: (pageNumber: number) => void;
  updateOriginalThreadPageMenus: () => void;
  renderThreadPosts: () => void;
  renderThreadSummaryMenu: () => void;
  selectPostById: (
    postId: string,
    options?: { scroll?: boolean; updateUrl?: boolean },
  ) => void;
}

export interface ThreadGraphViewController {
  setActiveGraphView(
    type: GraphViewType,
    rootPostId: string,
    relatedPostId?: string | null,
    options?: {
      history?: "push" | "replace";
      scrollToFirstPost?: boolean;
      scrollToFirstReply?: boolean;
    },
  ): void;
  activatePendingGraphView(): void;
  applyThreadUrlState(url?: URL): void;
  installThreadHistoryNavigation(): void;
  getThreadViewPosts(posts: PostRecord[]): PostRecord[];
  getReplyIndentDepth(post: PostRecord, index: number): number;
}

export function createThreadGraphViewController(
  options: ThreadGraphViewControllerOptions,
): ThreadGraphViewController {
  function setActiveGraphView(
    type: GraphViewType,
    rootPostId: string,
    relatedPostId: string | null = null,
    viewOptions: {
      history?: "push" | "replace";
      scrollToFirstPost?: boolean;
      scrollToFirstReply?: boolean;
    } = {},
  ) {
    const threadGraph = options.getThreadGraph();

    if (!threadGraph.postById.has(rootPostId)) {
      return;
    }

    const activeGraphView = {
      type,
      rootPostId,
      relatedPostId,
    };
    options.setActiveGraphViewState(activeGraphView);
    options.setPendingGraphView(null);
    options.setActivePageFilter(null);
    options.syncThreadStateUrl({ history: viewOptions.history || "push" });
    options.renderThreadPosts();
    options.renderThreadSummaryMenu();

    if (viewOptions.scrollToFirstPost || viewOptions.scrollToFirstReply) {
      const viewPosts = getPostsForGraphView(
        activeGraphView,
        threadGraph,
        options.getLoadedThreadPosts(),
      );
      const targetPost = viewOptions.scrollToFirstPost
        ? viewPosts[0] || null
        : viewPosts.find((post) => post.id !== rootPostId) || null;

      if (targetPost) {
        if (
          viewOptions.scrollToFirstReply &&
          activeGraphView.type === "quoted-by"
        ) {
          options.selectPostById(targetPost.id, { scroll: false, updateUrl: true });
          options.selectPostById(rootPostId, { scroll: true, updateUrl: false });
          options.selectPostById(targetPost.id, { scroll: false, updateUrl: false });
          return;
        }

        options.selectPostById(targetPost.id, { scroll: true, updateUrl: true });
      }
    }
  }

  function activatePendingGraphView() {
    const pendingGraphView = options.getPendingGraphView();
    const threadGraph = options.getThreadGraph();

    if (
      !pendingGraphView ||
      options.getActiveGraphView() ||
      !threadGraph.postById.has(pendingGraphView.rootPostId)
    ) {
      return;
    }

    options.setActiveGraphViewState(pendingGraphView);
    options.setPendingGraphView(null);
    options.setActivePageFilter(null);
  }

  function applyThreadUrlState(url = new URL(location.href)): void {
    if (!isThreadPage() || options.getLoadedThreadPosts().length === 0) {
      return;
    }

    const queryState = readThreadQueryState(url);
    const activeGraphView = getValidGraphView(
      queryState.graphView,
      options.getThreadGraph(),
    );
    options.setActiveGraphViewState(activeGraphView);
    options.setPendingGraphView(null);
    options.setActivePageFilter(
      activeGraphView
        ? null
        : queryState.authorFilters.length > 0 || queryState.searchQuery
          ? null
          : queryState.pageFilter || getPageNumber(url),
    );
    options.setActiveAuthorFilters(new Set(queryState.authorFilters));
    options.setActiveThreadSearchQuery(queryState.searchQuery);

    options.updateOriginalThreadPageMenus();
    options.renderThreadPosts();
    options.renderThreadSummaryMenu();

    const hashPostId = getLocationPostHashId(url);

    if (hashPostId) {
      options.selectPostById(hashPostId, { scroll: true, updateUrl: false });
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }

  function installThreadHistoryNavigation(): void {
    window.addEventListener("popstate", () => applyThreadUrlState());
  }

  function getThreadViewPosts(posts: PostRecord[]): PostRecord[] {
    return getPostsForThreadView({
      posts,
      activeGraphView: options.getActiveGraphView(),
      graph: options.getThreadGraph(),
      shouldPromoteCitedPosts:
        !options.getActivePageFilter() && !options.hasActiveThreadPostFilters(),
    });
  }

  function getReplyIndentDepth(post: PostRecord, index: number): number {
    return getReplyIndentDepthForView({
      post,
      index,
      activeGraphView: options.getActiveGraphView(),
    });
  }

  return {
    setActiveGraphView,
    activatePendingGraphView,
    applyThreadUrlState,
    installThreadHistoryNavigation,
    getThreadViewPosts,
    getReplyIndentDepth,
  };
}
