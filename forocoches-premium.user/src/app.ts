import { ThreadSearchPanel } from "./ui/components/ThreadSearchPanel";
import {
  refreshSelectedThreadAuthors as refreshSelectedThreadAuthorsInDom,
  refreshThreadAuthorDatalist as refreshThreadAuthorDatalistInDom,
  renderThreadSearchEmptyState as renderThreadSearchEmptyStateInDom,
  renderThreadSearchStatus as renderThreadSearchStatusInDom,
  syncThreadSearchTextInput,
  type ThreadSearchCounts,
} from "./ui/threadSearchPanelDom";
import {
  applyPageFilterToRenderedPosts,
  applyThreadPostFiltersToRenderedPosts,
  enhanceAuthorFilterButton as enhanceAuthorFilterButtonInDom,
} from "./ui/threadPostFiltersDom";
import {
  clearNavigationSelection,
  getPostIdFromNavigationElement,
  getPostNavigationItems,
  getSelectedPostWrapper as getSelectedPostWrapperFromDom,
  getThreadTitleNavigationItems,
  markNavigationItemSelected,
  scrollNavigationElementIntoView as scrollNavigationElementIntoViewInDom,
} from "./ui/navigationDom";
import {
  closeShortcutHelpPopover,
  isShortcutHelpPopoverOpen,
  renderShortcutHelpButton as renderShortcutHelpButtonInDom,
  setShortcutHelpPopoverOpen,
} from "./ui/shortcutHelpDom";
import {
  relocatePostFooterControls,
  removeTrailingPostLayoutArtifacts,
} from "./ui/postNativeDom";
import { enhanceNativePostHeader } from "./ui/postHeaderDom";
import {
  updatePostCompactLayout,
  updateRenderedCompactPostLayouts as updateRenderedCompactPostLayoutsInDom,
} from "./ui/postCompactLayoutDom";
import { enhanceQuoteLinks as enhanceQuoteLinksInDom } from "./ui/postQuoteDom";
import { appendReplyBadge } from "./ui/postReplyBadgeDom";
import {
  ForumLoadingStatus,
  ForumSidebarToggleButton,
} from "./ui/components/ForumControls";
import {
  closeHiddenThreadsModal as closeHiddenThreadsModalInDom,
  ensureHiddenThreadsModal as ensureHiddenThreadsModalInDom,
  isHiddenThreadsModalOpen as isHiddenThreadsModalOpenInDom,
  openHiddenThreadsModal as openHiddenThreadsModalInDom,
  renderHiddenThreadsModalBody as renderHiddenThreadsModalBodyInDom,
  renderHiddenThreadsToolbarButton as renderHiddenThreadsToolbarButtonInDom,
} from "./ui/hiddenThreadsModalDom";
import { ForumPager } from "./ui/components/ForumPager";
import {
  TagChip,
  TopTagBar,
  type TopTagSummary,
} from "./ui/components/Tags";
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
  KEY_OPEN_SELECTED_THREAD_IN_NEW_TAB_MODIFIER,
  KEY_HIDE_SELECTED_THREAD,
  KEY_NEW_THREAD_REPLY,
  KEY_MULTIQUOTE_SELECTED_POST,
  TOP_TAGS_ID,
  FORUM_SIDEBAR_TOGGLE_BAR_ID,
  FORUM_SIDEBAR_TOGGLE_ID,
  FORUM_CONTROLS_ROW_ID,
  FORUM_SEARCH_SLOT_ID,
  FORUM_LOADING_STATUS_ID,
  THREAD_PROGRESS_ID,
  NAVIGATION_STATUS_ID,
  THREAD_SUMMARY_ID,
  THREAD_CONTROLS_ID,
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
} from "./config/constants";
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
} from "./shared/dom";
import { findTagsInText, splitTextByTags } from "./domain/tags";
import type {
  ActiveGraphView,
  ForumQueryState,
  ForumThreadLoadState,
  ForumThreadRecord,
  GraphViewType,
  NavigationItem,
  PostRecord,
  ShortcutHelpItem,
  ThreadAuthorOption,
  ThreadGraph,
  ThreadLoadState,
  ThreadPage,
  ThreadQueryState,
} from "./domain/types";
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
} from "./domain/threadPosts";
import {
  filterForumThreadRecords,
  getHiddenForumThreadRecords,
  getVisibleForumThreadRecords,
  sortForumThreadRecords,
} from "./domain/forumThreads";
import {
  getThreadAuthorOptions as buildThreadAuthorOptions,
  resolveThreadAuthorInputValue as resolveThreadAuthorInputValueFromOptions,
} from "./domain/threadAuthors";
import { getVisiblePageNumbers } from "./domain/pagination";
import {
  clampForumThreadListPage,
  getForumThreadListPage,
  getForumThreadListTotalPages,
  getForumThreadRowsSignature,
} from "./domain/forumThreadList";
import {
  collectPosts,
  fetchThreadDocument,
  getMaxThreadPage,
  getQuotedPostId,
  getThreadIdFromDocument,
  parseHtml,
} from "./adapters/forocoches/threadParser";
import {
  collectForumThreadRecords,
  getTitleTags,
} from "./adapters/forocoches/forumThreadParser";
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
} from "./adapters/forocoches/forumLayout";
import {
  getNavbarSearchLink,
  getThreadBreadcrumbContentTable,
  getThreadBreadcrumbOuterTable,
  getThreadTitleTable,
  hideForumHeaderSearchForm,
  hideNativeThreadSearchMenu,
  moveForumHeaderSearchForm,
} from "./adapters/forocoches/threadHeader";
import {
  applyHiddenForumThreadRows as applyHiddenForumThreadRowsInDom,
  renderForumThreadRowsFromHtml,
  renderVisibleForumThreadTitleTags as renderVisibleForumThreadTitleTagsInDom,
  restoreForumThreadRowsFromHtml,
} from "./adapters/forocoches/forumThreadListDom";
import {
  clickPostQuoteAction,
  openThreadReplyWithoutQuote as openThreadReplyWithoutQuoteAction,
  togglePostMultiquote,
} from "./adapters/forocoches/postReplyActions";
import {
  getOriginalThreadPageLinkNumber,
  updateOriginalThreadPageMenus as updateOriginalThreadPageMenusInDom,
} from "./adapters/forocoches/threadPageNavigation";
import {
  clearForumStateQueryParams,
  clearThreadStateQueryParams,
  isThreadUrl,
  readForumQueryState,
  readThreadQueryState,
} from "./services/queryState";
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
} from "./services/threadCache";
import {
  hasKeyboardModifier,
  isEditableTarget,
  isMacKeyboardPlatform,
  isOpenInNewTabKeyboardShortcut,
  keyboardShortcutMatches,
} from "./services/keyboard";

