import { ThreadSearchPanel } from "../../ui/components/ThreadSearchPanel";
import {
  refreshSelectedThreadAuthors as refreshSelectedThreadAuthorsInDom,
  refreshThreadAuthorDatalist as refreshThreadAuthorDatalistInDom,
  renderThreadSearchEmptyState as renderThreadSearchEmptyStateInDom,
  renderThreadSearchStatus as renderThreadSearchStatusInDom,
  syncThreadSearchTextInput,
  type ThreadSearchCounts,
} from "../../ui/threadSearchPanelDom";
import {
  applyPageFilterToRenderedPosts,
  applyThreadPostFiltersToRenderedPosts,
  enhanceAuthorFilterButton as enhanceAuthorFilterButtonInDom,
} from "../../ui/threadPostFiltersDom";
import {
  clearNavigationSelection,
  getPostIdFromNavigationElement,
  getPostNavigationItems,
  getSelectedPostWrapper as getSelectedPostWrapperFromDom,
  getThreadTitleNavigationItems,
  markNavigationItemSelected,
  scrollNavigationElementIntoView as scrollNavigationElementIntoViewInDom,
} from "../../ui/navigationDom";
import {
  closeShortcutHelpPopover,
  isShortcutHelpPopoverOpen,
  renderShortcutHelpButton as renderShortcutHelpButtonInDom,
  setShortcutHelpPopoverOpen,
} from "../../ui/shortcutHelpDom";
import {
  relocatePostFooterControls,
  removeTrailingPostLayoutArtifacts,
} from "../../ui/postNativeDom";
import { enhanceNativePostHeader } from "../../ui/postHeaderDom";
import {
  updatePostCompactLayout,
  updateRenderedCompactPostLayouts as updateRenderedCompactPostLayoutsInDom,
} from "../../ui/postCompactLayoutDom";
import { enhanceQuoteLinks as enhanceQuoteLinksInDom } from "../../ui/postQuoteDom";
import { appendReplyBadge } from "../../ui/postReplyBadgeDom";
import {
  ensureThreadSummary as ensureThreadSummaryInDom,
  renderThreadSummaryMenu as renderThreadSummaryMenuInDom,
  setThreadSummaryMessage,
} from "../../ui/threadSummaryDom";
import {
  formatShortcutHelpKey,
  getShortcutHelpItems,
} from "../../ui/shortcutHelpItems";
import {
  ForumLoadingStatus,
  ForumSidebarToggleButton,
} from "../../ui/components/ForumControls";
import {
  closeHiddenThreadsModal as closeHiddenThreadsModalInDom,
  ensureHiddenThreadsModal as ensureHiddenThreadsModalInDom,
  isHiddenThreadsModalOpen as isHiddenThreadsModalOpenInDom,
  openHiddenThreadsModal as openHiddenThreadsModalInDom,
  renderHiddenThreadsModalBody as renderHiddenThreadsModalBodyInDom,
  renderHiddenThreadsToolbarButton as renderHiddenThreadsToolbarButtonInDom,
} from "../../ui/hiddenThreadsModalDom";
import { ForumPager } from "../../ui/components/ForumPager";
import {
  TagChip,
  TopTagBar,
  type TopTagSummary,
} from "../../ui/components/Tags";
import {
  STYLE_ID,
  INSTANCE_KEY,
  SCRIPT_INSTANCE_VERSION,
  KEY_NAV_PREVIOUS_POST,
  KEY_NAV_NEXT_POST,
  KEY_NAV_FIRST_POST,
  KEY_NAV_LAST_POST,
  KEY_CLEAR_ACTIVE_VIEW,
  KEY_OPEN_SHORTCUT_HELP,
  KEY_QUOTE_SELECTED_POST,
  KEY_OPEN_SELECTED_THREAD_IN_NEW_TAB,
  KEY_HIDE_SELECTED_THREAD,
  KEY_NEW_THREAD_REPLY,
  KEY_MULTIQUOTE_SELECTED_POST,
  TOP_TAGS_ID,
  FORUM_SIDEBAR_TOGGLE_BAR_ID,
  FORUM_SIDEBAR_TOGGLE_ID,
  FORUM_CONTROLS_ROW_ID,
  FORUM_SEARCH_SLOT_ID,
  FORUM_LOADING_STATUS_ID,
  NAVIGATION_STATUS_ID,
  THREAD_SUMMARY_ID,
  THREAD_SEARCH_PANEL_ID,
  THREAD_SEARCH_AUTHOR_INPUT_ID,
  FORUM_SIDEBAR_HIDDEN_CLASS,
  COMPACT_MODE_CLASS,
  FORUM_SIDEBAR_STORAGE_KEY,
  THREAD_CACHE_MAX_AGE_MS,
  THREAD_CACHE_MAX_BYTES,
  THREAD_CACHE_DB_NAME,
  THREAD_CACHE_DB_VERSION,
  THREAD_CACHE_STORE_NAME,
  FORUM_THREAD_CACHE_STORE_NAME,
  THREAD_CACHE_RECORD_VERSION,
  FORUM_THREAD_CACHE_RECORD_VERSION,
  FORUM_THREAD_CACHE_RECENT_PAGES,
  FORUM_THREAD_CACHE_MAX_RECORDS,
  FORUM_THREAD_FALLBACK_PAGE_SIZE,
  FORUM_LIVE_SEARCH_DEBOUNCE_MS,
  THREAD_STATE_QUERY_PARAMS,
  FORUM_STATE_QUERY_PARAMS,
  FORUM_LAYOUT_HIDDEN_ATTRIBUTE,
  POSTS_SELECTOR,
  POST_TABLE_SELECTOR,
  THREAD_TITLE_SELECTOR,
  PAGE_LOAD_DELAY_MS,
  GRAPH_VIEW_TYPES
} from "../../config/constants";
import {
  normalizeText,
  normalizeLayoutText,
  normalizeAuthorName,
  sleep,
  isVisible,
  toUrl,
  getThreadId,
  getPageNumber,
  getLocationPostHashId,
  isThreadPage,
  isForumDisplayPage,
  getForumId
} from "../../shared/dom";
import { findTagsInText, splitTextByTags } from "../../domain/tags";
import type {
  ActiveGraphView,
  ForumQueryState,
  ForumThreadLoadState,
  ForumThreadRecord,
  GraphViewType,
  NavigationItem,
  PostRecord,
  ThreadAuthorOption,
  ThreadGraph,
  ThreadLoadState,
  ThreadPage,
  ThreadQueryState,
} from "../../domain/types";
import {
  applyOriginalPosterFlags,
  applyReplyCounts,
  buildThreadGraph,
  createEmptyThreadGraph,
  getGraphViewLabel,
  getPostsForGraphView,
  getReplyIndentDepth as getReplyIndentDepthForView,
  getReplyRankByPostId,
  getThreadViewPosts as getPostsForThreadView,
  getValidGraphView,
  sortPostsChronologically,
} from "../../domain/threadPosts";
import {
  filterForumThreadRecords,
  getHiddenForumThreadRecords,
  getVisibleForumThreadRecords,
  sortForumThreadRecords,
} from "../../domain/forumThreads";
import {
  getThreadAuthorOptions as buildThreadAuthorOptions,
  resolveThreadAuthorInputValue as resolveThreadAuthorInputValueFromOptions,
} from "../../domain/threadAuthors";
import { getVisiblePageNumbers } from "../../domain/pagination";
import {
  clampForumThreadListPage,
  getForumThreadListPage,
  getForumThreadListTotalPages,
  getForumThreadRowsSignature,
} from "../../domain/forumThreadList";
import {
  collectPosts,
  fetchThreadDocument,
  getMaxThreadPage,
  getQuotedPostId,
  getThreadIdFromDocument,
  parseHtml,
} from "../../adapters/forocoches/threadParser";
import {
  collectForumThreadRecords,
  getTitleTags,
} from "../../adapters/forocoches/forumThreadParser";
import {
  getForumMainCell,
  getForumSidebarCell,
  getForumSidebarSpacerCell,
  getForumThreadListHeaderTable,
  getForumThreadsTable,
  getRelatedForumsPanel,
  hideElementAndAdjacentSpacers,
  isForumTopShortcutBar,
  removeForumTitleTables,
  setForumLayoutElementHidden,
  setForumMainCellExpanded,
  shouldIgnoreTopNavigationTable,
} from "../../adapters/forocoches/forumLayout";
import {
  getNavbarSearchLink,
  getThreadBreadcrumbContentTable,
  getThreadBreadcrumbOuterTable,
  getThreadTitleTable,
  hideForumHeaderSearchForm,
  hideNativeThreadSearchMenu,
  moveForumHeaderSearchForm,
} from "../../adapters/forocoches/threadHeader";
import {
  applyHiddenForumThreadRows as applyHiddenForumThreadRowsInDom,
  renderForumThreadRowsFromHtml,
  renderVisibleForumThreadTitleTags as renderVisibleForumThreadTitleTagsInDom,
  restoreForumThreadRowsFromHtml,
} from "../../adapters/forocoches/forumThreadListDom";
import {
  clickPostQuoteAction,
  openThreadReplyWithoutQuote as openThreadReplyWithoutQuoteAction,
  togglePostMultiquote,
} from "../../adapters/forocoches/postReplyActions";
import {
  getOriginalThreadPageLinkNumber,
  updateOriginalThreadPageMenus as updateOriginalThreadPageMenusInDom,
} from "../../adapters/forocoches/threadPageNavigation";
import {
  clearForumStateQueryParams,
  clearThreadStateQueryParams,
  isThreadUrl,
  readForumQueryState,
  readThreadQueryState,
} from "../../services/queryState";
import {
  canUseThreadCache,
  cleanupThreadCache,
  cleanupForumThreadCache,
  clearCurrentThreadCache,
  estimateThreadCacheByteSize,
  isCompleteThreadCache,
  normalizeCachedPostRecord,
  readCurrentThreadCache,
  readForumThreadCacheRecords,
  waitForIdbRequest,
  waitForIdbTransaction,
  writeCurrentThreadCache,
  writeForumThreadCacheRecords,
} from "../../services/threadCache";
import {
  hasKeyboardModifier,
  isEditableTarget,
  isMacKeyboardPlatform,
  isOpenInNewTabKeyboardShortcut,
  keyboardShortcutMatches,
} from "../../services/keyboard";

