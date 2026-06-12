import {
  getPostIdFromNavigationElement,
  getPostNavigationItems,
  getThreadTitleNavigationItems,
} from "../../ui/navigationDom";
import { renderShortcutHelpButton as renderShortcutHelpButtonInDom } from "../../ui/shortcutHelpDom";
import {
  formatShortcutHelpKey,
  getShortcutHelpItems,
} from "../../ui/shortcutHelpItems";
import {
  STYLE_ID,
  KEY_OPEN_SELECTED_THREAD_IN_NEW_TAB,
  NAVIGATION_STATUS_ID,
  FORUM_THREAD_CACHE_RECENT_PAGES,
  FORUM_LIVE_SEARCH_DEBOUNCE_MS,
  FORUM_STATE_QUERY_PARAMS,
  POSTS_SELECTOR,
} from "../../config/constants";
import {
  normalizeText,
  toUrl,
  getThreadId,
  getPageNumber,
  isThreadPage,
  isForumDisplayPage,
  getForumId,
} from "../../shared/dom";
import type {
  ForumThreadLoadState,
  ForumThreadRecord,
  NavigationItem,
} from "../../domain/types";
import {
  clampForumThreadListPage,
  getForumThreadListTotalPages,
} from "../../domain/forumThreadList";
import {
  clearForumStateQueryParams,
  readForumQueryState,
} from "../../services/queryState";
import { isOpenInNewTabKeyboardShortcut } from "../../services/keyboard";
import { createNavigationController } from "./navigationController";
import { createForumLayoutController } from "./forumLayoutController";
import { createForumPageKeyboardController } from "./forumPageKeyboardController";
import { createForumTagsController } from "./forumTagsController";
import { createForumThreadCacheController } from "./forumThreadCacheController";
import { createForumThreadListRenderer } from "./forumThreadListRenderer";

declare const __FC_PREMIUM_CSS__: string;

export interface ForumPageController {
  init(): Promise<void>;
  handleNavigationKeyDown(event: KeyboardEvent): boolean;
  refreshNavigation(options?: {
    reset?: boolean;
    scroll?: boolean;
    updateUrl?: boolean;
  }): void;
  renderTopTagBar(): void;
  renderForumControlsRow(): HTMLTableElement | null;
}