declare const __FC_PREMIUM_CSS__: string;

declare global {
  interface Window {
    mq_click?: (postId: string) => void;
  }
}

type ScriptWindow = Window &
  typeof globalThis & {
    [INSTANCE_KEY]?: string;
  };

export function runForocochesPremium() {
  let navigationItems: NavigationItem[] = [];
  let selectedNavigationIndex = -1;
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
  const initialThreadQueryState = readThreadQueryState();
  let activeGraphView: ActiveGraphView | null = null;
  let pendingGraphView: ActiveGraphView | null = initialThreadQueryState.graphView;
  const compactModeEnabled = true;
  let forumSidebarHidden = getSavedForumSidebarHidden();
  const initialForumQueryState = readForumQueryState();
  let activeTagFilter: string | null = initialForumQueryState.tag;
  let activeForumTagPage = initialForumQueryState.page;
  let activeForumSearchQuery = "";
  let forumLiveSearchTimer = 0;
  let activePageFilter: number | null = initialThreadQueryState.pageFilter;
  let activeAuthorFilters: Set<string> = new Set(initialThreadQueryState.authorFilters);
  let activeThreadSearchQuery = initialThreadQueryState.searchQuery;
  let pendingInitialHashPostId: string | null = getLocationPostHashId();
  let threadPostSearchTextById: Map<string, string> = new Map();
  let cachedForumThreads: ForumThreadRecord[] = [];
  let nativeForumThreadRowHtml: string[] = [];
  let nativeForumThreadHeaderRowHtml: string[] = [];
  let renderedForumThreadListSignature: string | null = null;
  let forumThreadsPerPage = FORUM_THREAD_FALLBACK_PAGE_SIZE;
  let forumThreadScrapeStarted = false;
  let forumThreadLoadState: ForumThreadLoadState = {
    loadedPages: 0,
    targetPages: FORUM_THREAD_CACHE_RECENT_PAGES,
    isLoading: false,
  };

  function writeCurrentThreadStateQueryParams(url: URL): void {
    clearThreadStateQueryParams(url);

    const graphView = activeGraphView || pendingGraphView;

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

    if (activeThreadSearchQuery) {
      url.searchParams.set(
        THREAD_STATE_QUERY_PARAMS.searchQuery,
        activeThreadSearchQuery,
      );
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
    if (!isThreadPage()) {
      return;
    }

    const url = new URL(location.href);
    writeCurrentThreadStateQueryParams(url);
    updateBrowserHistory(url, options.history || "replace");
  }

  async function waitForDocumentReady(): Promise<void> {
    if (document.readyState !== "loading") {
      return;
    }

    await new Promise((resolve) => {
      window.addEventListener("DOMContentLoaded", resolve, { once: true });
    });
  }

  function applyCompactMode() {
    document.body.classList.add(COMPACT_MODE_CLASS);
    updateRenderedCompactPostLayouts();
  }

  function getSavedForumSidebarHidden(): boolean {
    const saved = localStorage.getItem(FORUM_SIDEBAR_STORAGE_KEY);

    return saved === null ? true : saved === "true";
  }

  function setSavedForumSidebarHidden(hidden: boolean) {
    forumSidebarHidden = hidden;
    localStorage.setItem(FORUM_SIDEBAR_STORAGE_KEY, String(hidden));
    applyForumSidebarVisibility();
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

  function createTagChip(tag: string): HTMLElement {
    return TagChip({
      tag,
      onToggle: toggleTagFilter,
    });
  }

  function renderTaggedTitle(title: HTMLAnchorElement) {
    if (title.dataset.fcPremiumTagsRendered === "true") {
      return;
    }

    const originalTitle = normalizeText(title.textContent);

    if (findTagsInText(originalTitle).length === 0) {
      return;
    }

    title.dataset.fcPremiumTagsRendered = "true";
    title.title = originalTitle;
    title.textContent = "";

    for (const part of splitTextByTags(originalTitle)) {
      if (part.type === "text") {
        title.append(document.createTextNode(part.text));
      } else if (part.tag) {
        title.append(createTagChip(part.tag));
      }
    }
  }

  function enhanceThreadTitleTags() {
    ensureStyle();

    for (const title of document.querySelectorAll(THREAD_TITLE_SELECTOR)) {
      if (title instanceof HTMLAnchorElement) {
        renderTaggedTitle(title);
      }
    }

    if (isForumDisplayPage()) {
      renderTopTagBar();
    }
  }

  function getMainContentAnchor(): HTMLElement | null {
    return getForumThreadsTable() || getPostsElement() || getThreadTitleTable();
  }

  function isBeforeMainContent(element: HTMLElement): boolean {
    const anchor = getMainContentAnchor();

    if (anchor && element.contains(anchor)) {
      return false;
    }

    return (
      !anchor ||
      Boolean(
        element.compareDocumentPosition(anchor) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      )
    );
  }

  function hideUnusedTopNavigationBars() {
    if (!isForumDisplayPage() && !isThreadPage()) {
      return;
    }

    for (const table of document.querySelectorAll("table")) {
      if (!(table instanceof HTMLTableElement)) {
        continue;
      }

      if (shouldIgnoreTopNavigationTable(table)) {
        continue;
      }

      if (
        isBeforeMainContent(table) &&
        isForumTopShortcutBar(table)
      ) {
        hideElementAndAdjacentSpacers(table);
      }
    }
  }

  function getOrCreateForumSidebarToggleButton(): HTMLButtonElement {
    const existing = document.getElementById(FORUM_SIDEBAR_TOGGLE_ID);
    const button = ForumSidebarToggleButton({
      hidden: forumSidebarHidden,
      onToggle: () => {
        setSavedForumSidebarHidden(!forumSidebarHidden);
      },
    });

    if (existing instanceof HTMLButtonElement) {
      existing.replaceWith(button);
    }

    return button;
  }

  function getForumToolbarRow(): HTMLTableRowElement | null {
    const toolsCell = document.getElementById("forumtools");
    const row = toolsCell?.parentElement;

    return row instanceof HTMLTableRowElement ? row : null;
  }

  function renderHiddenThreadsToolbarButton() {
    if (!isForumDisplayPage()) {
      return;
    }

    renderHiddenThreadsToolbarButtonInDom({
      toolbarRow: getForumToolbarRow(),
      toolsCell: document.getElementById("forumtools"),
      onOpen: openHiddenThreadsModal,
    });
  }

  function ensureHiddenThreadsModal(): HTMLElement {
    return ensureHiddenThreadsModalInDom({
      records: getHiddenForumThreadRecordsForCurrentForum(),
      onClose: closeHiddenThreadsModal,
      onRestore: (threadId) => {
        void setForumThreadHiddenState(threadId, false);
      },
    });
  }

  function isHiddenThreadsModalOpen(): boolean {
    return isHiddenThreadsModalOpenInDom();
  }

  function closeHiddenThreadsModal() {
    closeHiddenThreadsModalInDom();
  }

  function renderHiddenThreadsModalBody() {
    renderHiddenThreadsModalBodyInDom({
      modal: ensureHiddenThreadsModal(),
      records: getHiddenForumThreadRecordsForCurrentForum(),
      onRestore: (threadId) => {
        void setForumThreadHiddenState(threadId, false);
      },
    });
  }

  function openHiddenThreadsModal() {
    openHiddenThreadsModalInDom({
      modal: ensureHiddenThreadsModal(),
      records: getHiddenForumThreadRecordsForCurrentForum(),
      onRestore: (threadId) => {
        void setForumThreadHiddenState(threadId, false);
      },
    });
  }

  function isNativeForumControlsTable(table: HTMLTableElement): boolean {
    return Boolean(
      table.querySelector("a[href*='newthread.php'][href*='do=newthread']") &&
      table.querySelector(".pagenav"),
    );
  }

  function getNativeForumControlsTable(): HTMLTableElement | null {
    const existing = document.getElementById(FORUM_CONTROLS_ROW_ID);

    if (existing instanceof HTMLTableElement) {
      return existing;
    }

    const threadsTable = getForumThreadsTable();
    const candidates = Array.from(document.querySelectorAll("table")).filter(
      (table) => {
        if (!(table instanceof HTMLTableElement)) {
          return false;
        }

        if (!isNativeForumControlsTable(table)) {
          return false;
        }

        return (
          !threadsTable ||
          Boolean(
            table.compareDocumentPosition(threadsTable) &
            Node.DOCUMENT_POSITION_FOLLOWING,
          )
        );
      },
    );

    return candidates[candidates.length - 1] || null;
  }

  function createForumLoadingStatus(): HTMLElement {
    return ForumLoadingStatus();
  }

  function renderForumLoadingStatus() {
    const status = document.getElementById(FORUM_LOADING_STATUS_ID);

    if (!(status instanceof HTMLElement)) {
      return;
    }

    const visible = forumThreadLoadState.isLoading;
    const loadedPages = Math.min(
      forumThreadLoadState.loadedPages,
      forumThreadLoadState.targetPages,
    );
    const text = status.querySelector("[data-fc-premium-loading-text]");

    status.dataset.fcPremiumLoading = String(visible);
    status.setAttribute("aria-hidden", String(!visible));
    status.title = visible ? "Cargando paginas del foro" : "";

    if (text instanceof HTMLElement) {
      text.textContent = `Cargando paginas ${loadedPages}/${forumThreadLoadState.targetPages}`;
    }
  }

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

  function installForumLiveSearch(root: HTMLFormElement | HTMLElement | null) {
    const input = root?.querySelector("input[name='query']");

    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    if (input.dataset.fcPremiumLiveSearchInstalled === "true") {
      return;
    }

    input.dataset.fcPremiumLiveSearchInstalled = "true";
    input.addEventListener("input", () => {
      scheduleForumLiveSearch(input.value);
    });
  }

  function detachMovedForumSearchForm(controlsTable: HTMLTableElement): HTMLFormElement | null {
    const form = document.querySelector(
      "form[name='busca'][action*='forocoches_search']",
    );

    if (form instanceof HTMLFormElement && controlsTable.contains(form)) {
      form.remove();
      return form;
    }

    return null;
  }

  function refreshExistingForumControlsRow(table: HTMLTableElement) {
    table.classList.add("fc-premium-forum-controls-table");
    table.removeAttribute(FORUM_LAYOUT_HIDDEN_ATTRIBUTE);

    const toggleCell = table.querySelector(
      ".fc-premium-forum-sidebar-toggle-cell",
    );

    if (toggleCell instanceof HTMLTableCellElement) {
      const button = getOrCreateForumSidebarToggleButton();

      if (!toggleCell.contains(button)) {
        toggleCell.textContent = "";
        toggleCell.append(button);
      }
    }

    installForumLiveSearch(table);

    if (!document.getElementById(FORUM_LOADING_STATUS_ID)) {
      const searchCell = table.querySelector(`#${FORUM_SEARCH_SLOT_ID}`);

      if (searchCell instanceof HTMLElement) {
        searchCell.append(createForumLoadingStatus());
      }
    }

    renderForumLoadingStatus();
  }

  function renderForumControlsRow(): HTMLTableElement | null {
    const existing = document.getElementById(FORUM_CONTROLS_ROW_ID);

    if (existing instanceof HTMLTableElement) {
      refreshExistingForumControlsRow(existing);
      return existing;
    }

    const table = getNativeForumControlsTable();

    if (!(table instanceof HTMLTableElement)) {
      renderForumLoadingStatus();
      return null;
    }

    const newThreadLink = table.querySelector(
      "a[href*='newthread.php'][href*='do=newthread']",
    );
    const pager = table.querySelector(".pagenav");
    const searchForm = detachMovedForumSearchForm(table);
    const button = getOrCreateForumSidebarToggleButton();

    newThreadLink?.remove();
    pager?.remove();
    button.remove();
    table.id = FORUM_CONTROLS_ROW_ID;
    table.classList.add("fc-premium-forum-controls-table");
    table.removeAttribute(FORUM_LAYOUT_HIDDEN_ATTRIBUTE);

    const body = table.tBodies[0] || table.createTBody();
    body.textContent = "";

    const row = body.insertRow();

    const toggleCell = row.insertCell();
    toggleCell.className = "smallfont fc-premium-forum-sidebar-toggle-cell";
    toggleCell.append(button);

    const newThreadCell = row.insertCell();
    newThreadCell.className = "smallfont fc-premium-forum-new-thread-cell";

    if (newThreadLink) {
      newThreadCell.append(newThreadLink);
    }

    const searchCell = row.insertCell();
    searchCell.id = FORUM_SEARCH_SLOT_ID;
    searchCell.className = "smallfont fc-premium-forum-search-cell";

    if (searchForm) {
      searchCell.append(searchForm);
    } else {
      moveForumHeaderSearchForm(searchCell);
    }

    installForumLiveSearch(searchCell);
    searchCell.append(createForumLoadingStatus());

    const pagerCell = row.insertCell();
    pagerCell.className = "smallfont fc-premium-forum-pager-cell";
    pagerCell.align = "right";

    if (pager) {
      pagerCell.append(pager);
    }

    renderForumLoadingStatus();
    return table;
  }

  function renderForumSidebarToggle(mainCell: HTMLTableCellElement) {
    if (renderForumControlsRow()) {
      document.getElementById(FORUM_SIDEBAR_TOGGLE_BAR_ID)?.remove();
      return;
    }

    let bar = document.getElementById(FORUM_SIDEBAR_TOGGLE_BAR_ID);

    if (!(bar instanceof HTMLElement)) {
      bar = document.createElement("div");
      bar.id = FORUM_SIDEBAR_TOGGLE_BAR_ID;
    }

    bar.textContent = "";
    bar.append(getOrCreateForumSidebarToggleButton());

    const anchor = getForumThreadListHeaderTable() || getForumThreadsTable();

    if (anchor?.parentElement === mainCell) {
      mainCell.insertBefore(bar, anchor);
    } else if (bar.parentElement !== mainCell) {
      mainCell.prepend(bar);
    }
  }

  function applyForumSidebarVisibility() {
    const panel = getRelatedForumsPanel();

    if (!panel) {
      return;
    }

    const sidebarCell = getForumSidebarCell(panel);

    if (!sidebarCell) {
      return;
    }

    const mainCell = getForumMainCell(sidebarCell);

    if (!mainCell) {
      return;
    }

    document.body.classList.toggle(
      FORUM_SIDEBAR_HIDDEN_CLASS,
      forumSidebarHidden,
    );
    setForumLayoutElementHidden(sidebarCell, forumSidebarHidden);

    const spacerCell = getForumSidebarSpacerCell(sidebarCell);

    if (spacerCell) {
      setForumLayoutElementHidden(spacerCell, forumSidebarHidden);
    }

    setForumMainCellExpanded(mainCell, forumSidebarHidden);
    renderForumSidebarToggle(mainCell);
  }

  function enhanceForumDisplayPage() {
    ensureStyle();
    hideUnusedTopNavigationBars();
    removeForumTitleTables();
    applyForumSidebarVisibility();
    renderForumControlsRow();
    renderHiddenThreadsToolbarButton();
    hideUnusedTopNavigationBars();
  }

  function getForumThreadRows(): HTMLTableRowElement[] {
    const table = getForumThreadsTable();

    return table ? Array.from(table.rows) : [];
  }

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
  }

  function renderVisibleForumThreadTitleTags(root: HTMLElement | Document = document) {
    renderVisibleForumThreadTitleTagsInDom(root, renderTaggedTitle);
  }

  function getCachedForumThreadsForCurrentForum(): ForumThreadRecord[] {
    const forumId = getForumId();

    return cachedForumThreads.filter((record) => record.forumId === forumId);
  }

  function getVisibleCachedForumThreadsForCurrentForum(): ForumThreadRecord[] {
    return getVisibleForumThreadRecords(getCachedForumThreadsForCurrentForum());
  }

  function getHiddenForumThreadRecordsForCurrentForum(): ForumThreadRecord[] {
    return getHiddenForumThreadRecords(getCachedForumThreadsForCurrentForum());
  }

  function getForumThreadRecordsForTag(tag: string | null): ForumThreadRecord[] {
    return filterForumThreadRecords(getCachedForumThreadsForCurrentForum(), {
      tag,
      searchQuery: activeForumSearchQuery,
    });
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

  function renderNativeForumPagers(total: number) {
    const pageSize = forumThreadsPerPage || FORUM_THREAD_FALLBACK_PAGE_SIZE;
    const totalPages = getForumThreadListTotalPages(total, pageSize);
    activeForumTagPage = clampForumThreadListPage(
      activeForumTagPage,
      totalPages,
    );

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
          currentPage: activeForumTagPage,
          totalPages,
          visiblePages: getVisiblePageNumbers(
            totalPages,
            activeForumTagPage,
          ),
          hrefForPage: (pageNumber) => getForumDynamicPageUrl(pageNumber).href,
          onPageClick: setForumTagPage,
        }),
      );
    }
  }

  function setForumTagPage(pageNumber: number) {
    activeForumTagPage = pageNumber;
    if (!activeForumSearchQuery) {
      syncForumTagUrl({ history: "push" });
    }
    refreshForumTagUi({ readUrlState: !activeForumSearchQuery });
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function renderForumThreadRows(rowHtmlList: string[], signature: string): boolean {
    const changed = renderForumThreadRowsFromHtml({
      headerRowHtml: nativeForumThreadHeaderRowHtml,
      rowHtmlList,
      signature,
      currentSignature: renderedForumThreadListSignature,
      renderTaggedTitle,
    });

    if (!changed) {
      return false;
    }

    renderedForumThreadListSignature = signature;
    return true;
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
      renderTaggedTitle,
    });

    if (changed) {
      renderedForumThreadListSignature = nativeSignature;
    }

    renderVisibleForumThreadTitleTags();
    return changed;
  }

  function applyHiddenForumThreadRows(): void {
    const hiddenThreadIds = new Set(
      getHiddenForumThreadRecordsForCurrentForum().map((record) => record.id),
    );
    applyHiddenForumThreadRowsInDom(hiddenThreadIds);
  }

  function renderForumThreadList(): boolean {
    if (!isForumDisplayPage()) {
      return false;
    }

    captureNativeForumThreadRows();

    const cachedForumRecords = getCachedForumThreadsForCurrentForum();
    const records = getForumThreadRecordsForTag(activeTagFilter);

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
      activeForumTagPage,
      forumThreadsPerPage || FORUM_THREAD_FALLBACK_PAGE_SIZE,
    );
    activeForumTagPage = page.currentPage;
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

  function collectCurrentForumThreadRecords(): ForumThreadRecord[] {
    const forumId = getForumId();

    if (!forumId) {
      return [];
    }

    return collectForumThreadRecords(
      document,
      location.href,
      forumId,
      getPageNumber(new URL(location.href)),
      forumThreadsPerPage || FORUM_THREAD_FALLBACK_PAGE_SIZE,
      Date.now(),
    );
  }

  function getCurrentForumThreadRecord(threadId: string): ForumThreadRecord | null {
    return (
      collectCurrentForumThreadRecords().find(
        (record) => record.id === threadId,
      ) || null
    );
  }

  async function cacheCurrentForumThreadRows(): Promise<void> {
    const records = collectCurrentForumThreadRecords();

    if (records.length === 0) {
      return;
    }

    mergeCachedForumThreadRecords(records);
    await writeForumThreadCacheRecords(
      records
        .map((record) =>
          cachedForumThreads.find(
            (cachedRecord) => cachedRecord.id === record.id,
          ),
        )
        .filter((record) => record !== undefined),
    );
  }

  async function setForumThreadHiddenState(threadId: string, hidden: boolean): Promise<boolean> {
    if (!isForumDisplayPage() || !threadId) {
      return false;
    }

    const now = Date.now();
    let existing =
      cachedForumThreads.find((record) => record.id === threadId) ||
      getCurrentForumThreadRecord(threadId);

    if (hidden && getCachedForumThreadsForCurrentForum().length === 0) {
      await cacheCurrentForumThreadRows();
      existing =
        cachedForumThreads.find((record) => record.id === threadId) ||
        existing;
    }

    if (!existing) {
      return false;
    }

    const record = {
      ...existing,
      isHidden: hidden,
      hiddenAt: hidden ? now : 0,
      updatedAt: now,
    };

    cachedForumThreads = cachedForumThreads
      .filter((cachedRecord) => cachedRecord.id !== threadId)
      .concat(record);

    await writeForumThreadCacheRecords([record]);
    cachedForumThreads = await readForumThreadCacheRecords();
    refreshForumTagUi();

    if (isHiddenThreadsModalOpen()) {
      renderHiddenThreadsModalBody();
    }

    return true;
  }

  async function hideSelectedForumThread(): Promise<boolean> {
    if (!isForumDisplayPage()) {
      return false;
    }

    const selected = getSelectedNavigationItem();
    const link = selected?.link;
    const threadId = link ? getThreadId(new URL(link.href)) : null;

    if (!threadId) {
      return false;
    }

    const previousIndex = Math.max(selectedNavigationIndex, 0);
    const hidden = await setForumThreadHiddenState(threadId, true);

    if (hidden && navigationItems.length > 0) {
      selectNavigationIndex(
        Math.min(previousIndex, navigationItems.length - 1),
      );
    }

    return hidden;
  }

  function mergeCachedForumThreadRecords(records: ForumThreadRecord[]) {
    if (records.length === 0) {
      return;
    }

    const byId = new Map(
      cachedForumThreads.map((record) => [record.id, record]),
    );

    for (const record of records) {
      const previous = byId.get(record.id);
      byId.set(record.id, {
        ...record,
        isHidden: Boolean(previous?.isHidden || record.isHidden),
        hiddenAt: previous?.hiddenAt || record.hiddenAt || 0,
      });
    }

    cachedForumThreads = Array.from(byId.values());
  }

  function getForumRecentPageUrl(pageNumber: number): URL {
    const url = new URL(location.href);
    clearForumStateQueryParams(url);
    url.hash = "";
    url.searchParams.delete("page");

    if (pageNumber > 1) {
      url.searchParams.set("page", String(pageNumber));
    }

    return url;
  }

  function replaceForumPagersFromDocument(doc: Document): void {
    const currentPagers = Array.from(document.querySelectorAll(".pagenav"));
    const nextPagers = Array.from(doc.querySelectorAll(".pagenav"));

    currentPagers.forEach((pager, index) => {
      const nextPager = nextPagers[index];

      if (pager instanceof HTMLElement && nextPager instanceof HTMLElement) {
        pager.innerHTML = nextPager.innerHTML;
      }
    });
  }

  async function loadForumDisplayPageWithJavascript(url: URL): Promise<void> {
    const forumId = getForumId(url);

    if (!forumId) {
      location.href = url.href;
      return;
    }

    setForumThreadLoadState({ isLoading: true });

    try {
      const pageNumber = getPageNumber(url);
      const doc =
        pageNumber === getPageNumber(new URL(location.href)) &&
        url.pathname === location.pathname
          ? parseHtml(document.documentElement.outerHTML)
          : await fetchThreadDocument(url.href);
      const records = collectForumThreadRecords(
        doc,
        url.href,
        forumId,
        pageNumber,
        forumThreadsPerPage || FORUM_THREAD_FALLBACK_PAGE_SIZE,
        Date.now(),
      );

      if (records.length === 0) {
        location.href = url.href;
        return;
      }

      replaceForumPagersFromDocument(doc);
      activeTagFilter = null;
      activeForumSearchQuery = "";
      activeForumTagPage = pageNumber;
      nativeForumThreadRowHtml = records.map((record) => record.html);
      forumThreadsPerPage = records.length || FORUM_THREAD_FALLBACK_PAGE_SIZE;
      renderedForumThreadListSignature = null;
      renderForumThreadRows(
        nativeForumThreadRowHtml,
        getForumThreadRowsSignature(nativeForumThreadRowHtml, `native-page-${pageNumber}`),
      );
      applyHiddenForumThreadRows();
      updateBrowserHistory(url, "push");
      mergeCachedForumThreadRecords(records);
      await writeForumThreadCacheRecords(
        records
          .map((record) =>
            cachedForumThreads.find(
              (cachedRecord) => cachedRecord.id === record.id,
            ),
          )
          .filter((record) => record !== undefined),
      );
      cachedForumThreads = await readForumThreadCacheRecords();
      renderTopTagBar();
      refreshNavigation({ reset: true });
      window.scrollTo({ top: 0, behavior: "auto" });
    } catch (error) {
      console.warn(
        "Forocoches Premium: no se pudo cargar la pagina del foro con JavaScript",
        error,
      );
      location.href = url.href;
    } finally {
      setForumThreadLoadState({ isLoading: false });
    }
  }

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

    const link = (event.target instanceof Element
      ? event.target.closest(".pagenav a[href*='forumdisplay.php']")
      : null);

    if (!(link instanceof HTMLAnchorElement)) {
      return;
    }

    const url = toUrl(link.getAttribute("href") || link.href);

    if (!url || url.pathname !== location.pathname || getForumId(url) !== getForumId()) {
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

  async function scrapeForumThreadPage(pageNumber: number, scrapeStartedAt: number): Promise<ForumThreadRecord[]> {
    const forumId = getForumId();

    if (!forumId) {
      return [];
    }

    const url = getForumRecentPageUrl(pageNumber);
    const doc =
      pageNumber === 1 && getPageNumber(new URL(location.href)) === 1
        ? document
        : await fetchThreadDocument(url.href);

    return collectForumThreadRecords(
      doc,
      url.href,
      forumId,
      pageNumber,
      forumThreadsPerPage || FORUM_THREAD_FALLBACK_PAGE_SIZE,
      scrapeStartedAt,
    );
  }

  async function saveScrapedForumThreadRecords(records: ForumThreadRecord[]): Promise<void> {
    mergeCachedForumThreadRecords(records);
    await writeForumThreadCacheRecords(
      records
        .map((record) =>
          cachedForumThreads.find(
            (cachedRecord) => cachedRecord.id === record.id,
          ),
        )
        .filter((record) => record !== undefined),
    );
    cachedForumThreads = await readForumThreadCacheRecords();
    refreshForumTagUi();
  }

  async function scrapeRecentForumThreadPages(startPage: number, scrapeStartedAt: number): Promise<void> {
    if (forumThreadScrapeStarted || !isForumDisplayPage()) {
      return;
    }

    forumThreadScrapeStarted = true;
    setForumThreadLoadState({ isLoading: true });

    for (
      let pageNumber = startPage;
      pageNumber <= FORUM_THREAD_CACHE_RECENT_PAGES;
      pageNumber += 1
    ) {
      try {
        const records = await scrapeForumThreadPage(
          pageNumber,
          scrapeStartedAt,
        );
        await saveScrapedForumThreadRecords(records);
      } catch (error) {
        console.warn(
          `Forocoches Premium: no se pudo cachear la pagina ${pageNumber} del foro`,
          error,
        );
      } finally {
        setForumThreadLoadState({
          loadedPages: Math.max(forumThreadLoadState.loadedPages, pageNumber),
        });
      }

      if (pageNumber < FORUM_THREAD_CACHE_RECENT_PAGES) {
        await sleep(PAGE_LOAD_DELAY_MS);
      }
    }

    await cleanupForumThreadCache();
    cachedForumThreads = await readForumThreadCacheRecords();
    setForumThreadLoadState({
      loadedPages: FORUM_THREAD_CACHE_RECENT_PAGES,
      isLoading: false,
    });
    refreshForumTagUi();
  }

  async function initializeForumThreadCache(): Promise<void> {
    captureNativeForumThreadRows();
    cachedForumThreads = await readForumThreadCacheRecords();
    setForumThreadLoadState({
      loadedPages: 0,
      targetPages: FORUM_THREAD_CACHE_RECENT_PAGES,
      isLoading: true,
    });

    const scrapeStartedAt = Date.now();

    try {
      const firstPageRecords = await scrapeForumThreadPage(1, scrapeStartedAt);
      await saveScrapedForumThreadRecords(firstPageRecords);
    } catch (error) {
      console.warn(
        "Forocoches Premium: no se pudo cachear la primera pagina del foro",
        error,
      );
      refreshForumTagUi();
    } finally {
      setForumThreadLoadState({
        loadedPages: Math.max(forumThreadLoadState.loadedPages, 1),
      });
    }

    void scrapeRecentForumThreadPages(2, scrapeStartedAt);
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

  function toggleTagFilter(tag: string) {
    if (!isForumDisplayPage()) {
      return;
    }

    activeTagFilter = activeTagFilter === tag ? null : tag;
    activeForumTagPage = 1;
    syncForumTagUrl({ history: "push" });
    refreshForumTagUi();
  }

  function clearTagFilter() {
    if (!activeTagFilter) {
      return;
    }

    activeTagFilter = null;
    activeForumTagPage = 1;
    syncForumTagUrl({ history: "push" });
    refreshForumTagUi();
  }

  function getTopTitleTags(): TopTagSummary[] {
    const tagsByName = new Map<string, TopTagSummary>();
    let titleIndex = 0;
    const forumRecords = getVisibleCachedForumThreadsForCurrentForum();

    if (forumRecords.length > 0) {
      for (const record of sortForumThreadRecords(forumRecords)) {
        for (const tag of record.tags) {
          const summary = tagsByName.get(tag);

          if (summary) {
            summary.count += 1;
          } else {
            tagsByName.set(tag, {
              tag,
              count: 1,
              firstIndex: titleIndex,
            });
          }
        }

        titleIndex += 1;
      }

      return Array.from(tagsByName.values())
        .sort((left, right) => {
          if (left.count !== right.count) {
            return right.count - left.count;
          }

          return left.firstIndex - right.firstIndex;
        })
        .slice(0, 12);
    }

    for (const title of document.querySelectorAll(THREAD_TITLE_SELECTOR)) {
      if (!(title instanceof HTMLAnchorElement)) {
        continue;
      }

      for (const tag of getTitleTags(title)) {
        const summary = tagsByName.get(tag);

        if (summary) {
          summary.count += 1;
        } else {
          tagsByName.set(tag, { tag, count: 1, firstIndex: titleIndex });
        }
      }

      titleIndex += 1;
    }

    return Array.from(tagsByName.values())
      .sort((left, right) => {
        if (left.count !== right.count) {
          return right.count - left.count;
        }

        return left.firstIndex - right.firstIndex;
      })
      .slice(0, 12);
  }

  function renderTopTagBar() {
    document.getElementById(TOP_TAGS_ID)?.remove();

    if (!isForumDisplayPage()) {
      return;
    }

    const topTags = getTopTitleTags();

    if (topTags.length === 0) {
      return;
    }

    const table = getForumThreadsTable();

    if (!table?.parentElement) {
      return;
    }

    table.before(
      TopTagBar({
        tags: topTags,
        activeTag: activeTagFilter,
        onToggle: toggleTagFilter,
      }),
    );
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

  function getShortcutHelpItems(): ShortcutHelpItem[] {
    return [
      {
        keys: [KEY_NAV_PREVIOUS_POST, KEY_NAV_NEXT_POST],
        description: "Seleccionar mensaje anterior/siguiente",
      },
      {
        keys: [KEY_NAV_FIRST_POST, KEY_NAV_LAST_POST],
        description: "Ir al primer/ultimo mensaje",
      },
      {
        keys: [KEY_QUOTE_SELECTED_POST],
        description: "Abrir/citar el seleccionado",
      },
      {
        keys: [
          KEY_OPEN_SELECTED_THREAD_IN_NEW_TAB_MODIFIER,
          KEY_OPEN_SELECTED_THREAD_IN_NEW_TAB,
        ],
        description: "Abrir hilo seleccionado en nueva pestaña",
      },
      {
        keys: [KEY_HIDE_SELECTED_THREAD],
        description: "Esconder hilo seleccionado",
      },
      {
        keys: [KEY_NEW_THREAD_REPLY],
        description: "Responder sin cita",
      },
      {
        keys: [KEY_MULTIQUOTE_SELECTED_POST],
        description: "Alternar multicita",
      },
      {
        keys: [KEY_CLEAR_ACTIVE_VIEW],
        description: "Limpiar filtros o cerrar ayuda",
      },
      {
        keys: [KEY_OPEN_SHORTCUT_HELP],
        description: "Mostrar estos atajos",
      },
    ];
  }

  function formatShortcutHelpKey(key: string): string {
    if (key === KEY_NAV_PREVIOUS_POST) {
      return "Arriba";
    }

    if (key === KEY_NAV_NEXT_POST) {
      return "Abajo";
    }

    if (key === KEY_NAV_FIRST_POST) {
      return "Inicio";
    }

    if (key === KEY_NAV_LAST_POST) {
      return "Fin";
    }

    if (key === KEY_CLEAR_ACTIVE_VIEW) {
      return "Esc";
    }

    if (key.length === 1) {
      return key.toUpperCase();
    }

    return key;
  }

  function renderShortcutHelpButton() {
    renderShortcutHelpButtonInDom({
      items: getShortcutHelpItems(),
      formatKey: formatShortcutHelpKey,
    });
  }

  function openSelectedNavigationItem() {
    if (isThreadPage()) {
      const selected = getSelectedPostWrapper();

      if (selected) {
        quoteSelectedPost(selected);
      }

      return;
    }

    const selected = navigationItems[selectedNavigationIndex];

    if (!selected?.link) {
      return;
    }

    selected.link.click();
  }

  function getSelectedNavigationItem(): NavigationItem | null {
    if (navigationItems.length === 0) {
      refreshNavigation({ reset: true });
    }

    return navigationItems[selectedNavigationIndex] || null;
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

  function isOpenSelectedThreadInNewTabShortcut(event: KeyboardEvent): boolean {
    if (!isForumDisplayPage()) {
      return false;
    }

    return isOpenInNewTabKeyboardShortcut(
      event,
      KEY_OPEN_SELECTED_THREAD_IN_NEW_TAB,
    );
  }

  function handleHideSelectedThreadShortcut(event: KeyboardEvent): boolean {
    if (
      !isForumDisplayPage() ||
      hasKeyboardModifier(event) ||
      !keyboardShortcutMatches(event, KEY_HIDE_SELECTED_THREAD)
    ) {
      return false;
    }

    event.preventDefault();
    void hideSelectedForumThread();
    return true;
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

  function onNavigationKeyDown(event: KeyboardEvent) {
    if (isEditableTarget(event.target)) {
      return;
    }

    if (
      (event.key === KEY_NAV_NEXT_POST ||
        event.key === KEY_NAV_PREVIOUS_POST) &&
      (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
    ) {
      return;
    }

    if (keyboardShortcutMatches(event, KEY_OPEN_SHORTCUT_HELP)) {
      event.preventDefault();
      setShortcutHelpPopoverOpen(true);
    } else if (isOpenSelectedThreadInNewTabShortcut(event)) {
      event.preventDefault();
      openSelectedForumThreadInNewTab();
    } else if (handleHideSelectedThreadShortcut(event)) {
      return;
    } else if (
      event.key === KEY_CLEAR_ACTIVE_VIEW &&
      isHiddenThreadsModalOpen()
    ) {
      event.preventDefault();
      closeHiddenThreadsModal();
    } else if (
      event.key === KEY_CLEAR_ACTIVE_VIEW &&
      isShortcutHelpPopoverOpen()
    ) {
      event.preventDefault();
      closeShortcutHelpPopover();
    } else if (event.key === KEY_NAV_NEXT_POST) {
      event.preventDefault();
      moveNavigation(1);
    } else if (event.key === KEY_NAV_PREVIOUS_POST) {
      event.preventDefault();
      moveNavigation(-1);
    } else if (event.key === KEY_NAV_FIRST_POST) {
      event.preventDefault();
      selectNavigationIndex(0);
    } else if (event.key === KEY_NAV_LAST_POST) {
      event.preventDefault();
      if (navigationItems.length === 0) {
        refreshNavigation({ reset: true });
      }
      selectNavigationIndex(navigationItems.length - 1);
    } else if (handleSelectedPostActionShortcut(event)) {
      return;
    } else if (event.key === KEY_CLEAR_ACTIVE_VIEW && activeTagFilter) {
      event.preventDefault();
      clearTagFilter();
    } else if (
      event.key === KEY_CLEAR_ACTIVE_VIEW &&
      (hasActiveThreadPostFilters() || activeGraphView)
    ) {
      event.preventDefault();
      clearThreadFilters();
    } else if (
      event.key === KEY_QUOTE_SELECTED_POST &&
      !hasKeyboardModifier(event)
    ) {
      event.preventDefault();
      openSelectedNavigationItem();
    }
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

  function getPostsElement(): HTMLElement | null {
    const posts = document.querySelector(POSTS_SELECTOR);
    return posts instanceof HTMLElement ? posts : null;
  }

  function ensureThreadSummary(): HTMLElement | null {
    const posts = getPostsElement();

    if (!posts) {
      return null;
    }

    const existing = document.getElementById(THREAD_SUMMARY_ID);

    if (existing instanceof HTMLElement) {
      installStickySummaryShadow(existing);
      return existing;
    }

    const summary = document.createElement("div");
    summary.id = THREAD_SUMMARY_ID;
    posts.before(summary);
    installStickySummaryShadow(summary);
    return summary;
  }

  function setSummary(summary: HTMLElement | null, message: string) {
    if (!summary) {
      return;
    }

    summary.innerHTML = message;
  }

  function renderThreadProgress(summary: HTMLElement | null, state: ThreadLoadState) {
    document.getElementById(THREAD_PROGRESS_ID)?.remove();

    if (!(summary instanceof HTMLElement) || !state.isLoading) {
      return;
    }

    const progress = document.createElement("span");
    progress.id = THREAD_PROGRESS_ID;

    const spinner = document.createElement("span");
    spinner.className = "fc-premium-spinner";
    spinner.setAttribute("aria-hidden", "true");
    progress.append(spinner);

    const text = document.createElement("span");
    const pageLabel = `${state.loadedPages}/${state.targetPages}`;
    text.textContent = `paginas ${pageLabel}`;
    progress.append(text);
    summary.append(progress);
  }

  function installStickySummaryShadow(summary: HTMLElement | null) {
    if (!summary || summary.dataset.fcPremiumStickyInstalled === "true") {
      return;
    }

    summary.dataset.fcPremiumStickyInstalled = "true";

    const updateShadow = () => {
      summary.classList.toggle(
        "fc-premium-summary-stuck",
        summary.getBoundingClientRect().top <= 0,
      );
    };

    window.addEventListener("scroll", updateShadow, { passive: true });
    window.addEventListener("resize", updateShadow);
    updateShadow();
  }

  function renderThreadSummaryMenu(summary: HTMLElement | null) {
    if (!(summary instanceof HTMLElement)) {
      return;
    }

    summary.textContent = "";
    summary.hidden = true;
    const controlsTarget = renderThreadControls(summary);

    if (controlsTarget === summary) {
      summary.hidden = !threadLoadState.isLoading;
      renderThreadProgress(summary, threadLoadState);
    }
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

  function renderThreadControls(summary: HTMLElement | null): HTMLElement | null {
    document.getElementById(THREAD_CONTROLS_ID)?.remove();

    const threadToolsCell = document.getElementById("threadtools");
    const toolbarRow = threadToolsCell?.parentElement;

    if (!summary && !(toolbarRow instanceof HTMLTableRowElement)) {
      return null;
    }

    const controls =
      toolbarRow instanceof HTMLTableRowElement
        ? document.createElement("td")
        : document.createElement("div");
    controls.id = THREAD_CONTROLS_ID;

    if (controls instanceof HTMLTableCellElement) {
      controls.className = "vbmenu_control fc-premium-thread-toolbar-controls";
      controls.noWrap = true;
    }

    const cacheButton = document.createElement("button");
    cacheButton.type = "button";
    cacheButton.textContent = "Actualizar cache";
    cacheButton.title =
      "Borrar la cache de este hilo y volver a cargar paginas";
    cacheButton.addEventListener("click", async () => {
      await clearCurrentThreadCache();
      location.reload();
    });
    controls.append(cacheButton);
    renderThreadProgress(controls, threadLoadState);

    if (
      toolbarRow instanceof HTMLTableRowElement &&
      threadToolsCell instanceof HTMLTableCellElement
    ) {
      toolbarRow.insertBefore(controls, threadToolsCell);
      return controls;
    }

    summary?.append(controls);
    return summary || null;
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

  async function init(): Promise<void> {
    const scriptWindow = window as ScriptWindow;

    if (scriptWindow[INSTANCE_KEY] === SCRIPT_INSTANCE_VERSION) {
      return;
    }

    scriptWindow[INSTANCE_KEY] = SCRIPT_INSTANCE_VERSION;
    await waitForDocumentReady();
    applyCompactMode();

    if (isForumDisplayPage() || isThreadPage()) {
      ensureStyle();
      renderShortcutHelpButton();
      installKeyboardNavigation();
    }

    if (isForumDisplayPage()) {
      enhanceForumDisplayPage();
      installForumHistoryNavigation();
      installForumPageNavigation();
      await initializeForumThreadCache();
      refreshNavigation({ reset: true });
    }

    if (!isThreadPage()) {
      await cleanupThreadCache();
      return;
    }

    enhanceThreadTitleTags();

    installThreadPageNavigation();
    installThreadHistoryNavigation();

    try {
      await enhanceThreadPage();
    } catch (error) {
      const summary = ensureThreadSummary();
      setSummary(
        summary,
        `<strong>Forocoches Premium:</strong> no se pudo ordenar el hilo: ${String(
          error,
        )}`,
      );
    } finally {
      await cleanupThreadCache();
    }
  }

  void init();
}