declare const __FC_PREMIUM_CSS__: string;

export interface ThreadPageController {
  init(): Promise<void>;
  handleNavigationKeyDown(event: KeyboardEvent): boolean;
  refreshNavigation(options?: { reset?: boolean, scroll?: boolean, updateUrl?: boolean }): void;
  updateSummaryMenu(): void;
}

export function createThreadPageController(): ThreadPageController {
  const initialThreadQueryState = readThreadQueryState();
  let navigationItems: NavigationItem[] = [];
  let selectedNavigationIndex = -1;
  let loadedThreadPosts: PostRecord[] = [];
  let threadPages: ThreadPage[] = [];
  let loadedThreadPageNumbers: Set<number> = new Set();
  let threadLoadState: ThreadLoadState = { loadedPages: 0, targetPages: 0, totalPages: 0, loadedPosts: 0, isLoading: false };
  let threadGraph: ThreadGraph = createEmptyThreadGraph();
  let activeGraphView: ActiveGraphView | null = null;
  let pendingGraphView: ActiveGraphView | null = initialThreadQueryState.graphView;
  const compactModeEnabled = true;
  let activePageFilter: number | null = initialThreadQueryState.pageFilter;
  let activeAuthorFilters: Set<string> = new Set(initialThreadQueryState.authorFilters);
  let activeThreadSearchQuery = initialThreadQueryState.searchQuery;
  let pendingInitialHashPostId: string | null = getLocationPostHashId();
  let threadPostSearchTextById: Map<string, string> = new Map();
  let parsedForumRowsCache: ForumThreadRecord[] = [];

  function writeCurrentThreadStateQueryParams(url: URL): void {
    clearThreadStateQueryParams(url);
    const graphView = activeGraphView || pendingGraphView;
    if (graphView) {
      url.searchParams.set(THREAD_STATE_QUERY_PARAMS.graphType, graphView.type);
      url.searchParams.set(THREAD_STATE_QUERY_PARAMS.graphRoot, graphView.rootPostId);
      if (graphView.relatedPostId) { url.searchParams.set(THREAD_STATE_QUERY_PARAMS.graphRelated, graphView.relatedPostId); }
    }
    if (activeThreadSearchQuery) {
      url.searchParams.set(THREAD_STATE_QUERY_PARAMS.searchQuery, activeThreadSearchQuery);
    }
    for (const author of activeAuthorFilters) {
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

  function syncThreadStateUrl(options: { history?: "push" | "replace" } = {}) {
    if (!isThreadPage()) { return; }
    const url = new URL(location.href);
    writeCurrentThreadStateQueryParams(url);
    updateBrowserHistory(url, options.history || "replace");
  }

  function getPostsElement(): HTMLElement | null {
    const posts = document.querySelector(POSTS_SELECTOR);
    return posts instanceof HTMLElement ? posts : null;
  }

  function ensureStyle() {
    const existing = document.getElementById(STYLE_ID);
    const style = existing instanceof HTMLStyleElement
      ? existing
      : document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = __FC_PREMIUM_CSS__;

    if (!existing) {
      document.head.appendChild(style);
    }
  }

  function hideUnusedTopNavigationBars() {
    return;
  }

  function collectNavigationItems(): NavigationItem[] {
    return isThreadPage() ? getPostNavigationItems(getPostsElement()) : [];
  }

  function refreshNavigation(options: { reset?: boolean, scroll?: boolean, updateUrl?: boolean } = {}) {
    const previousElement = navigationItems[selectedNavigationIndex]?.element;
    navigationItems = collectNavigationItems();

    if (navigationItems.length === 0) {
      selectedNavigationIndex = -1;
      renderNavigationSelection(options);
      return;
    }

    if (options.reset || selectedNavigationIndex < 0) {
      selectedNavigationIndex = 0;
    } else {
      const preservedIndex = navigationItems.findIndex(
        (item) => item.element === previousElement,
      );
      selectedNavigationIndex = preservedIndex >= 0 ? preservedIndex : 0;
    }

    renderNavigationSelection(options);
  }

  function renderNavigationSelection(options: { scroll?: boolean, updateUrl?: boolean } = {}) {
    clearNavigationSelection();

    const selected = navigationItems[selectedNavigationIndex];

    if (!selected) {
      renderNavigationStatus(null);
      return;
    }

    markNavigationItemSelected(selected);
    renderNavigationStatus(selected);

    if (options.updateUrl && isThreadPage()) {
      updateSelectedPostUrl(selected);
    }

    if (options.scroll) {
      scrollNavigationElementIntoView(selected.element);
    }
  }

  function updateSelectedPostUrl(selected: NavigationItem) {
    const postId = getPostIdFromNavigationElement(selected.element);

    if (!postId) {
      return;
    }

    const threadId =
      getThreadId(new URL(location.href)) ||
      threadPages.map((page) => getThreadId(new URL(page.url))).find(Boolean) ||
      null;

    if (!threadId) {
      return;
    }

    const post = loadedThreadPosts.find((item) => item.id === postId);
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

  function renderNavigationStatus(selected: NavigationItem | null) {
    void selected;
    document.getElementById(NAVIGATION_STATUS_ID)?.remove();
  }

  function scrollNavigationElementIntoView(element: HTMLElement) {
    scrollNavigationElementIntoViewInDom(
      element,
      isThreadPage() ? "start" : "nearest",
    );
  }

  function moveNavigation(direction: number) {
    if (navigationItems.length === 0) {
      refreshNavigation({ reset: true });
    }

    if (navigationItems.length === 0) {
      return;
    }

    selectedNavigationIndex = Math.min(
      Math.max(selectedNavigationIndex + direction, 0),
      navigationItems.length - 1,
    );
    renderNavigationSelection({ scroll: true, updateUrl: true });
  }

  function selectNavigationIndex(index: number) {
    if (navigationItems.length === 0) {
      refreshNavigation({ reset: true });
    }

    if (navigationItems.length === 0) {
      return;
    }

    selectedNavigationIndex = Math.min(
      Math.max(index, 0),
      navigationItems.length - 1,
    );
    renderNavigationSelection({ scroll: true, updateUrl: true });
  }

  function selectNavigationElement(element: HTMLElement, options: { scroll?: boolean, updateUrl?: boolean } = {}) {
    const index = navigationItems.findIndex((item) => item.element === element);

    if (index < 0) {
      if (options.scroll !== false) {
        scrollNavigationElementIntoView(element);
      }
      return;
    }

    selectedNavigationIndex = index;
    renderNavigationSelection({
      scroll: options.scroll !== false,
      updateUrl: options.updateUrl !== false,
    });
  }

  function getSelectedPostWrapper(): HTMLElement | null {
    if (navigationItems.length === 0) {
      refreshNavigation({ reset: true });
    }

    const selected = navigationItems[selectedNavigationIndex]?.element;

    if (
      selected instanceof HTMLElement &&
      selected.matches(".fc-premium-post-wrapper")
    ) {
      return selected;
    }

    return getSelectedPostWrapperFromDom();
  }

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

  function renderShortcutHelpButton() {
    renderShortcutHelpButtonInDom({
      items: getShortcutHelpItems(),
      formatKey: formatShortcutHelpKey,
    });
  }

  function quoteNavigationItem() {
    const selected = getSelectedPostWrapper();

    if (selected) {
      return quoteSelectedPost(selected);
    }

    return false;
  }

  function getSelectedNavigationItem(): NavigationItem | null {
    if (navigationItems.length === 0) {
      refreshNavigation({ reset: true });
    }

    return navigationItems[selectedNavigationIndex] || null;
  }

  function handleSelectedPostActionShortcut(event: KeyboardEvent): boolean {
    if (!isThreadPage() || hasKeyboardModifier(event)) {
      return false;
    }

    if (keyboardShortcutMatches(event, KEY_NEW_THREAD_REPLY)) {
      event.preventDefault();
      openThreadReplyWithoutQuote();
      return true;
    }

    const selected = getSelectedPostWrapper();

    if (selected && keyboardShortcutMatches(event, KEY_QUOTE_SELECTED_POST)) {
      event.preventDefault();
      quoteSelectedPost(selected);
      return true;
    }

    if (
      selected &&
      keyboardShortcutMatches(event, KEY_MULTIQUOTE_SELECTED_POST)
    ) {
      event.preventDefault();
      toggleSelectedPostMultiquote(selected);
      return true;
    }

    return false;
  }

  function onNavigationKeyDown(event: KeyboardEvent): boolean {
    if (isEditableTarget(event.target)) {
      return false;
    }

    if (
      (event.key === KEY_NAV_NEXT_POST ||
        event.key === KEY_NAV_PREVIOUS_POST) &&
      (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
    ) {
      return false;
    }

    if (keyboardShortcutMatches(event, KEY_OPEN_SHORTCUT_HELP)) {
      event.preventDefault();
      setShortcutHelpPopoverOpen(true);
      return true;
    }

    if (event.key === KEY_CLEAR_ACTIVE_VIEW && isShortcutHelpPopoverOpen()) {
      event.preventDefault();
      closeShortcutHelpPopover();
      return true;
    }

    if (event.key === KEY_NAV_NEXT_POST) {
      event.preventDefault();
      moveNavigation(1);
      return true;
    }

    if (event.key === KEY_NAV_PREVIOUS_POST) {
      event.preventDefault();
      moveNavigation(-1);
      return true;
    }

    if (event.key === KEY_NAV_FIRST_POST) {
      event.preventDefault();
      selectNavigationIndex(0);
      return true;
    }

    if (event.key === KEY_NAV_LAST_POST) {
      event.preventDefault();
      if (navigationItems.length === 0) {
        refreshNavigation({ reset: true });
      }
      selectNavigationIndex(navigationItems.length - 1);
      return true;
    }

    if (handleSelectedPostActionShortcut(event)) {
      return true;
    }

    if (
      event.key === KEY_CLEAR_ACTIVE_VIEW &&
      (hasActiveThreadPostFilters() || activeGraphView)
    ) {
      event.preventDefault();
      clearThreadFilters();
      return true;
    } else if (
      event.key === KEY_QUOTE_SELECTED_POST &&
      !hasKeyboardModifier(event)
    ) {
      event.preventDefault();
      void quoteNavigationItem();
      return true;
    }

    return false;
  }

  function installKeyboardNavigation() {
    window.addEventListener("keydown", onNavigationKeyDown, true);
  }

  function getThreadPagesForTotal(totalPages: number): ThreadPage[] {
    const pages: ThreadPage[] = [];

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      pages.push({ pageNumber, url: getThreadPageUrl(pageNumber).href });
    }

    return pages;
  }

  function resolveCurrentThreadId(): string | null {
    return (
      getThreadId(new URL(location.href)) ||
      getThreadIdFromDocument(document) ||
      threadPages.map((page) => getThreadId(new URL(page.url))).find(Boolean) ||
      null
    );
  }

  function getThreadPageUrl(pageNumber: number, options: { includeState?: boolean, preserveHash?: boolean } = {}): URL {
    const currentUrl = new URL(location.href);
    const threadId = resolveCurrentThreadId() || "";
    const url = new URL(currentUrl.origin + currentUrl.pathname);

    if (threadId) {
      url.searchParams.set("t", threadId);
    }

    if (pageNumber > 1) {
      url.searchParams.set("page", String(pageNumber));
    }

    if (options.includeState) {
      writeCurrentThreadStateQueryParams(url);
    }

    if (options.preserveHash) {
      url.hash = location.hash;
    }

    return url;
  }

  function updateThreadPageUrl(pageNumber: number, options: { history?: "push" | "replace", preserveHash?: boolean } = {}) {
    const url = getThreadPageUrl(pageNumber, {
      includeState: true,
      preserveHash: options.preserveHash,
    });
    updateBrowserHistory(url, options.history || "replace");
  }

  function getThreadPages(): ThreadPage[] {
    const maxPage = getMaxThreadPage(document);
    return getThreadPagesForTotal(maxPage);
  }

  function ensureThreadSummary(): HTMLElement | null {
    return ensureThreadSummaryInDom(getPostsElement());
  }

  function setSummary(summary: HTMLElement | null, message: string) {
    setThreadSummaryMessage(summary, message);
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

  function enhanceThreadHeader() {
    const titleTable = getThreadTitleTable();

    if (
      !(titleTable instanceof HTMLTableElement) ||
      titleTable.dataset.fcPremiumThreadHeaderEnhanced === "true"
    ) {
      return;
    }

    const breadcrumbs = getThreadBreadcrumbContentTable();
    const searchLink = getNavbarSearchLink();

    if (!breadcrumbs && !searchLink) {
      return;
    }

    titleTable.dataset.fcPremiumThreadHeaderEnhanced = "true";

    const searchParentCell = searchLink?.closest("td.vbmenu_control");
    const breadcrumbOuterTable = getThreadBreadcrumbOuterTable();
    const body = titleTable.tBodies[0] || titleTable.createTBody();
    body.textContent = "";

    const row = body.insertRow();
    const cell = row.insertCell();
    cell.className = "thead fc-premium-thread-header-cell";
    cell.colSpan = 3;

    const layout = document.createElement("div");
    layout.className = "fc-premium-thread-header-layout";

    const breadcrumbSlot = document.createElement("div");
    breadcrumbSlot.className = "fc-premium-thread-header-breadcrumbs";

    if (breadcrumbs) {
      breadcrumbSlot.append(breadcrumbs);
    }

    layout.append(breadcrumbSlot);
    cell.append(layout);
    hideForumHeaderSearchForm();

    if (searchParentCell instanceof HTMLElement) {
      searchParentCell.setAttribute(FORUM_LAYOUT_HIDDEN_ATTRIBUTE, "true");
    }

    if (breadcrumbOuterTable instanceof HTMLElement) {
      breadcrumbOuterTable.setAttribute(FORUM_LAYOUT_HIDDEN_ATTRIBUTE, "true");
    }
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

  function hasActiveThreadPostFilters(): boolean {
    return Boolean(activeThreadSearchQuery) || activeAuthorFilters.size > 0;
  }

  function getAuthenticatedUsername(): string {
    const profileLink = Array.from(
      document.querySelectorAll("a[href*='member.php?u=']"),
    ).find(
      (link) =>
        link instanceof HTMLAnchorElement &&
        normalizeText(link.textContent) === "Tu Perfil",
    );
    const profileUserId =
      profileLink instanceof HTMLAnchorElement
        ? toUrl(profileLink.href)?.searchParams.get("u") || ""
        : "";

    if (profileUserId) {
      const usernameLink = Array.from(
        document.querySelectorAll("a[href*='member.php?u=']"),
      ).find((link) => {
        if (!(link instanceof HTMLAnchorElement)) {
          return false;
        }

        const text = normalizeText(link.textContent);
        return (
          text &&
          text !== "Tu Perfil" &&
          toUrl(link.href)?.searchParams.get("u") === profileUserId
        );
      });

      if (usernameLink instanceof HTMLAnchorElement) {
        return normalizeText(usernameLink.textContent);
      }
    }

    return normalizeText(
      document.querySelector("#navbar_username")?.textContent,
    );
  }

  function getThreadAuthorOptions(
    posts: PostRecord[] = loadedThreadPosts,
  ): ThreadAuthorOption[] {
    return buildThreadAuthorOptions(posts, getAuthenticatedUsername());
  }

  function resolveThreadAuthorInputValue(value: string): string | null {
    return resolveThreadAuthorInputValueFromOptions(
      value,
      getThreadAuthorOptions(),
    );
  }

  function getThreadPostSearchText(post: PostRecord): string {
    const cached = threadPostSearchTextById.get(post.id);

    if (cached !== undefined) {
      return cached;
    }

    const doc = parseHtml(post.html);
    const message =
      doc.getElementById(`post_message_${post.id}`) || doc.body || null;
    const text = normalizeLayoutText(message?.textContent || "");
    threadPostSearchTextById.set(post.id, text);
    return text;
  }

  function ensureThreadSearchPanel(): HTMLTableElement | null {
    const existing = document.getElementById(THREAD_SEARCH_PANEL_ID);

    if (existing instanceof HTMLTableElement) {
      return existing;
    }

    const posts = getPostsElement();

    if (!posts) {
      return null;
    }

    const panel = ThreadSearchPanel({
      searchQuery: activeThreadSearchQuery,
      onSearchInput: setThreadSearchQuery,
      onAddAuthor: addThreadAuthorFilterFromInput,
      onClearFilters: clearThreadPostFilters,
    });

    posts.before(panel);
    return panel;
  }

  function refreshThreadAuthorDatalist() {
    refreshThreadAuthorDatalistInDom(
      getThreadAuthorOptions(),
      activeAuthorFilters,
    );
  }

  function refreshSelectedThreadAuthors() {
    refreshSelectedThreadAuthorsInDom(
      activeAuthorFilters,
      getThreadAuthorOptions(),
      removeThreadAuthorFilter,
    );
  }

  function renderThreadSearchStatus(counts?: ThreadSearchCounts) {
    renderThreadSearchStatusInDom({
      counts,
      totalPosts: loadedThreadPosts.length,
      threadLoadState,
      hasActiveFilters: hasActiveThreadPostFilters(),
    });
  }

  function renderThreadSearchEmptyState(counts?: ThreadSearchCounts) {
    renderThreadSearchEmptyStateInDom({
      posts: getPostsElement(),
      counts,
      isLoading: threadLoadState.isLoading,
      hasActiveFilters: hasActiveThreadPostFilters(),
    });
  }

  function refreshThreadSearchPanel(counts?: ThreadSearchCounts) {
    if (!isThreadPage()) {
      return;
    }

    const panel = ensureThreadSearchPanel();

    if (!panel) {
      return;
    }

    syncThreadSearchTextInput(activeThreadSearchQuery);
    refreshThreadAuthorDatalist();
    refreshSelectedThreadAuthors();
    renderThreadSearchStatus(counts);
    renderThreadSearchEmptyState(counts);
  }

  function renderThreadSearchPanel(counts?: ThreadSearchCounts): void {
    refreshThreadSearchPanel(counts);
  }

  function setThreadSearchQuery(query: string) {
    const hadFilters = hasActiveThreadPostFilters();
    const nextQuery = normalizeText(query);

    if (activeThreadSearchQuery === nextQuery) {
      return;
    }

    activeThreadSearchQuery = nextQuery;
    updateThreadPostFilters({
      render: hadFilters !== hasActiveThreadPostFilters(),
    });
  }

  function addThreadAuthorFilter(authorKey: string) {
    if (!authorKey || activeAuthorFilters.has(authorKey)) {
      return;
    }

    const hadFilters = hasActiveThreadPostFilters();
    activeAuthorFilters.add(authorKey);
    updateThreadPostFilters({
      render: hadFilters !== hasActiveThreadPostFilters(),
    });
  }

  function addThreadAuthorFilterFromInput() {
    const input = document.getElementById(THREAD_SEARCH_AUTHOR_INPUT_ID);

    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const authorKey = resolveThreadAuthorInputValue(input.value);

    if (!authorKey) {
      return;
    }

    input.value = "";
    addThreadAuthorFilter(authorKey);
  }

  function removeThreadAuthorFilter(authorKey: string) {
    if (!activeAuthorFilters.delete(authorKey)) {
      return;
    }

    updateThreadPostFilters({
      render: !hasActiveThreadPostFilters(),
    });
  }

  function clearThreadPostFilters() {
    if (!hasActiveThreadPostFilters()) {
      return;
    }

    activeThreadSearchQuery = "";
    activeAuthorFilters.clear();
    updateThreadPostFilters({ render: true });
  }

  function updateThreadPostFilters(options: { render?: boolean } = {}) {
    const hadGraphView = Boolean(activeGraphView || pendingGraphView);

    if (hasActiveThreadPostFilters()) {
      activeGraphView = null;
      pendingGraphView = null;
      activePageFilter = null;
    } else if (!activePageFilter) {
      activePageFilter = getPageNumber(new URL(location.href));
    }

    syncThreadStateUrl();

    if (hadGraphView || options.render) {
      renderThreadPosts(loadedThreadPosts);
      renderThreadSummaryMenu(document.getElementById(THREAD_SUMMARY_ID));
      return;
    }

    const counts = applyThreadPostFilters();
    applyPageFilter();
    updateOriginalThreadPageMenus();
    refreshThreadSearchPanel(counts);
    refreshNavigation({ reset: true });
  }

  function setPageFilter(pageNumber: number) {
    if (!isThreadPage()) {
      return;
    }

    activePageFilter = pageNumber;
    activeGraphView = null;
    pendingGraphView = null;
    updateThreadPageUrl(pageNumber, { history: "push" });
    updateOriginalThreadPageMenus();
    renderThreadPosts(loadedThreadPosts);
    renderThreadSummaryMenu(document.getElementById(THREAD_SUMMARY_ID));
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function togglePageFilter(pageNumber: number) {
    if (!isThreadPage()) {
      return;
    }

    if (activePageFilter === pageNumber) {
      clearPageFilter();
      return;
    }

    setPageFilter(pageNumber);
  }

  function clearPageFilter() {
    setPageFilter(getPageNumber(new URL(location.href)));
  }

  function applyPageFilter(): { total: number, visible: number } {
    return applyPageFilterToRenderedPosts(getPostsElement(), activePageFilter);
  }

  function updateOriginalThreadPageMenus() {
    if (!isThreadPage() || threadPages.length <= 1 || activeGraphView) {
      return;
    }

    const totalPages = threadPages.length;
    const currentPage =
      activePageFilter || getPageNumber(new URL(location.href));
    updateOriginalThreadPageMenusInDom({
      totalPages,
      currentPage,
      visiblePages: getVisiblePageNumbers(totalPages, currentPage),
      hrefForPage: (pageNumber) => getThreadPageUrl(pageNumber).href,
    });
  }

  function handleThreadPageNavigationClick(event: MouseEvent) {
    const link =
      event.target instanceof Element
        ? event.target.closest("a[href*='showthread.php']")
        : null;

    if (!(link instanceof HTMLAnchorElement)) {
      return;
    }

    const pageNumber = getOriginalThreadPageLinkNumber(
      link,
      getThreadId(new URL(location.href)),
    );

    if (!pageNumber) {
      return;
    }

    event.preventDefault();
    void setPageFilter(pageNumber);
  }

  function installThreadPageNavigation() {
    document.addEventListener("click", handleThreadPageNavigationClick, true);
  }

  function clearThreadFilters() {
    if (!hasActiveThreadPostFilters() && !activeGraphView) {
      return;
    }

    activeThreadSearchQuery = "";
    activeAuthorFilters.clear();
    activeGraphView = null;
    pendingGraphView = null;
    activePageFilter = getPageNumber(new URL(location.href));
    updateThreadPageUrl(activePageFilter);
    updateOriginalThreadPageMenus();
    renderThreadPosts(loadedThreadPosts);
    renderThreadSummaryMenu(document.getElementById(THREAD_SUMMARY_ID));
  }

  function toggleAuthorFilter(author: string) {
    if (!isThreadPage()) {
      return;
    }

    const authorKey = normalizeAuthorName(author);

    if (!authorKey) {
      return;
    }

    const hadFilters = hasActiveThreadPostFilters();

    if (activeAuthorFilters.has(authorKey)) {
      activeAuthorFilters.delete(authorKey);
    } else {
      activeAuthorFilters.add(authorKey);
    }

    updateThreadPostFilters({
      render: hadFilters !== hasActiveThreadPostFilters(),
    });
  }

  function clearAuthorFilter() {
    if (activeAuthorFilters.size === 0) {
      return;
    }

    activeAuthorFilters.clear();
    updateThreadPostFilters({ render: true });
  }

  function applyThreadPostFilters(): { total: number, visible: number } {
    const query = normalizeLayoutText(activeThreadSearchQuery);
    const postById = new Map(loadedThreadPosts.map((post) => [post.id, post]));

    return applyThreadPostFiltersToRenderedPosts({
      posts: getPostsElement(),
      query,
      activeAuthorFilters,
      postById,
      getPostSearchText: getThreadPostSearchText,
    });
  }

  function enhanceAuthorFilterButton(wrapper: HTMLElement, author: string) {
    enhanceAuthorFilterButtonInDom(wrapper, author, toggleAuthorFilter);
  }

  function setActiveGraphView(type: GraphViewType, rootPostId: string, relatedPostId: string | null = null, options: { history?: "push" | "replace", scrollToFirstPost?: boolean, scrollToFirstReply?: boolean } = {}) {
    if (!threadGraph.postById.has(rootPostId)) {
      return;
    }

    activeGraphView = {
      type,
      rootPostId,
      relatedPostId,
    };
    pendingGraphView = null;
    activePageFilter = null;
    syncThreadStateUrl({ history: options.history || "push" });
    renderThreadPosts(loadedThreadPosts);
    renderThreadSummaryMenu(document.getElementById(THREAD_SUMMARY_ID));

    if (options.scrollToFirstPost || options.scrollToFirstReply) {
      const viewPosts = getPostsForGraphView(
        activeGraphView,
        threadGraph,
        loadedThreadPosts,
      );
      const targetPost = options.scrollToFirstPost
        ? viewPosts[0] || null
        : viewPosts.find((post) => post.id !== rootPostId) || null;

      if (targetPost) {
        if (
          options.scrollToFirstReply &&
          activeGraphView.type === "quoted-by"
        ) {
          selectPostById(targetPost.id, { scroll: false, updateUrl: true });
          selectPostById(rootPostId, { scroll: true, updateUrl: false });
          selectPostById(targetPost.id, { scroll: false, updateUrl: false });
          return;
        }

        selectPostById(targetPost.id, { scroll: true, updateUrl: true });
      }
    }
  }

  function activatePendingGraphView() {
    if (
      !pendingGraphView ||
      activeGraphView ||
      !threadGraph.postById.has(pendingGraphView.rootPostId)
    ) {
      return;
    }

    activeGraphView = pendingGraphView;
    pendingGraphView = null;
    activePageFilter = null;
  }

  function clearActiveGraphView() {
    if (!activeGraphView) {
      return;
    }

    activeGraphView = null;
    pendingGraphView = null;
    activePageFilter = getPageNumber(new URL(location.href));
    updateThreadPageUrl(activePageFilter);
    updateOriginalThreadPageMenus();
    renderThreadPosts(loadedThreadPosts);
    renderThreadSummaryMenu(document.getElementById(THREAD_SUMMARY_ID));
  }

  function getValidGraphViewFromQueryState(queryState: ThreadQueryState): ActiveGraphView | null {
    return getValidGraphView(queryState.graphView, threadGraph);
  }

  function applyThreadUrlState(url = new URL(location.href)): void {
    if (!isThreadPage() || loadedThreadPosts.length === 0) {
      return;
    }

    const queryState = readThreadQueryState(url);
    activeGraphView = getValidGraphViewFromQueryState(queryState);
    pendingGraphView = null;
    activePageFilter = activeGraphView
      ? null
      : queryState.authorFilters.length > 0 || queryState.searchQuery
        ? null
        : queryState.pageFilter || getPageNumber(url);
    activeAuthorFilters = new Set(queryState.authorFilters);
    activeThreadSearchQuery = queryState.searchQuery;

    updateOriginalThreadPageMenus();
    renderThreadPosts(loadedThreadPosts);
    renderThreadSummaryMenu(document.getElementById(THREAD_SUMMARY_ID));

    const hashPostId = getLocationPostHashId(url);

    if (hashPostId) {
      selectPostById(hashPostId, { scroll: true, updateUrl: false });
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }

  function onThreadHistoryPopState(): void {
    applyThreadUrlState();
  }

  function installThreadHistoryNavigation(): void {
    window.addEventListener("popstate", onThreadHistoryPopState);
  }

  function getThreadViewPosts(posts: PostRecord[]): PostRecord[] {
    return getPostsForThreadView({
      posts,
      activeGraphView,
      graph: threadGraph,
      shouldPromoteCitedPosts:
        !activePageFilter && !hasActiveThreadPostFilters(),
    });
  }

  function getReplyIndentDepth(post: PostRecord, index: number): number {
    return getReplyIndentDepthForView({
      post,
      index,
      activeGraphView,
    });
  }

  function selectPostById(postId: string, options: { scroll?: boolean, updateUrl?: boolean } = {}) {
    const table = document.getElementById(`post${postId}`);
    const wrapper = table?.closest(".fc-premium-post-wrapper");

    if (!(wrapper instanceof HTMLElement)) {
      return;
    }

    selectNavigationElement(wrapper, options);
  }

  function enhanceQuoteLinks(wrapper: HTMLElement) {
    enhanceQuoteLinksInDom({
      wrapper,
      sourcePostId: getPostIdFromNavigationElement(wrapper),
      getQuotedPostId,
      onOpenQuotedPost: jumpToLoadedPost,
      onReadConversation: (sourcePostId, quotedPostId) => {
        setActiveGraphView("conversation", sourcePostId, quotedPostId, {
          scrollToFirstPost: true,
        });
      },
    });
  }

  function updateRenderedCompactPostLayouts() {
    updateRenderedCompactPostLayoutsInDom(compactModeEnabled);
  }

  function renderPost(post: PostRecord, rank: number, postById: Map<string, PostRecord>, replyIndentDepth: number): HTMLElement {
    const template = document.createElement("template");
    template.innerHTML = post.html;

    const wrapper = template.content.firstElementChild;

    if (!(wrapper instanceof HTMLElement)) {
      return document.createElement("div");
    }

    wrapper.classList.add("fc-premium-post-wrapper");
    wrapper.dataset.fcPremiumOriginalPage = String(post.pageNumber);

    if (replyIndentDepth > 0) {
      wrapper.dataset.fcPremiumReplyIndent = String(replyIndentDepth);
    }

    enhanceQuoteLinks(wrapper);
    enhanceAuthorFilterButton(wrapper, post.author);
    const header = enhanceNativePostHeader(wrapper, post);
    removeTrailingPostLayoutArtifacts(wrapper);
    relocatePostFooterControls(wrapper);

    if (post.isOriginalPoster) {
      wrapper.dataset.fcPremiumOriginalPoster = "true";
    }

    appendReplyBadge({
      container: header.dateCell || header.numberCell,
      post,
      rank,
      postById,
      onJumpToPost: jumpToLoadedPost,
      onShowQuotedBy: (postId) => {
        setActiveGraphView("quoted-by", postId, null, {
          scrollToFirstReply: true,
        });
      },
    });

    updatePostCompactLayout(wrapper, compactModeEnabled);
    return wrapper;
  }

  function renderThreadPosts(posts: PostRecord[]) {
    const postsElement = getPostsElement();

    if (!postsElement) {
      return;
    }

    const selectedPostId =
      pendingInitialHashPostId ||
      getPostIdFromNavigationElement(
        navigationItems[selectedNavigationIndex]?.element,
      );
    postsElement.textContent = "";
    postsElement.dataset.fcPremiumGraphView = activeGraphView?.type || "";

    const fragment = document.createDocumentFragment();
    const postById = new Map(posts.map((post) => [post.id, post]));
    const rankByPostId = getReplyRankByPostId(posts);
    const viewPosts = getThreadViewPosts(posts);

    for (const [index, post] of viewPosts.entries()) {
      fragment.append(
        renderPost(
          post,
          rankByPostId.get(post.id) || 0,
          postById,
          getReplyIndentDepth(post, index),
        ),
      );
    }

    postsElement.append(fragment);
    const filterCounts = applyThreadPostFilters();
    applyPageFilter();
    updateOriginalThreadPageMenus();
    renderThreadSearchPanel(filterCounts);
    refreshNavigation({ reset: true });

    if (selectedPostId) {
      const selectedTable = document.getElementById(`post${selectedPostId}`);
      const selectedWrapper = selectedTable?.closest(
        ".fc-premium-post-wrapper",
      );

      if (
        selectedWrapper instanceof HTMLElement &&
        isVisible(selectedWrapper)
      ) {
        selectPostById(selectedPostId, {
          scroll: selectedPostId === pendingInitialHashPostId,
          updateUrl: false,
        });

        if (selectedPostId === pendingInitialHashPostId) {
          pendingInitialHashPostId = null;
        }
      }
    }
  }

  function hydrateThreadPosts(posts: PostRecord[]) {
    applyReplyCounts(posts);
    applyOriginalPosterFlags(posts);
    loadedThreadPosts = posts.slice();
    threadGraph = buildThreadGraph(loadedThreadPosts);
    threadPostSearchTextById.clear();
    activatePendingGraphView();
  }

  async function enhanceThreadPage(): Promise<void> {
    ensureStyle();
    hideUnusedTopNavigationBars();
    hideNativeThreadSearchMenu();
    enhanceThreadHeader();
    hideNativeThreadSearchMenu();
    hideUnusedTopNavigationBars();

    const summary = ensureThreadSummary();
    const queryState = readThreadQueryState();
    const allPages = getThreadPages();
    const currentPageNumber = getPageNumber(new URL(location.href));
    const pages = [
      ...allPages.filter((page) => page.pageNumber === currentPageNumber),
      ...allPages.filter((page) => page.pageNumber !== currentPageNumber),
    ];
    const allPosts: PostRecord[] = [];
    let pageOffset = 0;

    threadPages = allPages;
    loadedThreadPosts = [];
    loadedThreadPageNumbers = new Set();
    threadGraph = createEmptyThreadGraph();
    activeGraphView = null;
    pendingGraphView = queryState.graphView;
    activePageFilter = queryState.graphView
      ? null
      : queryState.authorFilters.length > 0 || queryState.searchQuery
        ? null
        : queryState.pageFilter || currentPageNumber;
    activeAuthorFilters = new Set(queryState.authorFilters);
    activeThreadSearchQuery = queryState.searchQuery;

    if (activePageFilter) {
      updateThreadPageUrl(activePageFilter, {
        preserveHash: Boolean(pendingInitialHashPostId),
      });
    } else {
      syncThreadStateUrl();
    }

    if (!pendingInitialHashPostId) {
      window.scrollTo({ top: 0, behavior: "auto" });
    }

    threadLoadState = {
      loadedPages: 0,
      targetPages: pages.length,
      totalPages: allPages.length,
      loadedPosts: 0,
      isLoading: pages.length > 0,
    };

    if (summary) {
      summary.textContent = "";
    }

    renderThreadSummaryMenu(summary);
    renderThreadSearchPanel();

    const cachedThread = await readCurrentThreadCache();

    if (cachedThread && isCompleteThreadCache(cachedThread)) {
      const cachedPages = getThreadPagesForTotal(cachedThread.totalPages);
      threadPages = cachedPages;
      loadedThreadPageNumbers = new Set(cachedThread.cachedPageNumbers);
      hydrateThreadPosts(cachedThread.posts);
      threadLoadState = {
        loadedPages: loadedThreadPageNumbers.size,
        targetPages: cachedThread.totalPages,
        totalPages: cachedThread.totalPages,
        loadedPosts: loadedThreadPosts.length,
        isLoading: false,
      };
      renderThreadPosts(loadedThreadPosts);
      renderThreadSummaryMenu(summary);
      return;
    }

    const currentPageDocument = parseHtml(document.documentElement.outerHTML);

    for (const page of pages) {
      const doc =
        page.pageNumber === currentPageNumber
          ? currentPageDocument
          : await fetchThreadDocument(page.url);
      const pagePosts = collectPosts(doc, page.pageNumber, pageOffset);
      allPosts.push(...pagePosts);
      pageOffset += pagePosts.length;
      loadedThreadPageNumbers.add(page.pageNumber);

      hydrateThreadPosts(allPosts);
      threadLoadState = {
        ...threadLoadState,
        loadedPages: loadedThreadPageNumbers.size,
        loadedPosts: loadedThreadPosts.length,
        isLoading: true,
      };

      renderThreadPosts(loadedThreadPosts);
      renderThreadSummaryMenu(summary);

      const lastPage = pages[pages.length - 1];

      if (lastPage && page.pageNumber !== lastPage.pageNumber) {
        await sleep(PAGE_LOAD_DELAY_MS);
      }
    }

    threadLoadState = {
      ...threadLoadState,
      loadedPages: loadedThreadPageNumbers.size,
      loadedPosts: loadedThreadPosts.length,
      isLoading: false,
    };
    renderThreadPosts(loadedThreadPosts);
    renderThreadSummaryMenu(summary);

    if (loadedThreadPageNumbers.size >= pages.length) {
      await writeCurrentThreadCache(
        loadedThreadPosts,
        allPages.length,
        loadedThreadPageNumbers,
      );
    }
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
    handleNavigationKeyDown: onNavigationKeyDown,
    refreshNavigation,
    updateSummaryMenu: () => {
      renderThreadSummaryMenu(document.getElementById(THREAD_SUMMARY_ID));
    },
  };
}

  