export function createForumPageController(): ForumPageController {
  const initialForumQueryState = readForumQueryState();
  let activeTagFilter: string | null = initialForumQueryState.tag;
  let activeForumTagPage = initialForumQueryState.page;
  let activeForumSearchQuery = "";
  let forumLiveSearchTimer = 0;
  let forumThreadLoadState: ForumThreadLoadState = {
    loadedPages: 0,
    targetPages: FORUM_THREAD_CACHE_RECENT_PAGES,
    isLoading: false,
  };
  function getPostsElement(): HTMLElement | null {
    const posts = document.querySelector(POSTS_SELECTOR);
    return posts instanceof HTMLElement ? posts : null;
  }

  function updateBrowserHistory(url: URL, historyMode: "push" | "replace") {
    if (historyMode === "push" && url.href !== location.href) {
      window.history.pushState(window.history.state, "", url.href);
      return;
    }

    window.history.replaceState(window.history.state, "", url.href);
  }

  function collectNavigationItems(): NavigationItem[] {
    if (isForumDisplayPage()) {
      return getThreadTitleNavigationItems();
    }

    if (isThreadPage()) {
      return getPostNavigationItems(getPostsElement());
    }

    return [];
  }

  const navigationController = createNavigationController({
    collectNavigationItems,
    onRenderNavigationStatus: renderNavigationStatus,
    onUpdateSelectedThreadUrl: updateSelectedPostUrl,
    getPostsElement,
  });

  function renderNavigationStatus() {
    document.getElementById(NAVIGATION_STATUS_ID)?.remove();
  }

  function updateSelectedPostUrl(selected: NavigationItem) {
    const postId = getPostIdFromNavigationElement(selected.element);

    if (!postId) {
      return;
    }

    const threadId = getThreadId(new URL(location.href));

    if (!threadId) {
      return;
    }

    const url = new URL(location.href);
    url.searchParams.set("t", threadId);
    url.hash = `post${postId}`;
    window.history.replaceState(window.history.state, "", url.href);
  }

  const refreshNavigation = navigationController.refreshNavigation;
  const moveNavigation = navigationController.moveNavigation;
  const selectNavigationIndex = navigationController.selectNavigationIndex;
  const selectNavigationElement = navigationController.selectNavigationElement;
  const getSelectedNavigationItem = navigationController.getSelectedNavigationItem;
  const getNavigationLength = navigationController.getNavigationLength;
  const getNavigationItems = navigationController.getNavigationItems;

  function isOpenSelectedThreadInNewTabShortcut(event: KeyboardEvent): boolean {
    if (!isForumDisplayPage()) {
      return false;
    }

    return isOpenInNewTabKeyboardShortcut(
      event,
      KEY_OPEN_SELECTED_THREAD_IN_NEW_TAB,
    );
  }

  function openSelectedForumThreadInNewTab(): boolean {
    if (!isForumDisplayPage()) {
      return false;
    }

    const selected = getSelectedNavigationItem();

    if (!selected?.link) {
      return false;
    }

    window.open(selected.link.href, "_blank", "noopener");
    return true;
  }

  function openSelectedNavigationItem() {
    const selected = getSelectedNavigationItem();

    if (!selected?.link) {
      return;
    }

    selected.link.click();
  }

  function navigateForumPage(direction: number): boolean {
    if (!isForumDisplayPage()) {
      return false;
    }

    const currentPage = activeTagFilter || activeForumSearchQuery
      ? activeForumTagPage
      : getPageNumber(new URL(location.href));
    const targetPage = currentPage + direction;

    if (targetPage < 1) {
      return false;
    }

    if (activeTagFilter || activeForumSearchQuery) {
      const totalPages = getForumThreadListTotalPages(
        getForumThreadRecordsForTag(activeTagFilter).length,
        getForumThreadsPerPage(),
      );
      const clampedPage = clampForumThreadListPage(targetPage, totalPages);

      if (clampedPage === currentPage) {
        return false;
      }

      setForumTagPage(clampedPage);
      return true;
    }

    const targetUrl = Array.from(
      document.querySelectorAll(".pagenav a[href*='forumdisplay.php']"),
    )
      .filter((link): link is HTMLAnchorElement => link instanceof HTMLAnchorElement)
      .map((link) => toUrl(link.getAttribute("href") || link.href))
      .find(
        (url) =>
          url &&
          url.pathname === location.pathname &&
          getForumId(url) === getForumId() &&
          getPageNumber(url) === targetPage,
      );

    if (!targetUrl) {
      return false;
    }

    void loadForumDisplayPageWithJavascript(targetUrl);
    return true;
  }

  function renderShortcutHelpButton() {
    renderShortcutHelpButtonInDom({ items: getShortcutHelpItems(), formatKey: formatShortcutHelpKey });
  }

  function installForumKeyboardNavigation(): void {
    window.addEventListener(
      "keydown",
      forumPageKeyboard.handleNavigationKeyDown,
      true,
    );
  }

  function ensureStyle() {
    const existing = document.getElementById(STYLE_ID);
    const style =
      existing instanceof HTMLStyleElement
        ? existing
        : document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = __FC_PREMIUM_CSS__;

    if (!existing) {
      document.head.appendChild(style);
    }
  }

  const forumTagsController = createForumTagsController({
    ensureStyle,
    getActiveTagFilter: () => activeTagFilter,
    setActiveTagFilter: (tag) => {
      activeTagFilter = tag;
    },
    setActiveForumTagPage: (page) => {
      activeForumTagPage = page;
    },
    syncForumTagUrl,
    refreshForumTagUi: () => refreshForumTagUi(),
    getVisibleCachedForumThreadsForCurrentForum,
  });

  const renderTaggedTitle = forumTagsController.renderTaggedTitle;
  const enhanceThreadTitleTags = forumTagsController.enhanceThreadTitleTags;
  const renderVisibleForumThreadTitleTags = forumTagsController.renderVisibleForumThreadTitleTags;
  const clearTagFilter = forumTagsController.clearTagFilter;
  const renderTopTagBar = forumTagsController.renderTopTagBar;

  const forumLayoutController = createForumLayoutController({
    ensureStyle,
    getPostsElement,
    getForumThreadLoadState: () => forumThreadLoadState,
    scheduleForumLiveSearch,
    getHiddenForumThreadRecordsForCurrentForum,
    setForumThreadHiddenState: (threadId, hidden) =>
      setForumThreadHiddenState(threadId, hidden),
  });

  const renderForumControlsRow = forumLayoutController.renderForumControlsRow;
  const renderForumLoadingStatus = forumLayoutController.renderForumLoadingStatus;
  const enhanceForumDisplayPage = forumLayoutController.enhanceForumDisplayPage;
  const renderHiddenThreadsToolbarButton = forumLayoutController.renderHiddenThreadsToolbarButton;
  const isHiddenThreadsModalOpen = forumLayoutController.isHiddenThreadsModalOpen;
  const closeHiddenThreadsModal = forumLayoutController.closeHiddenThreadsModal;
  const renderHiddenThreadsModalBody = forumLayoutController.renderHiddenThreadsModalBody;

  function setForumThreadLoadState(state: Partial<ForumThreadLoadState>) {
    forumThreadLoadState = {
      ...forumThreadLoadState,
      ...state,
    };
    renderForumLoadingStatus();
  }

  function applyForumLiveSearchQuery(query: string) {
    const normalizedQuery = normalizeText(query);

    if (normalizedQuery === activeForumSearchQuery) {
      return;
    }

    activeForumSearchQuery = normalizedQuery;
    activeForumTagPage = 1;
    refreshForumTagUi({ readUrlState: false });
  }

  function scheduleForumLiveSearch(query: string) {
    window.clearTimeout(forumLiveSearchTimer);
    forumLiveSearchTimer = window.setTimeout(() => {
      applyForumLiveSearchQuery(query);
    }, FORUM_LIVE_SEARCH_DEBOUNCE_MS);
  }

  function getCachedForumThreadsForCurrentForum(): ForumThreadRecord[] {
    return forumThreadCacheController.getCachedForumThreadsForCurrentForum();
  }

  function getVisibleCachedForumThreadsForCurrentForum(): ForumThreadRecord[] {
    return forumThreadCacheController.getVisibleCachedForumThreadsForCurrentForum();
  }

  function getHiddenForumThreadRecordsForCurrentForum(): ForumThreadRecord[] {
    return forumThreadCacheController.getHiddenForumThreadRecordsForCurrentForum();
  }

  function getForumThreadRecordsForTag(
    tag: string | null,
  ): ForumThreadRecord[] {
    return forumThreadCacheController.getForumThreadRecordsForTag(tag);
  }

  function syncForumTagUrl(options: { history?: "push" | "replace" } = {}) {
    if (!isForumDisplayPage()) {
      return;
    }

    const url = new URL(location.href);
    clearForumStateQueryParams(url);
    url.searchParams.delete("page");

    if (activeTagFilter) {
      url.searchParams.set(FORUM_STATE_QUERY_PARAMS.tag, activeTagFilter);
    }

    if (activeForumTagPage > 1) {
      url.searchParams.set("page", String(activeForumTagPage));
    }

    updateBrowserHistory(url, options.history || "replace");
  }

  function getForumDynamicPageUrl(pageNumber: number): URL {
    const url = new URL(location.href);
    clearForumStateQueryParams(url);
    url.searchParams.delete("page");
    url.hash = "";

    if (activeTagFilter) {
      url.searchParams.set(FORUM_STATE_QUERY_PARAMS.tag, activeTagFilter);
    }

    if (pageNumber > 1) {
      url.searchParams.set("page", String(pageNumber));
    }

    return url;
  }

  function setForumTagPage(pageNumber: number) {
    activeForumTagPage = pageNumber;
    if (!activeForumSearchQuery) {
      syncForumTagUrl({ history: "push" });
    }
    refreshForumTagUi({ readUrlState: !activeForumSearchQuery });
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  const forumThreadCacheController = createForumThreadCacheController({
    getActiveForumSearchQuery: () => activeForumSearchQuery,
    setActiveForumSearchQuery: (query) => {
      activeForumSearchQuery = query;
    },
    setActiveTagFilter: (tag) => {
      activeTagFilter = tag;
    },
    setActiveForumTagPage: (page) => {
      activeForumTagPage = page;
    },
    getForumThreadsPerPage: () => getForumThreadsPerPage(),
    getForumThreadLoadState: () => forumThreadLoadState,
    setForumThreadLoadState,
    setNativeForumThreadRows: (rows, pageSize, signatureKey) =>
      setNativeForumThreadRows(rows, pageSize, signatureKey),
    applyHiddenForumThreadRows: () => applyHiddenForumThreadRows(),
    refreshForumTagUi: () => refreshForumTagUi(),
    renderTopTagBar: () => renderTopTagBar(),
    updateBrowserHistory,
    refreshNavigation,
    getSelectedNavigationItem,
    getNavigationItems,
    getNavigationLength,
    selectNavigationIndex,
    isHiddenThreadsModalOpen,
    renderHiddenThreadsModalBody,
  });

  const loadForumDisplayPageWithJavascript = forumThreadCacheController.loadForumDisplayPageWithJavascript;
  const initializeForumThreadCache = forumThreadCacheController.initializeForumThreadCache;
  const setForumThreadHiddenState = forumThreadCacheController.setForumThreadHiddenState;
  const hideSelectedForumThread = forumThreadCacheController.hideSelectedForumThread;

  const forumThreadListRenderer = createForumThreadListRenderer({
    getActiveTagFilter: () => activeTagFilter,
    getActiveForumTagPage: () => activeForumTagPage,
    setActiveForumTagPage: (page) => {
      activeForumTagPage = page;
    },
    getActiveForumSearchQuery: () => activeForumSearchQuery,
    getCachedForumThreadsForCurrentForum,
    getHiddenForumThreadRecordsForCurrentForum,
    getForumThreadRecordsForTag,
    getForumDynamicPageUrl,
    setForumTagPage,
    renderTaggedTitle,
    renderVisibleForumThreadTitleTags: () => renderVisibleForumThreadTitleTags(),
  });

  const captureNativeForumThreadRows = forumThreadListRenderer.captureNativeForumThreadRows;
  const getForumThreadsPerPage = forumThreadListRenderer.getForumThreadsPerPage;
  const setNativeForumThreadRows = forumThreadListRenderer.setNativeForumThreadRows;
  const applyHiddenForumThreadRows = forumThreadListRenderer.applyHiddenForumThreadRows;
  const renderForumThreadList = forumThreadListRenderer.renderForumThreadList;

  function handleForumPageNavigationClick(event: MouseEvent): void {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      return;
    }

    const link =
      event.target instanceof Element
        ? event.target.closest(".pagenav a[href*='forumdisplay.php']")
        : null;

    if (!(link instanceof HTMLAnchorElement)) {
      return;
    }

    const url = toUrl(link.getAttribute("href") || link.href);

    if (
      !url ||
      url.pathname !== location.pathname ||
      getForumId(url) !== getForumId()
    ) {
      return;
    }

    event.preventDefault();

    if (activeTagFilter || activeForumSearchQuery) {
      setForumTagPage(getPageNumber(url));
      return;
    }

    void loadForumDisplayPageWithJavascript(url);
  }

  function installForumPageNavigation(): void {
    document.addEventListener("click", handleForumPageNavigationClick, true);
  }

  function refreshForumTagUi(options: { readUrlState?: boolean } = {}) {
    if (options.readUrlState !== false) {
      const queryState = readForumQueryState();
      activeTagFilter = queryState.tag;

      if (!activeForumSearchQuery) {
        activeForumTagPage = queryState.page;
      }
    }

    const threadListChanged = renderForumThreadList();
    renderTopTagBar();
    renderForumControlsRow();
    renderHiddenThreadsToolbarButton();
    refreshNavigation({ reset: threadListChanged });
  }

  function applyForumUrlState() {
    if (!isForumDisplayPage()) {
      return;
    }

    const queryState = readForumQueryState();
    activeTagFilter = queryState.tag;
    activeForumTagPage = queryState.page;
    refreshForumTagUi();
  }

  function installForumHistoryNavigation() {
    window.addEventListener("popstate", applyForumUrlState);
  }

  function initForumPage(): void {
    if (!isForumDisplayPage()) {
      return;
    }

    enhanceForumDisplayPage();
    installForumHistoryNavigation();
    installForumPageNavigation();
    installForumKeyboardNavigation();
    void initializeForumThreadCache();
    refreshNavigation({ reset: true });
    renderShortcutHelpButton();
  }

  const forumPageKeyboard = createForumPageKeyboardController({
    moveNavigation,
    selectNavigationIndex,
    getNavigationLength,
    refreshNavigation,
    isOpenSelectedThreadInNewTabShortcut,
    openSelectedForumThreadInNewTab,
    isHiddenThreadsModalOpen,
    closeHiddenThreadsModal,
    activeTagFilterExists: () => Boolean(activeTagFilter),
    clearTagFilter,
    hideSelectedForumThread,
    openSelectedNavigationItem,
    navigateForumPage,
    isThreadPage,
  });

  return {
    init: async () => {
      initForumPage();
    },
    handleNavigationKeyDown: forumPageKeyboard.handleNavigationKeyDown,
    refreshNavigation,
    renderTopTagBar,
    renderForumControlsRow,
  };
}
