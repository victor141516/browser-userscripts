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
  getPostIdFromNavigationElement,
  getPostNavigationItems,
  getThreadTitleNavigationItems,
} from "../../ui/navigationDom";
import {
  renderShortcutHelpButton as renderShortcutHelpButtonInDom,
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
  KEY_OPEN_SELECTED_THREAD_IN_NEW_TAB,
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
import { isOpenInNewTabKeyboardShortcut } from "../../services/keyboard";
import { createNavigationController } from "./navigationController";
import { createForumPageKeyboardController } from "./forumPageKeyboardController";

declare const __FC_PREMIUM_CSS__: string;



export interface ForumPageController {
  init(): Promise<void>;
  handleNavigationKeyDown(event: KeyboardEvent): boolean;
  refreshNavigation(options?: { reset?: boolean, scroll?: boolean, updateUrl?: boolean }): void;
  renderTopTagBar(): void;
  renderForumControlsRow(): HTMLTableElement | null;
}

export function createForumPageController(): ForumPageController {
  const initialForumQueryState = readForumQueryState();
  let activeTagFilter: string | null = initialForumQueryState.tag;
  let activeForumTagPage = initialForumQueryState.page;
  let activeForumSearchQuery = "";
  let forumLiveSearchTimer = 0;
  let renderedForumThreadListSignature: string | null = null;
  let forumThreadsPerPage = FORUM_THREAD_FALLBACK_PAGE_SIZE;
  let forumThreadScrapeStarted = false;
  let forumThreadLoadState: ForumThreadLoadState = {
    loadedPages: 0,
    targetPages: FORUM_THREAD_CACHE_RECENT_PAGES,
    isLoading: false,
  };
  let cachedForumThreads: ForumThreadRecord[] = [];
  let nativeForumThreadRowHtml: string[] = [];
  let nativeForumThreadHeaderRowHtml: string[] = [];
  let forumSidebarHidden = getSavedForumSidebarHidden();

  function getSavedForumSidebarHidden(): boolean {
    const saved = localStorage.getItem(FORUM_SIDEBAR_STORAGE_KEY);

    return saved === null ? true : saved === "true";
  }

  function setSavedForumSidebarHidden(hidden: boolean) {
    forumSidebarHidden = hidden;
    localStorage.setItem(FORUM_SIDEBAR_STORAGE_KEY, String(hidden));
    applyForumSidebarVisibility();
  }

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

  function renderShortcutHelpButton() {
    renderShortcutHelpButtonInDom({
      items: getShortcutHelpItems(),
      formatKey: formatShortcutHelpKey,
    });
  }

  function installForumKeyboardNavigation(): void {
    window.addEventListener("keydown", forumPageKeyboard.handleNavigationKeyDown, true);
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

    const previousIndex = Math.max(
      getNavigationItems().findIndex((item) => item === selected),
      0,
    );
    const hidden = await setForumThreadHiddenState(threadId, true);

    if (hidden && getNavigationLength() > 0) {
      selectNavigationIndex(
        Math.min(previousIndex, getNavigationLength() - 1),
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
    isThreadPage,
  });

  return {
    init: async () => { initForumPage(); },
    handleNavigationKeyDown: forumPageKeyboard.handleNavigationKeyDown,
    refreshNavigation,
    renderTopTagBar,
    renderForumControlsRow,
  };
}
