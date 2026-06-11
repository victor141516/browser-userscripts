import {
  getPostIdFromNavigationElement,
  getPostNavigationItems,
} from "../../ui/navigationDom";
import {
  ensureThreadSummary as ensureThreadSummaryInDom,
  renderThreadSummaryMenu as renderThreadSummaryMenuInDom,
} from "../../ui/threadSummaryDom";
import {
  NAVIGATION_STATUS_ID,
  THREAD_SUMMARY_ID,
  POSTS_SELECTOR,
} from "../../config/constants";
import {
  getThreadId,
  getPageNumber,
  getLocationPostHashId,
  isThreadPage,
} from "../../shared/dom";
import type {
  ActiveGraphView,
  NavigationItem,
  PostRecord,
  ThreadGraph,
  ThreadLoadState,
  ThreadPage,
} from "../../domain/types";
import {
  applyOriginalPosterFlags,
  applyReplyCounts,
  buildThreadGraph,
  createEmptyThreadGraph,
} from "../../domain/threadPosts";
import { getMaxThreadPage } from "../../adapters/forocoches/threadParser";
import {
  clickPostQuoteAction,
  openThreadReplyWithoutQuote as openThreadReplyWithoutQuoteAction,
  togglePostMultiquote,
} from "../../adapters/forocoches/postReplyActions";
import { readThreadQueryState } from "../../services/queryState";
import {
  cleanupThreadCache,
  clearCurrentThreadCache,
} from "../../services/threadCache";
import { createNavigationController } from "./navigationController";
import { createThreadGraphViewController } from "./threadGraphViewController";
import { createThreadPageHeaderController } from "./threadPageHeaderController";
import { enhanceThreadPage as enhanceThreadPageFromLoader } from "./threadPageLoader";
import { createThreadPageKeyboardController } from "./threadPageKeyboardController";
import { createThreadPagePaginationController } from "./threadPagePaginationController";
import { createThreadPostFilterController } from "./threadPostFilterController";
import { createThreadPostRenderer } from "./threadPostRenderer";
import { createThreadUrlController } from "./threadUrlController";

declare const __FC_PREMIUM_CSS__: string;

export interface ThreadPageController {
  init(): Promise<void>;
  handleNavigationKeyDown(event: KeyboardEvent): boolean;
  refreshNavigation(options?: {
    reset?: boolean;
    scroll?: boolean;
    updateUrl?: boolean;
  }): void;
  updateSummaryMenu(): void;
}

export function createThreadPageController(): ThreadPageController {
  const initialThreadQueryState = readThreadQueryState();
  let loadedThreadPosts: PostRecord[] = [];
  let threadPages: ThreadPage[] = [];
  let loadedThreadPageNumbers: Set<number> = new Set();
  let threadLoadState: ThreadLoadState = {
    loadedPages: 0,
    targetPages: 0,
    totalPages: 0,
    loadedPosts: 0,
    isLoading: false,
  };
  let threadGraph: ThreadGraph = createEmptyThreadGraph();
  let activeGraphView: ActiveGraphView | null = null;
  let pendingGraphView: ActiveGraphView | null =
    initialThreadQueryState.graphView;
  const compactModeEnabled = true;
  let activePageFilter: number | null = initialThreadQueryState.pageFilter;
  let activeAuthorFilters: Set<string> = new Set(
    initialThreadQueryState.authorFilters,
  );
  let activeThreadSearchQuery = initialThreadQueryState.searchQuery;
  let pendingInitialHashPostId: string | null = getLocationPostHashId();

  const threadUrlController = createThreadUrlController({
    getThreadPages: () => threadPages,
    getLoadedThreadPosts: () => loadedThreadPosts,
    getActiveGraphView: () => activeGraphView,
    getPendingGraphView: () => pendingGraphView,
    getActiveThreadSearchQuery: () => activeThreadSearchQuery,
    getActiveAuthorFilters: () => activeAuthorFilters,
  });

  const syncThreadStateUrl = threadUrlController.syncThreadStateUrl;
  const getThreadPagesForTotal = threadUrlController.getThreadPagesForTotal;
  const getThreadPageUrl = threadUrlController.getThreadPageUrl;
  const updateThreadPageUrl = threadUrlController.updateThreadPageUrl;

  function getPostsElement(): HTMLElement | null {
    const posts = document.querySelector(POSTS_SELECTOR);
    return posts instanceof HTMLElement ? posts : null;
  }

  const threadPageHeaderController = createThreadPageHeaderController();
  const prepareThreadPage = threadPageHeaderController.prepareThreadPage;
  const renderShortcutHelpButton =
    threadPageHeaderController.renderShortcutHelpButton;

  function collectNavigationItems(): NavigationItem[] {
    return isThreadPage() ? getPostNavigationItems(getPostsElement()) : [];
  }

  const navigationController = createNavigationController({
    collectNavigationItems,
    onRenderNavigationStatus: renderNavigationStatus,
    onUpdateSelectedThreadUrl: threadUrlController.updateSelectedPostUrl,
    getPostsElement,
  });

  function renderNavigationStatus(selected: NavigationItem | null) {
    void selected;
    document.getElementById(NAVIGATION_STATUS_ID)?.remove();
  }

  const refreshNavigation = navigationController.refreshNavigation;
  const moveNavigation = navigationController.moveNavigation;
  const selectNavigationIndex = navigationController.selectNavigationIndex;
  const selectNavigationElement = navigationController.selectNavigationElement;
  const getSelectedNavigationItem =
    navigationController.getSelectedNavigationItem;
  const getSelectedPostWrapper = navigationController.getSelectedPostWrapper;
  const getNavigationLength = navigationController.getNavigationLength;

  function quoteSelectedPost(wrapper: HTMLElement): boolean {
    return clickPostQuoteAction(wrapper);
  }

  function toggleSelectedPostMultiquote(wrapper: HTMLElement): boolean {
    return togglePostMultiquote(
      wrapper,
      getPostIdFromNavigationElement(wrapper),
    );
  }

  function openThreadReplyWithoutQuote(): boolean {
    return openThreadReplyWithoutQuoteAction(
      getThreadId(new URL(location.href)),
    );
  }

  const threadPageKeyboard = createThreadPageKeyboardController({
    moveNavigation,
    selectNavigationIndex,
    getNavigationLength,
    refreshNavigation,
    getActiveGraphView: () => activeGraphView,
    hasActiveThreadPostFilters: () => hasActiveThreadPostFilters(),
    openThreadReplyWithoutQuote,
    quoteSelectedPost: (wrapper) => quoteSelectedPost(wrapper),
    toggleSelectedPostMultiquote: (wrapper) =>
      toggleSelectedPostMultiquote(wrapper),
    getSelectedPostWrapper,
    clearThreadFilters: () => clearThreadFilters(),
  });

  function installKeyboardNavigation() {
    window.addEventListener(
      "keydown",
      threadPageKeyboard.handleNavigationKeyDown,
      true,
    );
  }

  function getThreadPages(): ThreadPage[] {
    const maxPage = getMaxThreadPage(document);
    return getThreadPagesForTotal(maxPage);
  }

  function ensureThreadSummary(): HTMLElement | null {
    return ensureThreadSummaryInDom(getPostsElement());
  }

  function renderThreadSummaryMenu(summary: HTMLElement | null) {
    renderThreadSummaryMenuInDom({
      summary,
      state: threadLoadState,
      onRefreshCache: async () => {
        await clearCurrentThreadCache();
        location.reload();
      },
    });
  }

  function jumpToLoadedPost(postId: string) {
    const post = loadedThreadPosts.find((item) => item.id === postId);

    if (post) {
      activePageFilter = post.pageNumber;
      updateThreadPageUrl(post.pageNumber);
      updateOriginalThreadPageMenus();
      renderThreadPosts(loadedThreadPosts);
      renderThreadSummaryMenu(document.getElementById(THREAD_SUMMARY_ID));
    }

    selectPostById(postId);
  }

  const threadPagePaginationController = createThreadPagePaginationController({
    getPostsElement,
    getThreadPages: () => threadPages,
    getActivePageFilter: () => activePageFilter,
    setActivePageFilter: (pageNumber) => {
      activePageFilter = pageNumber;
    },
    getActiveGraphView: () => activeGraphView,
    clearGraphView: () => {
      activeGraphView = null;
      pendingGraphView = null;
    },
    getThreadPageUrl,
    updateThreadPageUrl,
    renderThreadPosts: () => renderThreadPosts(loadedThreadPosts),
    renderThreadSummaryMenu: () => {
      renderThreadSummaryMenu(document.getElementById(THREAD_SUMMARY_ID));
    },
  });

  const applyPageFilter = threadPagePaginationController.applyPageFilter;
  const updateOriginalThreadPageMenus =
    threadPagePaginationController.updateOriginalThreadPageMenus;
  const installThreadPageNavigation =
    threadPagePaginationController.installThreadPageNavigation;

  const threadPostFilterController = createThreadPostFilterController({
    getPostsElement,
    getLoadedThreadPosts: () => loadedThreadPosts,
    getThreadLoadState: () => threadLoadState,
    getActiveThreadSearchQuery: () => activeThreadSearchQuery,
    setActiveThreadSearchQuery: (query) => {
      activeThreadSearchQuery = query;
    },
    getActiveAuthorFilters: () => activeAuthorFilters,
    clearActiveAuthorFilters: () => {
      activeAuthorFilters.clear();
    },
    setPageFilterToCurrentPage: () => {
      activePageFilter = getPageNumber(new URL(location.href));
    },
    hasPageFilter: () => Boolean(activePageFilter),
    hasGraphViewOrPendingGraphView: () => Boolean(activeGraphView || pendingGraphView),
    clearGraphViewAndPageFilter: () => {
      activeGraphView = null;
      pendingGraphView = null;
      activePageFilter = null;
    },
    syncThreadStateUrl,
    renderThreadPosts: () => renderThreadPosts(loadedThreadPosts),
    renderThreadSummaryMenu: () => {
      renderThreadSummaryMenu(document.getElementById(THREAD_SUMMARY_ID));
    },
    applyPageFilter,
    updateOriginalThreadPageMenus,
    refreshNavigation,
  });

  const hasActiveThreadPostFilters =
    threadPostFilterController.hasActiveThreadPostFilters;
  const renderThreadSearchPanel =
    threadPostFilterController.renderThreadSearchPanel;
  const clearThreadPostFilters =
    threadPostFilterController.clearThreadPostFilters;
  const clearThreadFilters = threadPostFilterController.clearThreadFilters;
  const applyThreadPostFilters =
    threadPostFilterController.applyThreadPostFilters;
  const enhanceAuthorFilterButton =
    threadPostFilterController.enhanceAuthorFilterButton;

  const threadGraphViewController = createThreadGraphViewController({
    getThreadGraph: () => threadGraph,
    getLoadedThreadPosts: () => loadedThreadPosts,
    getActiveGraphView: () => activeGraphView,
    setActiveGraphViewState: (view) => {
      activeGraphView = view;
    },
    getPendingGraphView: () => pendingGraphView,
    setPendingGraphView: (view) => {
      pendingGraphView = view;
    },
    getActivePageFilter: () => activePageFilter,
    setActivePageFilter: (pageNumber) => {
      activePageFilter = pageNumber;
    },
    setActiveAuthorFilters: (authors) => {
      activeAuthorFilters = authors;
    },
    setActiveThreadSearchQuery: (query) => {
      activeThreadSearchQuery = query;
    },
    hasActiveThreadPostFilters,
    syncThreadStateUrl,
    updateThreadPageUrl,
    updateOriginalThreadPageMenus,
    renderThreadPosts: () => renderThreadPosts(loadedThreadPosts),
    renderThreadSummaryMenu: () => {
      renderThreadSummaryMenu(document.getElementById(THREAD_SUMMARY_ID));
    },
    selectPostById: (postId, options) => selectPostById(postId, options),
  });

  const setActiveGraphView = threadGraphViewController.setActiveGraphView;
  const activatePendingGraphView =
    threadGraphViewController.activatePendingGraphView;
  const applyThreadUrlState = threadGraphViewController.applyThreadUrlState;
  const installThreadHistoryNavigation =
    threadGraphViewController.installThreadHistoryNavigation;
  const getThreadViewPosts = threadGraphViewController.getThreadViewPosts;
  const getReplyIndentDepth = threadGraphViewController.getReplyIndentDepth;

  const threadPostRenderer = createThreadPostRenderer({
    compactModeEnabled,
    getPostsElement,
    getActiveGraphView: () => activeGraphView,
    getPendingInitialHashPostId: () => pendingInitialHashPostId,
    clearPendingInitialHashPostId: () => {
      pendingInitialHashPostId = null;
    },
    getSelectedNavigationItem,
    getThreadViewPosts,
    getReplyIndentDepth,
    applyThreadPostFilters,
    applyPageFilter,
    updateOriginalThreadPageMenus,
    renderThreadSearchPanel,
    refreshNavigation,
    selectNavigationElement,
    enhanceAuthorFilterButton,
    setActiveGraphView,
    jumpToLoadedPost,
  });

  const renderThreadPosts = threadPostRenderer.renderThreadPosts;
  const selectPostById = threadPostRenderer.selectPostById;

  function hydrateThreadPosts(posts: PostRecord[]) {
    applyReplyCounts(posts);
    applyOriginalPosterFlags(posts);
    loadedThreadPosts = posts.slice();
    threadGraph = buildThreadGraph(loadedThreadPosts);
    activatePendingGraphView();
  }

  async function enhanceThreadPage(): Promise<void> {
    await enhanceThreadPageFromLoader({
      prepareThreadPage,
      ensureThreadSummary,
      getThreadPages,
      getThreadPagesForTotal,
      getPendingInitialHashPostId: () => pendingInitialHashPostId,
      setThreadPages: (pages) => {
        threadPages = pages;
      },
      setLoadedThreadPosts: (posts) => {
        loadedThreadPosts = posts;
      },
      setLoadedThreadPageNumbers: (pageNumbers) => {
        loadedThreadPageNumbers = pageNumbers;
      },
      setThreadGraphEmpty: () => {
        threadGraph = createEmptyThreadGraph();
      },
      setActiveGraphView: (view) => {
        activeGraphView = view;
      },
      setPendingGraphView: (view) => {
        pendingGraphView = view;
      },
      setActivePageFilter: (pageNumber) => {
        activePageFilter = pageNumber;
      },
      setActiveAuthorFilters: (authors) => {
        activeAuthorFilters = authors;
      },
      setActiveThreadSearchQuery: (query) => {
        activeThreadSearchQuery = query;
      },
      setThreadLoadState: (state) => {
        threadLoadState = state;
      },
      getThreadLoadState: () => threadLoadState,
      hydrateThreadPosts,
      renderThreadPosts: () => renderThreadPosts(loadedThreadPosts),
      renderThreadSummaryMenu,
      renderThreadSearchPanel: () => renderThreadSearchPanel(),
      updateThreadPageUrl,
      syncThreadStateUrl,
    });
  }

  async function initialize(): Promise<void> {
    if (!isThreadPage()) {
      await cleanupThreadCache();
      return;
    }

    installKeyboardNavigation();
    await enhanceThreadPage();
    installThreadPageNavigation();
    installThreadHistoryNavigation();
  }

  return {
    init: initialize,
    handleNavigationKeyDown: threadPageKeyboard.handleNavigationKeyDown,
    refreshNavigation,
    updateSummaryMenu: () => {
      renderThreadSummaryMenu(document.getElementById(THREAD_SUMMARY_ID));
    },
  };
}
