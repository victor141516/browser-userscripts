// ==UserScript==
// @name         Forocoches Premium
// @namespace    http://tampermonkey.net/
// @version      2026-06-09-18
// @description  Improves Forocoches thread reading
// @author       victor141516
// @match        https://forocoches.com/foro/*
// @icon         https://forocoches.com/favicon.ico
// @grant        none
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(function () {
  "use strict";

  const STYLE_ID = "fc-premium-style";
  const INSTANCE_KEY = "__fcPremiumThreadEnhancerStarted";
  const SCRIPT_INSTANCE_VERSION = "2026-06-09-18";
  const SHORTCUT_HELP_CONTAINER_ID = "fc-premium-shortcut-help-container";
  const SHORTCUT_HELP_BUTTON_ID = "fc-premium-shortcut-help-button";
  const SHORTCUT_HELP_POPOVER_ID = "fc-premium-shortcut-help-popover";
  const HIDDEN_THREADS_BUTTON_ID = "fc-premium-hidden-threads-button";
  const HIDDEN_THREADS_MODAL_ID = "fc-premium-hidden-threads-modal";
  const HIDDEN_THREADS_MODAL_BODY_ID = "fc-premium-hidden-threads-modal-body";
  const MODAL_OPEN_CLASS = "fc-premium-modal-open";
  const KEY_NAV_PREVIOUS_POST = "ArrowUp";
  const KEY_NAV_NEXT_POST = "ArrowDown";
  const KEY_NAV_FIRST_POST = "Home";
  const KEY_NAV_LAST_POST = "End";
  const KEY_CLEAR_ACTIVE_VIEW = "Escape";
  const KEY_OPEN_SHORTCUT_HELP = "?";
  const KEY_QUOTE_SELECTED_POST = "Enter";
  const KEY_OPEN_SELECTED_THREAD_IN_NEW_TAB = "Enter";
  const KEY_OPEN_SELECTED_THREAD_IN_NEW_TAB_MODIFIER = "Cmd/Ctrl";
  const KEY_HIDE_SELECTED_THREAD = "h";
  const KEY_NEW_THREAD_REPLY = "n";
  const KEY_MULTIQUOTE_SELECTED_POST = "m";
  const TOP_TAGS_ID = "fc-premium-top-tags";
  const FORUM_SIDEBAR_TOGGLE_BAR_ID = "fc-premium-forum-sidebar-toggle-bar";
  const FORUM_SIDEBAR_TOGGLE_ID = "fc-premium-forum-sidebar-toggle";
  const FORUM_CONTROLS_ROW_ID = "fc-premium-forum-controls-row";
  const FORUM_SEARCH_SLOT_ID = "fc-premium-forum-search-slot";
  const FORUM_LOADING_STATUS_ID = "fc-premium-forum-loading-status";
  const THREAD_PROGRESS_ID = "fc-premium-thread-progress";
  const NAVIGATION_STATUS_ID = "fc-premium-navigation-status";
  const THREAD_SUMMARY_ID = "fc-premium-thread-summary";
  const THREAD_CONTROLS_ID = "fc-premium-thread-controls";
  const FORUM_SIDEBAR_HIDDEN_CLASS = "fc-premium-forum-sidebar-hidden";
  const COMPACT_MODE_CLASS = "fc-premium-compact";
  const FORUM_SIDEBAR_STORAGE_KEY = "fcPremiumForumSidebarHidden";
  // Cached thread messages older than this are considered stale.
  const THREAD_CACHE_MAX_AGE_MS = 10 * 60 * 1000;
  // Approximate maximum total size for cached thread records in IndexedDB.
  const THREAD_CACHE_MAX_BYTES = 500 * 1024 * 1024;
  // IndexedDB database used for the heavier per-thread message cache.
  const THREAD_CACHE_DB_NAME = "fcPremiumThreadCache";
  // Bump this when the IndexedDB object store schema changes.
  const THREAD_CACHE_DB_VERSION = 3;
  // Object store containing one cached record per thread id.
  const THREAD_CACHE_STORE_NAME = "threads";
  // Object store containing thread-list records keyed by thread id.
  const FORUM_THREAD_CACHE_STORE_NAME = "forumThreads";
  // Bump this when the cached post/thread record shape changes.
  const THREAD_CACHE_RECORD_VERSION = 2;
  // Bump this when the cached forum-list record shape changes.
  const FORUM_THREAD_CACHE_RECORD_VERSION = 1;
  // Number of recent forum pages scraped in the background on every visit.
  const FORUM_THREAD_CACHE_RECENT_PAGES = 10;
  // Maximum number of cached forum-list threads retained after each scrape.
  const FORUM_THREAD_CACHE_MAX_RECORDS = 1000;
  // Fallback page size used until the native forum page reveals its own size.
  const FORUM_THREAD_FALLBACK_PAGE_SIZE = 40;
  // Delay before applying the local IndexedDB thread search while typing.
  const FORUM_LIVE_SEARCH_DEBOUNCE_MS = 220;
  // Old localStorage prefix kept only so legacy cache entries can be removed.
  const THREAD_CACHE_LEGACY_STORAGE_PREFIX = "fcPremiumThreadCache:";
  const THREAD_STATE_QUERY_PARAMS = {
    graphType: "fcp_graph",
    graphRoot: "fcp_root",
    graphRelated: "fcp_related",
    pageFilter: "fcp_page",
    authorFilter: "fcp_author",
  };
  const LEGACY_THREAD_STATE_QUERY_PARAMS = ["fcp_mode"];
  const FORUM_STATE_QUERY_PARAMS = {
    tag: "fcp_tag",
  };
  const SELECTED_ATTRIBUTE = "data-fc-premium-selected";
  const FORUM_LAYOUT_HIDDEN_ATTRIBUTE = "data-fc-premium-layout-hidden";
  const POSTS_SELECTOR = "#posts";
  const POST_TABLE_SELECTOR = "table[id^='post']";
  const THREAD_TITLE_SELECTOR =
    "a[id^='thread_title_'][href*='showthread.php?t=']";
  const HIDDEN_THREAD_ATTRIBUTE = "data-fc-premium-tag-hidden";
  const HIDDEN_POST_ATTRIBUTE = "data-fc-premium-author-hidden";
  const HIDDEN_POST_PAGE_ATTRIBUTE = "data-fc-premium-page-hidden";
  const PAGE_LOAD_DELAY_MS = 250;
  const TAG_PATTERN = /\+([A-Za-z0-9_-]+)/g;
  const GRAPH_VIEW_TYPES = ["quoted-sources", "quoted-by", "conversation"];

  /**
   * @typedef {object} PostRecord
   * @property {string} id
   * @property {string} html
   * @property {string} author
   * @property {string} postNumber
   * @property {number} pageNumber
   * @property {number} pageIndex
   * @property {number} originalIndex
   * @property {string[]} quotedPostIds
   * @property {string[]} replyingPostIds
   * @property {boolean} isOriginalPoster
   * @property {number} replyCount
   */

  /**
   * @typedef {object} NavigationItem
   * @property {HTMLElement} element
   * @property {HTMLAnchorElement | null} link
   */

  /**
   * @typedef {object} ShortcutHelpItem
   * @property {string[]} keys
   * @property {string} description
   */

  /**
   * @typedef {object} ThreadPage
   * @property {number} pageNumber
   * @property {string} url
   */

  /**
   * @typedef {object} ThreadLoadState
   * @property {number} loadedPages
   * @property {number} targetPages
   * @property {number} totalPages
   * @property {number} loadedPosts
   * @property {boolean} isLoading
   */

  /**
   * @typedef {object} ForumThreadLoadState
   * @property {number} loadedPages
   * @property {number} targetPages
   * @property {boolean} isLoading
   */

  /**
   * @typedef {object} ThreadCacheRecord
   * @property {number} version
   * @property {string} threadId
   * @property {number} totalPages
   * @property {number[]} cachedPageNumbers
   * @property {number} savedAt
   * @property {number} byteSize
   * @property {PostRecord[]} posts
   */

  /**
   * @typedef {object} ForumThreadRecord
   * @property {number} version
   * @property {string} id
   * @property {string} forumId
   * @property {string} url
   * @property {string} title
   * @property {string[]} tags
   * @property {string} html
   * @property {string} preview
   * @property {string} author
   * @property {string} lastPostText
   * @property {string} statsText
   * @property {string} rowText
   * @property {number} sourcePage
   * @property {number} sourceIndex
   * @property {number} recentIndex
   * @property {number} lastSeen
   * @property {number} updatedAt
   * @property {boolean} isHidden
   * @property {number} hiddenAt
   */

  /**
   * @typedef {object} ThreadGraph
   * @property {Map<string, PostRecord>} postById
   * @property {Map<string, Set<string>>} quotedByPostId
   * @property {Map<string, Set<string>>} quotingByPostId
   * @property {Map<string, Set<string>>} neighborsByPostId
   * @property {Map<string, string | null>} chronologicalNextByPostId
   */

  /**
   * @typedef {"quoted-sources" | "quoted-by" | "conversation"} GraphViewType
   */

  /**
   * @typedef {object} ThreadQueryState
   * @property {ActiveGraphView | null} graphView
   * @property {number | null} pageFilter
   * @property {string | null} authorFilter
   */

  /**
   * @typedef {object} ActiveGraphView
   * @property {GraphViewType} type
   * @property {string} rootPostId
   * @property {string | null} relatedPostId
   */

  /** @type {NavigationItem[]} */
  let navigationItems = [];
  let selectedNavigationIndex = -1;
  /** @type {PostRecord[]} */
  let loadedThreadPosts = [];
  /** @type {ThreadPage[]} */
  let threadPages = [];
  /** @type {Set<number>} */
  let loadedThreadPageNumbers = new Set();
  /** @type {ThreadLoadState} */
  let threadLoadState = {
    loadedPages: 0,
    targetPages: 0,
    totalPages: 0,
    loadedPosts: 0,
    isLoading: false,
  };
  /** @type {ThreadGraph} */
  let threadGraph = createEmptyThreadGraph();
  const initialThreadQueryState = readThreadQueryState();
  /** @type {ActiveGraphView | null} */
  let activeGraphView = null;
  /** @type {ActiveGraphView | null} */
  let pendingGraphView = initialThreadQueryState.graphView;
  const compactModeEnabled = true;
  let forumSidebarHidden = getSavedForumSidebarHidden();
  const initialForumQueryState = readForumQueryState();
  /** @type {string | null} */
  let activeTagFilter = initialForumQueryState.tag;
  let activeForumTagPage = initialForumQueryState.page;
  let activeForumSearchQuery = "";
  let forumLiveSearchTimer = 0;
  /** @type {number | null} */
  let activePageFilter = initialThreadQueryState.pageFilter;
  /** @type {string | null} */
  let activeAuthorFilter = initialThreadQueryState.authorFilter;
  /** @type {string | null} */
  let pendingInitialHashPostId = getLocationPostHashId();
  /** @type {Promise<IDBDatabase> | null} */
  let threadCacheDbPromise = null;
  /** @type {ForumThreadRecord[]} */
  let cachedForumThreads = [];
  /** @type {string[]} */
  let nativeForumThreadRowHtml = [];
  /** @type {string[]} */
  let nativeForumThreadHeaderRowHtml = [];
  /** @type {string | null} */
  let renderedForumThreadListSignature = null;
  let forumThreadsPerPage = FORUM_THREAD_FALLBACK_PAGE_SIZE;
  let forumThreadScrapeStarted = false;
  /** @type {ForumThreadLoadState} */
  let forumThreadLoadState = {
    loadedPages: 0,
    targetPages: FORUM_THREAD_CACHE_RECENT_PAGES,
    isLoading: false,
  };

  /**
   * @param {string | null | undefined} text
   * @returns {string}
   */
  function normalizeText(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }

  /**
   * @param {string | null | undefined} text
   * @returns {string}
   */
  function normalizeLayoutText(text) {
    return normalizeText(text)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  /**
   * @param {string | null | undefined} author
   * @returns {string}
   */
  function normalizeAuthorName(author) {
    return normalizeText(author).toLowerCase();
  }

  /**
   * @param {number} ms
   * @returns {Promise<void>}
   */
  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  /**
   * @param {Element} element
   * @returns {boolean}
   */
  function isVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);

    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== "none" &&
      style.visibility !== "hidden"
    );
  }

  /**
   * @param {string} href
   * @returns {URL | null}
   */
  function toUrl(href) {
    try {
      return new URL(href, location.href);
    } catch (_error) {
      return null;
    }
  }

  /**
   * @param {URL} url
   * @returns {string | null}
   */
  function getThreadId(url) {
    return url.searchParams.get("t");
  }

  /**
   * @param {URL} url
   * @returns {number}
   */
  function getPageNumber(url) {
    const page = Number(url.searchParams.get("page") || "1");
    return Number.isFinite(page) && page > 0 ? page : 1;
  }

  /**
   * @param {URL} [url]
   * @returns {string | null}
   */
  function getLocationPostHashId(url = new URL(location.href)) {
    const match = url.hash.match(/^#post(\d+)$/);
    return match ? match[1] : null;
  }

  /**
   * @returns {boolean}
   */
  function isThreadPage() {
    return (
      location.pathname.endsWith("/showthread.php") &&
      Boolean(getThreadId(new URL(location.href)))
    );
  }

  /**
   * @returns {boolean}
   */
  function isForumDisplayPage() {
    return location.pathname.endsWith("/forumdisplay.php");
  }

  /**
   * @param {URL} [url]
   * @returns {string}
   */
  function getForumId(url = new URL(location.href)) {
    return url.searchParams.get("f") || "";
  }

  /**
   * @param {URL} [url]
   * @returns {{ tag: string | null, page: number }}
   */
  function readForumQueryState(url = new URL(location.href)) {
    const tag = normalizeAuthorName(
      url.searchParams.get(FORUM_STATE_QUERY_PARAMS.tag),
    );
    const page = Number(url.searchParams.get("page") || "1");

    return {
      tag: tag || null,
      page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
    };
  }

  /**
   * @param {URL} url
   */
  function clearForumStateQueryParams(url) {
    for (const param of Object.values(FORUM_STATE_QUERY_PARAMS)) {
      url.searchParams.delete(param);
    }
  }

  /**
   * @param {string | null} type
   * @returns {type is GraphViewType}
   */
  function isGraphViewType(type) {
    return GRAPH_VIEW_TYPES.includes(type || "");
  }

  /**
   * @param {URL} url
   * @returns {boolean}
   */
  function isThreadUrl(url) {
    return (
      url.pathname.endsWith("/showthread.php") && Boolean(getThreadId(url))
    );
  }

  /**
   * @param {URL} url
   */
  function clearThreadStateQueryParams(url) {
    for (const param of Object.values(THREAD_STATE_QUERY_PARAMS)) {
      url.searchParams.delete(param);
    }

    for (const param of LEGACY_THREAD_STATE_QUERY_PARAMS) {
      url.searchParams.delete(param);
    }
  }

  /**
   * @param {URL} [url]
   * @returns {ThreadQueryState}
   */
  function readThreadQueryState(url = new URL(location.href)) {
    const emptyState = {
      graphView: null,
      pageFilter: null,
      authorFilter: null,
    };

    if (!isThreadUrl(url)) {
      return emptyState;
    }

    const graphType = url.searchParams.get(THREAD_STATE_QUERY_PARAMS.graphType);
    const graphRoot = url.searchParams.get(THREAD_STATE_QUERY_PARAMS.graphRoot);
    const graphRelated = url.searchParams.get(
      THREAD_STATE_QUERY_PARAMS.graphRelated,
    );
    const pageFilter = Number(
      url.searchParams.get(THREAD_STATE_QUERY_PARAMS.pageFilter) || "",
    );
    const authorFilter = normalizeAuthorName(
      url.searchParams.get(THREAD_STATE_QUERY_PARAMS.authorFilter),
    );

    const graphView =
      isGraphViewType(graphType) && graphRoot
        ? {
            type: graphType,
            rootPostId: graphRoot,
            relatedPostId: graphRelated || null,
          }
        : null;

    return {
      graphView,
      pageFilter:
        !graphView && Number.isFinite(pageFilter) && pageFilter > 0
          ? pageFilter
          : null,
      authorFilter: authorFilter || null,
    };
  }

  /**
   * @param {URL} url
   */
  function writeCurrentThreadStateQueryParams(url) {
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

    if (activeAuthorFilter) {
      url.searchParams.set(
        THREAD_STATE_QUERY_PARAMS.authorFilter,
        activeAuthorFilter,
      );
    }
  }

  /**
   * @param {URL} url
   * @param {"push" | "replace"} historyMode
   */
  function updateBrowserHistory(url, historyMode) {
    if (historyMode === "push" && url.href !== location.href) {
      window.history.pushState(window.history.state, "", url.href);
      return;
    }

    window.history.replaceState(window.history.state, "", url.href);
  }

  /**
   * @param {{ history?: "push" | "replace" }} [options]
   */
  function syncThreadStateUrl(options = {}) {
    if (!isThreadPage()) {
      return;
    }

    const url = new URL(location.href);
    writeCurrentThreadStateQueryParams(url);
    updateBrowserHistory(url, options.history || "replace");
  }

  /**
   * @returns {Promise<void>}
   */
  async function waitForDocumentReady() {
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

  /**
   * @returns {boolean}
   */
  function getSavedForumSidebarHidden() {
    const saved = localStorage.getItem(FORUM_SIDEBAR_STORAGE_KEY);

    return saved === null ? true : saved === "true";
  }

  /**
   * @param {boolean} hidden
   */
  function setSavedForumSidebarHidden(hidden) {
    forumSidebarHidden = hidden;
    localStorage.setItem(FORUM_SIDEBAR_STORAGE_KEY, String(hidden));
    applyForumSidebarVisibility();
  }

  /**
   * @param {unknown} value
   * @returns {value is PostRecord}
   */
  function isCachedPostRecord(value) {
    if (!value || typeof value !== "object") {
      return false;
    }

    const post = /** @type {PostRecord} */ (value);

    return (
      typeof post.id === "string" &&
      typeof post.html === "string" &&
      typeof post.author === "string" &&
      typeof post.postNumber === "string" &&
      Number.isFinite(post.pageNumber) &&
      Number.isFinite(post.pageIndex) &&
      Number.isFinite(post.originalIndex) &&
      Array.isArray(post.quotedPostIds)
    );
  }

  /**
   * @param {PostRecord} post
   * @returns {PostRecord}
   */
  function normalizeCachedPostRecord(post) {
    return {
      id: post.id,
      html: post.html,
      author: post.author,
      postNumber: post.postNumber,
      pageNumber: Number(post.pageNumber),
      pageIndex: Number(post.pageIndex),
      originalIndex: Number(post.originalIndex),
      quotedPostIds: post.quotedPostIds.filter(Boolean),
      replyingPostIds: [],
      isOriginalPoster: false,
      replyCount: 0,
    };
  }

  /**
   * @param {unknown} value
   * @returns {ThreadCacheRecord | null}
   */
  function normalizeThreadCacheRecord(value) {
    if (!value || typeof value !== "object") {
      return null;
    }

    const record = /** @type {ThreadCacheRecord} */ (value);

    if (
      record.version !== THREAD_CACHE_RECORD_VERSION ||
      typeof record.threadId !== "string" ||
      !Number.isFinite(record.totalPages) ||
      !Array.isArray(record.cachedPageNumbers) ||
      !Array.isArray(record.posts)
    ) {
      return null;
    }

    const posts = record.posts
      .filter(isCachedPostRecord)
      .map(normalizeCachedPostRecord);

    if (posts.length === 0) {
      return null;
    }

    return {
      version: record.version,
      threadId: record.threadId,
      totalPages: Number(record.totalPages),
      cachedPageNumbers: record.cachedPageNumbers
        .map(Number)
        .filter((pageNumber) => Number.isFinite(pageNumber) && pageNumber > 0),
      savedAt: Number(record.savedAt) || 0,
      byteSize: Number(record.byteSize) || estimateThreadCacheByteSize(record),
      posts,
    };
  }

  /**
   * @param {unknown} value
   * @returns {string | null}
   */
  function getRawThreadCacheRecordId(value) {
    if (!value || typeof value !== "object") {
      return null;
    }

    const threadId = /** @type {{ threadId?: unknown }} */ (value).threadId;

    return typeof threadId === "string" ? threadId : null;
  }

  /**
   * @param {unknown} value
   * @returns {ForumThreadRecord | null}
   */
  function normalizeForumThreadRecord(value) {
    if (!value || typeof value !== "object") {
      return null;
    }

    const record = /** @type {ForumThreadRecord} */ (value);

    if (
      record.version !== FORUM_THREAD_CACHE_RECORD_VERSION ||
      typeof record.id !== "string" ||
      typeof record.forumId !== "string" ||
      typeof record.url !== "string" ||
      typeof record.title !== "string" ||
      typeof record.html !== "string" ||
      !Array.isArray(record.tags)
    ) {
      return null;
    }

    return {
      version: record.version,
      id: record.id,
      forumId: record.forumId,
      url: record.url,
      title: normalizeText(record.title),
      tags: Array.from(
        new Set(
          record.tags.map((tag) => normalizeAuthorName(tag)).filter(Boolean),
        ),
      ),
      html: record.html,
      preview: normalizeText(record.preview),
      author: normalizeText(record.author),
      lastPostText: normalizeText(record.lastPostText),
      statsText: normalizeText(record.statsText),
      rowText: normalizeText(record.rowText),
      sourcePage: Number(record.sourcePage) || 1,
      sourceIndex: Number(record.sourceIndex) || 0,
      recentIndex: Number(record.recentIndex) || 0,
      lastSeen: Number(record.lastSeen) || 0,
      updatedAt: Number(record.updatedAt) || 0,
      isHidden: Boolean(record.isHidden),
      hiddenAt: Number(record.hiddenAt) || 0,
    };
  }

  /**
   * @returns {boolean}
   */
  function canUseThreadCache() {
    return typeof indexedDB !== "undefined";
  }

  /**
   * @returns {Promise<IDBDatabase>}
   */
  function openThreadCacheDb() {
    if (threadCacheDbPromise) {
      return threadCacheDbPromise;
    }

    if (!canUseThreadCache()) {
      return Promise.reject(new Error("IndexedDB no esta disponible"));
    }

    threadCacheDbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(
        THREAD_CACHE_DB_NAME,
        THREAD_CACHE_DB_VERSION,
      );

      request.onupgradeneeded = () => {
        const db = request.result;
        const store = db.objectStoreNames.contains(THREAD_CACHE_STORE_NAME)
          ? request.transaction?.objectStore(THREAD_CACHE_STORE_NAME)
          : db.createObjectStore(THREAD_CACHE_STORE_NAME, {
              keyPath: "threadId",
            });

        if (store && !store.indexNames.contains("savedAt")) {
          store.createIndex("savedAt", "savedAt", { unique: false });
        }

        const forumStore = db.objectStoreNames.contains(
          FORUM_THREAD_CACHE_STORE_NAME,
        )
          ? request.transaction?.objectStore(FORUM_THREAD_CACHE_STORE_NAME)
          : db.createObjectStore(FORUM_THREAD_CACHE_STORE_NAME, {
              keyPath: "id",
            });

        if (forumStore && !forumStore.indexNames.contains("forumId")) {
          forumStore.createIndex("forumId", "forumId", { unique: false });
        }

        if (forumStore && !forumStore.indexNames.contains("lastSeen")) {
          forumStore.createIndex("lastSeen", "lastSeen", { unique: false });
        }

        if (forumStore && !forumStore.indexNames.contains("isHidden")) {
          forumStore.createIndex("isHidden", "isHidden", { unique: false });
        }

        if (forumStore && !forumStore.indexNames.contains("hiddenAt")) {
          forumStore.createIndex("hiddenAt", "hiddenAt", { unique: false });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };

      request.onerror = () => {
        threadCacheDbPromise = null;
        reject(request.error || new Error("No se pudo abrir IndexedDB"));
      };

      request.onblocked = () => {
        console.warn(
          "Forocoches Premium: otra pestana esta bloqueando la cache",
        );
      };
    });

    return threadCacheDbPromise;
  }

  /**
   * @template T
   * @param {IDBRequest<T>} request
   * @returns {Promise<T>}
   */
  function waitForIdbRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        reject(request.error || new Error("Fallo una operacion de IndexedDB"));
      };
    });
  }

  /**
   * @param {IDBTransaction} transaction
   * @returns {Promise<void>}
   */
  function waitForIdbTransaction(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => {
        reject(
          transaction.error || new Error("Fallo una transaccion de IndexedDB"),
        );
      };
      transaction.onabort = () => {
        reject(
          transaction.error ||
            new Error("Se aborto una transaccion de IndexedDB"),
        );
      };
    });
  }

  /**
   * @param {unknown} value
   * @returns {number}
   */
  function getStringByteSize(value) {
    const text = String(value || "");

    if (typeof TextEncoder !== "undefined") {
      return new TextEncoder().encode(text).byteLength;
    }

    return text.length * 2;
  }

  /**
   * @param {unknown} value
   * @returns {number}
   */
  function estimateThreadCacheByteSize(value) {
    try {
      return getStringByteSize(JSON.stringify(value));
    } catch (error) {
      console.warn("Forocoches Premium: no se pudo medir la cache", error);
      return 0;
    }
  }

  /**
   * @param {ThreadCacheRecord} cache
   * @returns {boolean}
   */
  function isThreadCacheExpired(cache) {
    return Date.now() - cache.savedAt > THREAD_CACHE_MAX_AGE_MS;
  }

  function clearLegacyThreadCaches() {
    try {
      for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const key = localStorage.key(index);

        if (key?.startsWith(THREAD_CACHE_LEGACY_STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn(
        "Forocoches Premium: no se pudo limpiar la cache antigua",
        error,
      );
    }
  }

  /**
   * @param {string} threadId
   * @returns {Promise<void>}
   */
  async function deleteThreadCacheRecord(threadId) {
    if (!canUseThreadCache()) {
      return;
    }

    const db = await openThreadCacheDb();
    const transaction = db.transaction(THREAD_CACHE_STORE_NAME, "readwrite");
    transaction.objectStore(THREAD_CACHE_STORE_NAME).delete(threadId);
    await waitForIdbTransaction(transaction);
  }

  /**
   * @returns {Promise<unknown[]>}
   */
  async function getAllThreadCacheRecords() {
    const db = await openThreadCacheDb();
    const transaction = db.transaction(THREAD_CACHE_STORE_NAME, "readonly");
    const records = await waitForIdbRequest(
      transaction.objectStore(THREAD_CACHE_STORE_NAME).getAll(),
    );
    await waitForIdbTransaction(transaction);

    return Array.isArray(records) ? records : [];
  }

  /**
   * @param {string[]} threadIds
   * @returns {Promise<void>}
   */
  async function deleteThreadCacheRecords(threadIds) {
    if (!threadIds.length) {
      return;
    }

    const db = await openThreadCacheDb();
    const transaction = db.transaction(THREAD_CACHE_STORE_NAME, "readwrite");
    const store = transaction.objectStore(THREAD_CACHE_STORE_NAME);
    threadIds.forEach((threadId) => store.delete(threadId));
    await waitForIdbTransaction(transaction);
  }

  /**
   * @returns {Promise<void>}
   */
  async function cleanupThreadCache() {
    clearLegacyThreadCaches();

    if (!canUseThreadCache()) {
      return;
    }

    try {
      const rawRecords = await getAllThreadCacheRecords();
      /** @type {ThreadCacheRecord[]} */
      const records = [];
      /** @type {Set<string>} */
      const threadIdsToDelete = new Set();

      rawRecords.forEach((rawRecord) => {
        const record = normalizeThreadCacheRecord(rawRecord);
        const rawThreadId = getRawThreadCacheRecordId(rawRecord);

        if (!record) {
          if (rawThreadId) {
            threadIdsToDelete.add(rawThreadId);
          }
          return;
        }

        if (isThreadCacheExpired(record)) {
          threadIdsToDelete.add(record.threadId);
          return;
        }

        records.push(record);
      });

      let totalBytes = records.reduce(
        (total, record) =>
          total + (record.byteSize || estimateThreadCacheByteSize(record)),
        0,
      );

      records
        .slice()
        .sort((left, right) => left.savedAt - right.savedAt)
        .forEach((record) => {
          if (totalBytes <= THREAD_CACHE_MAX_BYTES) {
            return;
          }

          threadIdsToDelete.add(record.threadId);
          totalBytes -= record.byteSize || estimateThreadCacheByteSize(record);
        });

      await deleteThreadCacheRecords(Array.from(threadIdsToDelete));
    } catch (error) {
      console.warn("Forocoches Premium: no se pudo limpiar la cache", error);
    }
  }

  /**
   * @returns {Promise<ThreadCacheRecord | null>}
   */
  async function readCurrentThreadCache() {
    const threadId = getThreadId(new URL(location.href));

    if (!threadId || !canUseThreadCache()) {
      return null;
    }

    try {
      const db = await openThreadCacheDb();
      const transaction = db.transaction(THREAD_CACHE_STORE_NAME, "readonly");
      const rawRecord = await waitForIdbRequest(
        transaction.objectStore(THREAD_CACHE_STORE_NAME).get(threadId),
      );
      await waitForIdbTransaction(transaction);

      const record = normalizeThreadCacheRecord(rawRecord);

      if (!record) {
        return null;
      }

      if (isThreadCacheExpired(record)) {
        await deleteThreadCacheRecord(threadId);
        return null;
      }

      return record;
    } catch (error) {
      console.warn("Forocoches Premium: no se pudo leer la cache", error);
      return null;
    }
  }

  /**
   * @param {ThreadCacheRecord} cache
   * @returns {boolean}
   */
  function isCompleteThreadCache(cache) {
    const cachedPages = new Set(cache.cachedPageNumbers);

    return (
      cache.totalPages > 0 &&
      cachedPages.size >= cache.totalPages &&
      cache.posts.length > 0
    );
  }

  /**
   * @param {PostRecord[]} posts
   * @param {number} totalPages
   * @param {Set<number>} cachedPageNumbers
   */
  async function writeCurrentThreadCache(posts, totalPages, cachedPageNumbers) {
    const threadId = getThreadId(new URL(location.href));

    if (
      !threadId ||
      !canUseThreadCache() ||
      posts.length === 0 ||
      cachedPageNumbers.size === 0
    ) {
      return;
    }

    /** @type {ThreadCacheRecord} */
    const record = {
      version: THREAD_CACHE_RECORD_VERSION,
      threadId,
      totalPages,
      cachedPageNumbers: Array.from(cachedPageNumbers).sort(
        (left, right) => left - right,
      ),
      savedAt: Date.now(),
      byteSize: 0,
      posts: posts.map(normalizeCachedPostRecord),
    };
    record.byteSize = estimateThreadCacheByteSize(record);

    if (record.byteSize > THREAD_CACHE_MAX_BYTES) {
      console.warn(
        "Forocoches Premium: este hilo supera el limite de cache configurado",
      );
      return;
    }

    try {
      await cleanupThreadCache();
      const db = await openThreadCacheDb();
      const transaction = db.transaction(THREAD_CACHE_STORE_NAME, "readwrite");
      transaction.objectStore(THREAD_CACHE_STORE_NAME).put(record);
      await waitForIdbTransaction(transaction);
    } catch (error) {
      console.warn("Forocoches Premium: no se pudo guardar la cache", error);
    }
  }

  /**
   * @returns {Promise<void>}
   */
  async function clearCurrentThreadCache() {
    const threadId = getThreadId(new URL(location.href));

    clearLegacyThreadCaches();

    if (!threadId) {
      return;
    }

    try {
      await deleteThreadCacheRecord(threadId);
    } catch (error) {
      console.warn("Forocoches Premium: no se pudo borrar la cache", error);
    }
  }

  /**
   * @returns {Promise<ForumThreadRecord[]>}
   */
  async function readForumThreadCacheRecords() {
    if (!canUseThreadCache()) {
      return [];
    }

    try {
      const db = await openThreadCacheDb();
      const transaction = db.transaction(
        FORUM_THREAD_CACHE_STORE_NAME,
        "readonly",
      );
      const rawRecords = await waitForIdbRequest(
        transaction.objectStore(FORUM_THREAD_CACHE_STORE_NAME).getAll(),
      );
      await waitForIdbTransaction(transaction);

      return Array.isArray(rawRecords)
        ? rawRecords
            .map(normalizeForumThreadRecord)
            .filter((record) => record !== null)
        : [];
    } catch (error) {
      console.warn(
        "Forocoches Premium: no se pudo leer la cache del foro",
        error,
      );
      return [];
    }
  }

  /**
   * @param {ForumThreadRecord[]} records
   * @returns {Promise<void>}
   */
  async function writeForumThreadCacheRecords(records) {
    if (!canUseThreadCache() || records.length === 0) {
      return;
    }

    try {
      const db = await openThreadCacheDb();
      const transaction = db.transaction(
        FORUM_THREAD_CACHE_STORE_NAME,
        "readwrite",
      );
      const store = transaction.objectStore(FORUM_THREAD_CACHE_STORE_NAME);

      for (const record of records) {
        store.put(record);
      }

      await waitForIdbTransaction(transaction);
    } catch (error) {
      console.warn(
        "Forocoches Premium: no se pudo guardar la cache del foro",
        error,
      );
    }
  }

  /**
   * @param {string[]} threadIds
   * @returns {Promise<void>}
   */
  async function deleteForumThreadCacheRecords(threadIds) {
    if (!canUseThreadCache() || threadIds.length === 0) {
      return;
    }

    const db = await openThreadCacheDb();
    const transaction = db.transaction(
      FORUM_THREAD_CACHE_STORE_NAME,
      "readwrite",
    );
    const store = transaction.objectStore(FORUM_THREAD_CACHE_STORE_NAME);
    threadIds.forEach((threadId) => store.delete(threadId));
    await waitForIdbTransaction(transaction);
  }

  /**
   * @returns {Promise<void>}
   */
  async function cleanupForumThreadCache() {
    if (!canUseThreadCache()) {
      return;
    }

    try {
      const records = await readForumThreadCacheRecords();

      if (records.length <= FORUM_THREAD_CACHE_MAX_RECORDS) {
        return;
      }

      const idsToDelete = records
        .slice()
        .sort((left, right) => {
          if (left.isHidden !== right.isHidden) {
            return left.isHidden ? 1 : -1;
          }

          const leftHasTags = left.tags.length > 0;
          const rightHasTags = right.tags.length > 0;

          if (leftHasTags !== rightHasTags) {
            return leftHasTags ? 1 : -1;
          }

          if (left.lastSeen !== right.lastSeen) {
            return left.lastSeen - right.lastSeen;
          }

          return left.recentIndex - right.recentIndex;
        })
        .slice(0, records.length - FORUM_THREAD_CACHE_MAX_RECORDS)
        .map((record) => record.id);

      await deleteForumThreadCacheRecords(idsToDelete);
    } catch (error) {
      console.warn(
        "Forocoches Premium: no se pudo limpiar la cache del foro",
        error,
      );
    }
  }

  function ensureStyle() {
    const existing = document.getElementById(STYLE_ID);
    const style =
      existing instanceof HTMLStyleElement
        ? existing
        : document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${THREAD_SUMMARY_ID} {
        align-items: center;
        background: #f7faff;
        border: 1px solid #b7d1ff;
        border-radius: 4px;
        box-sizing: border-box;
        color: #17324d;
        display: flex;
        flex-wrap: nowrap;
        font: 11px/1.3 Verdana, Arial, sans-serif;
        gap: 8px;
        margin: 6px auto;
        max-width: 100%;
        min-height: 27px;
        overflow: hidden;
        padding: 4px 6px;
      }

      #${THREAD_SUMMARY_ID}[hidden] {
        display: none !important;
      }

      #${THREAD_SUMMARY_ID}.fc-premium-summary-stuck {
        box-shadow: 0 4px 12px rgba(23, 50, 77, 0.16);
      }

      #${THREAD_SUMMARY_ID} strong {
        color: #0b57d0;
      }

      #${THREAD_PROGRESS_ID} {
        align-items: center;
        color: #3c4043;
        display: inline-flex;
        flex: 0 0 auto;
        gap: 5px;
        white-space: nowrap;
      }

      .fc-premium-spinner {
        animation: fc-premium-spin 720ms linear infinite;
        border: 2px solid #c7d8ff;
        border-radius: 999px;
        border-top-color: #0b57d0;
        display: inline-block;
        height: 12px;
        width: 12px;
      }

      @keyframes fc-premium-spin {
        to {
          transform: rotate(360deg);
        }
      }

      #${SHORTCUT_HELP_CONTAINER_ID} {
        box-sizing: border-box;
        display: flex;
        justify-content: flex-end;
        margin: 4px 8px 0;
        min-height: 23px;
        position: relative;
        z-index: 50;
      }

      #${SHORTCUT_HELP_BUTTON_ID} {
        align-items: center;
        background: rgba(247, 250, 255, 0.78);
        border: 1px solid rgba(95, 143, 199, 0.45);
        border-radius: 999px;
        box-shadow: 0 1px 2px rgba(23, 50, 77, 0.12);
        box-sizing: border-box;
        color: rgba(23, 50, 77, 0.72);
        cursor: pointer;
        display: inline-flex;
        font: 700 12px/1 Verdana, Arial, sans-serif;
        height: 21px;
        justify-content: center;
        opacity: 0.45;
        padding: 0;
        width: 21px;
      }

      #${SHORTCUT_HELP_BUTTON_ID}:hover,
      #${SHORTCUT_HELP_BUTTON_ID}:focus-visible,
      #${SHORTCUT_HELP_BUTTON_ID}[aria-expanded="true"] {
        background: #f7faff;
        border-color: #5f8fc7;
        color: #17324d;
        opacity: 0.95;
        outline: none;
      }

      #${SHORTCUT_HELP_POPOVER_ID} {
        background: #f7faff;
        border: 1px solid #5f8fc7;
        box-shadow: 2px 2px 0 rgba(23, 50, 77, 0.18);
        box-sizing: border-box;
        color: #17324d;
        font: 11px/1.35 Verdana, Arial, sans-serif;
        max-width: calc(100vw - 16px);
        padding: 8px;
        position: absolute;
        right: 0;
        top: 25px;
        width: 310px;
        z-index: 51;
      }

      #${SHORTCUT_HELP_POPOVER_ID}[hidden] {
        display: none !important;
      }

      .fc-premium-shortcut-help-title {
        border-bottom: 1px solid #b7d1ff;
        font-weight: 700;
        margin-bottom: 6px;
        padding-bottom: 5px;
      }

      .fc-premium-shortcut-help-row {
        align-items: center;
        display: flex;
        gap: 8px;
        justify-content: space-between;
        padding: 3px 0;
      }

      .fc-premium-shortcut-help-keys {
        display: inline-flex;
        flex: 0 0 auto;
        gap: 3px;
      }

      .fc-premium-shortcut-help-key {
        background: #fff;
        border: 1px solid #9db7e5;
        border-radius: 2px;
        box-shadow: inset 0 -1px 0 #d8e4fb;
        color: #17324d;
        font: 700 10px/1 Verdana, Arial, sans-serif;
        min-width: 16px;
        padding: 3px 5px;
        text-align: center;
        white-space: nowrap;
      }

      .fc-premium-shortcut-help-description {
        min-width: 0;
        text-align: right;
      }

      #${THREAD_CONTROLS_ID} {
        display: flex;
        flex: 0 0 auto;
        gap: 5px;
        margin-left: auto;
      }

      #${THREAD_CONTROLS_ID} button {
        background: #fff;
        border: 1px solid #b7d1ff;
        border-radius: 4px;
        color: #17324d;
        cursor: pointer;
        font: 700 10px/1 Verdana, Arial, sans-serif;
        padding: 4px 6px;
      }

      #${THREAD_CONTROLS_ID} button:disabled {
        color: #80868b;
        cursor: default;
        opacity: 0.72;
      }

      #${THREAD_CONTROLS_ID}.fc-premium-thread-toolbar-controls {
        display: table-cell;
        margin-left: 0;
        white-space: nowrap;
      }

      #${THREAD_CONTROLS_ID}.fc-premium-thread-toolbar-controls button {
        background: transparent;
        border: 0;
        border-radius: 0;
        color: inherit;
        cursor: pointer;
        font: inherit;
        font-weight: 700;
        padding: 0 3px;
      }

      #${THREAD_CONTROLS_ID}.fc-premium-thread-toolbar-controls button:hover {
        text-decoration: underline;
      }

      #${THREAD_CONTROLS_ID}.fc-premium-thread-toolbar-controls button:disabled {
        cursor: default;
        opacity: 0.45;
        text-decoration: none;
      }

      #${THREAD_CONTROLS_ID}.fc-premium-thread-toolbar-controls #${THREAD_PROGRESS_ID} {
        margin-left: 8px;
        vertical-align: middle;
      }

      .fc-premium-thread-header-cell {
        text-align: left;
      }

      .fc-premium-thread-header-layout {
        align-items: center;
        display: flex;
        gap: 10px;
        justify-content: space-between;
        min-height: 20px;
        width: 100%;
      }

      .fc-premium-thread-header-breadcrumbs {
        min-width: 0;
        overflow: hidden;
      }

      .fc-premium-thread-header-breadcrumbs table {
        width: auto !important;
      }

      .fc-premium-thread-header-breadcrumbs .navbar {
        font-size: 11px !important;
      }

      .fc-premium-thread-header-breadcrumbs strong {
        font-size: 11px;
        font-weight: 700;
      }

      .fc-premium-thread-header-search {
        align-items: center;
        display: flex;
        flex: 0 0 auto;
        gap: 6px;
        white-space: nowrap;
      }

      .fc-premium-thread-header-search-form {
        align-items: center;
        display: inline-flex;
        gap: 3px;
        margin: 0;
      }

      .fc-premium-thread-header-search-form .cfield {
        box-sizing: border-box;
        font: 11px Verdana, Arial, sans-serif;
        height: 19px;
        max-width: 24vw;
        width: 190px;
      }

      .fc-premium-thread-header-search-form .cbutton {
        font: 700 11px Verdana, Arial, sans-serif;
        height: 20px;
        padding: 0 6px;
      }

      #${TOP_TAGS_ID} {
        align-items: center;
        background: #f7faff;
        border: 1px solid #b7d1ff;
        border-radius: 6px;
        box-sizing: border-box;
        color: #17324d;
        display: flex;
        flex-wrap: wrap;
        font: 12px/1.4 Verdana, Arial, sans-serif;
        gap: 6px;
        margin: 10px auto;
        padding: 8px 10px;
      }

      #${TOP_TAGS_ID} > span:first-child {
        font-weight: 700;
      }

      #${TOP_TAGS_ID} .fc-premium-tag-chip[aria-pressed="true"] {
        box-shadow: 0 0 0 2px #0b57d0;
      }

      #${TOP_TAGS_ID} button {
        background: #fff;
        border: 1px solid #9db7e5;
        border-radius: 3px;
        color: #17324d;
        cursor: pointer;
        font: 700 11px/1 Verdana, Arial, sans-serif;
        padding: 4px 6px;
      }

      #${TOP_TAGS_ID} button[aria-current="page"] {
        background: #5f8fc7;
        border-color: #3f70a8;
        color: #fff;
        cursor: default;
      }

      #${FORUM_CONTROLS_ROW_ID} {
        margin-bottom: 3px !important;
      }

      #${FORUM_CONTROLS_ROW_ID} td {
        vertical-align: middle;
      }

      #${FORUM_CONTROLS_ROW_ID} .fc-premium-forum-sidebar-toggle-cell,
      #${FORUM_CONTROLS_ROW_ID} .fc-premium-forum-new-thread-cell {
        padding-right: 6px;
        white-space: nowrap;
        width: 1%;
      }

      #${FORUM_CONTROLS_ROW_ID} .fc-premium-forum-search-cell {
        text-align: left;
        white-space: nowrap;
        width: 100%;
      }

      #${FORUM_CONTROLS_ROW_ID} .fc-premium-forum-pager-cell {
        text-align: right;
        white-space: nowrap;
        width: 1%;
      }

      #${FORUM_CONTROLS_ROW_ID} .fc-premium-thread-header-search-form .cfield {
        max-width: 24vw;
        width: 190px;
      }

      #${FORUM_LOADING_STATUS_ID} {
        align-items: center;
        color: #3c4043;
        display: inline-flex;
        font: 11px/1.2 Verdana, Arial, sans-serif;
        gap: 5px;
        margin-left: 8px;
        min-width: 138px;
        vertical-align: middle;
        white-space: nowrap;
      }

      #${FORUM_LOADING_STATUS_ID}[data-fc-premium-loading="false"] {
        visibility: hidden;
      }

      #${FORUM_SIDEBAR_TOGGLE_BAR_ID} {
        align-items: center;
        background: #f7faff;
        border: 1px solid #b7d1ff;
        border-radius: 6px;
        box-sizing: border-box;
        color: #17324d;
        display: flex;
        flex-wrap: wrap;
        font: 12px/1.4 Verdana, Arial, sans-serif;
        gap: 8px;
        margin: 0 0 10px;
        padding: 8px 10px;
      }

      #${FORUM_SIDEBAR_TOGGLE_ID} {
        background: #e6e9ed;
        border: 1px solid #7f8c99;
        border-left-color: #f8f8f8;
        border-radius: 2px;
        border-top-color: #f8f8f8;
        box-shadow: inset -1px -1px 0 #bcc3ca;
        color: #1f3550;
        cursor: pointer;
        font: 700 11px/1 Verdana, Arial, sans-serif;
        padding: 3px 7px 4px;
      }

      #${FORUM_SIDEBAR_TOGGLE_ID}:hover {
        background: #f2f5f8;
        color: #0b57d0;
      }

      html.${MODAL_OPEN_CLASS},
      body.${MODAL_OPEN_CLASS} {
        overflow: hidden !important;
        overscroll-behavior: none;
      }

      #${HIDDEN_THREADS_MODAL_ID} {
        align-items: center;
        background: rgba(0, 0, 0, 0.48);
        box-sizing: border-box;
        display: flex;
        inset: 0;
        justify-content: center;
        padding: 20px;
        position: fixed;
        z-index: 2147483645;
      }

      #${HIDDEN_THREADS_MODAL_ID}[hidden] {
        display: none !important;
      }

      .fc-premium-hidden-threads-dialog {
        background: #f7faff;
        border: 1px solid #555576;
        box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.28);
        box-sizing: border-box;
        color: #17324d;
        display: flex;
        flex-direction: column;
        font: 11px/1.35 Verdana, Arial, sans-serif;
        height: calc(100vh - 40px);
        max-width: calc(100vw - 40px);
        overflow: hidden;
        width: 860px;
      }

      .fc-premium-hidden-threads-header {
        align-items: center;
        background: #555576;
        color: #fff;
        display: flex;
        font-weight: 700;
        justify-content: space-between;
        padding: 6px 8px;
      }

      .fc-premium-hidden-threads-header button,
      .fc-premium-hidden-thread-restore {
        background: #e6e9ed;
        border: 1px solid #7f8c99;
        border-left-color: #f8f8f8;
        border-radius: 2px;
        border-top-color: #f8f8f8;
        box-shadow: inset -1px -1px 0 #bcc3ca;
        color: #1f3550;
        cursor: pointer;
        font: 700 11px/1 Verdana, Arial, sans-serif;
        padding: 3px 7px 4px;
      }

      .fc-premium-hidden-threads-header button:hover,
      .fc-premium-hidden-thread-restore:hover {
        background: #f2f5f8;
        color: #0b57d0;
      }

      #${HIDDEN_THREADS_MODAL_BODY_ID} {
        flex: 1 1 auto;
        min-height: 0;
        overscroll-behavior: contain;
        overflow: auto;
        padding: 8px;
      }

      .fc-premium-hidden-threads-table {
        background: #555576;
        border-collapse: separate;
        border-spacing: 1px;
        width: 100%;
      }

      .fc-premium-hidden-threads-table th {
        background: #d5e6ee;
        color: #17324d;
        font-weight: 700;
        padding: 5px;
        text-align: left;
        white-space: nowrap;
      }

      .fc-premium-hidden-threads-table td {
        background: #f1f1f1;
        padding: 5px;
        vertical-align: top;
      }

      .fc-premium-hidden-threads-table tr:nth-child(even) td {
        background: #fff;
      }

      .fc-premium-hidden-thread-title {
        font-weight: 700;
      }

      .fc-premium-hidden-thread-meta {
        color: #3c4043;
        font-size: 10px;
        margin-top: 3px;
      }

      .fc-premium-hidden-threads-empty {
        background: #fff;
        border: 1px solid #b7d1ff;
        padding: 14px;
        text-align: center;
      }

      .fc-premium-quote-actions {
        align-items: center;
        display: inline-flex;
        flex-wrap: nowrap;
        gap: 3px;
        margin-left: 5px;
        vertical-align: middle;
        white-space: nowrap;
      }

      .fc-premium-quote-actions button {
        background: #e6e9ed;
        border: 1px solid #7f8c99;
        border-left-color: #f8f8f8;
        border-radius: 2px;
        border-top-color: #f8f8f8;
        box-shadow: inset -1px -1px 0 #bcc3ca;
        color: #1f3550;
        cursor: pointer;
        font: 700 9px/1.1 Verdana, Arial, sans-serif;
        padding: 1px 5px 2px;
      }

      .fc-premium-quote-actions button:hover {
        background: #f2f5f8;
        color: #0b57d0;
      }

      tr[${HIDDEN_THREAD_ATTRIBUTE}] {
        display: none !important;
      }

      [${FORUM_LAYOUT_HIDDEN_ATTRIBUTE}] {
        display: none !important;
      }

      .fc-premium-post-wrapper[${HIDDEN_POST_ATTRIBUTE}] {
        display: none !important;
      }

      .fc-premium-post-wrapper[${HIDDEN_POST_PAGE_ATTRIBUTE}] {
        display: none !important;
      }

      .fc-premium-post-wrapper {
        border-radius: 6px;
        margin: 0 0 12px;
        position: relative;
        transition: transform 160ms ease;
      }

      .fc-premium-post-footer-row {
        display: none !important;
      }

      .fc-premium-post-reply-actions {
        align-items: center;
        bottom: 7px;
        display: flex;
        flex-wrap: nowrap;
        gap: 3px;
        line-height: 1;
        position: absolute;
        right: 9px;
        white-space: nowrap;
        z-index: 5;
      }

      .fc-premium-post-reply-actions a {
        display: inline-flex;
        margin: 0 !important;
      }

      .fc-premium-post-reply-actions img {
        display: block;
      }

      .fc-premium-post-wrapper[data-fc-premium-reply-indent] {
        margin-left: 28px;
      }

      .fc-premium-reply-badge {
        border-right: 1px solid #9aa0a6;
        color: #3c4043;
        display: inline-block;
        float: right;
        font: 700 9px/1 Verdana, Arial, sans-serif;
        margin-left: 8px;
        margin-right: 7px;
        padding-right: 7px;
        vertical-align: baseline;
        white-space: nowrap;
      }

      .fc-premium-author-filter-button {
        cursor: pointer;
      }

      .fc-premium-author-filter-button {
        background: #fff;
        border: 1px solid #b7d1ff;
        border-radius: 999px;
        color: #0b57d0;
        display: inline-block;
        font: 700 10px/1 Verdana, Arial, sans-serif;
        margin-left: 5px;
        padding: 3px 6px;
        vertical-align: 1px;
      }

      .fc-premium-author-filter-button:hover {
        border-color: #0b57d0;
      }

      .fc-premium-reply-badge a {
        color: inherit;
        font-weight: 700;
        margin-left: 3px;
        text-decoration: underline;
        text-underline-offset: 2px;
      }

      .fc-premium-original-position {
        color: #17324d;
        font-weight: 400;
        margin-left: 6px;
        opacity: 0.8;
      }

      .fc-premium-reply-badge .fc-premium-original-position {
        color: inherit;
        margin-left: 4px;
        opacity: 0.72;
      }

      .fc-premium-reply-badge button {
        background: transparent;
        border: 0;
        border-radius: 0;
        color: inherit;
        cursor: pointer;
        font: 700 9px/1 Verdana, Arial, sans-serif;
        margin-left: 4px;
        padding: 0;
        text-decoration: underline;
        text-underline-offset: 2px;
      }

      .fc-premium-reply-badge button:hover {
        color: #0b57d0;
      }

      .fc-premium-post-date-cell {
        white-space: nowrap;
        width: 100%;
      }

      .fc-premium-post-number-cell {
        text-align: right !important;
        width: 1%;
        white-space: nowrap;
      }

      .fc-premium-header-author {
        color: #3c4043;
        display: none;
        font: 700 10px/1 Verdana, Arial, sans-serif;
        margin-left: 6px;
        position: relative;
        white-space: nowrap;
      }

      .fc-premium-header-author::after {
        content: "";
        display: none;
        height: 9px;
        left: -8px;
        position: absolute;
        right: -8px;
        top: 100%;
      }

      .fc-premium-header-author:hover::after,
      .fc-premium-header-author:focus-within::after {
        display: block;
      }

      .fc-premium-header-author > a {
        color: #0b57d0;
        text-decoration: none;
      }

      .fc-premium-header-author > a:hover {
        text-decoration: underline;
        text-underline-offset: 2px;
      }

      .fc-premium-author-hover-card {
        background: #f0f0f0;
        border: 1px solid #8d98a3;
        border-left-color: #ffffff;
        border-radius: 2px;
        border-top-color: #ffffff;
        box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.22);
        color: #202124;
        display: none;
        font: 11px/1.4 Verdana, Arial, sans-serif;
        left: 0;
        max-width: min(320px, 80vw);
        min-width: 210px;
        padding: 8px 10px;
        position: absolute;
        text-align: left;
        top: calc(100% + 1px);
        white-space: normal;
        z-index: 9999;
      }

      .fc-premium-header-author:hover .fc-premium-author-hover-card,
      .fc-premium-header-author:focus-within .fc-premium-author-hover-card {
        display: block;
      }

      .fc-premium-author-hover-card strong {
        color: #17324d;
        display: block;
        font-size: 12px;
        margin-bottom: 4px;
      }

      .fc-premium-author-hover-card .fc-premium-author-avatar {
        border: 1px solid #9aa3ad;
        border-radius: 2px;
        display: block;
        height: 58px;
        margin: 0 0 7px;
        max-width: 92px;
        object-fit: cover;
        width: auto;
      }

      .fc-premium-author-hover-card span {
        display: block;
        margin-top: 2px;
      }

      .fc-premium-author-card-actions {
        border-top: 1px solid #c0c6cc;
        display: flex !important;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 7px !important;
        padding-top: 6px;
      }

      .fc-premium-author-status,
      .fc-premium-author-report-link {
        align-items: center;
        color: #202124;
        display: inline-flex !important;
        gap: 4px;
        margin: 0 !important;
        text-decoration: none;
      }

      .fc-premium-author-report-link:hover {
        color: #0b57d0;
        text-decoration: underline;
      }

      .fc-premium-author-status span,
      .fc-premium-author-report-link span {
        display: inline;
        margin: 0;
      }

      a[data-fc-premium-quote-target] {
        outline-offset: 2px;
      }

      a[data-fc-premium-quote-target]:focus-visible {
        outline: 2px solid #1a73e8;
      }

      [data-fc-premium-quote-block] {
        transition: opacity 140ms ease;
      }

      .fc-premium-tag-chip {
        background: var(--fc-premium-tag-bg);
        border: 1px solid var(--fc-premium-tag-border);
        border-radius: 999px;
        color: var(--fc-premium-tag-color);
        display: inline-block;
        font: 700 10px/1 Verdana, Arial, sans-serif;
        margin: 0 2px;
        padding: 3px 6px;
        text-transform: uppercase;
        vertical-align: 1px;
        white-space: nowrap;
      }

      .fc-premium-tag-chip[role="button"] {
        cursor: pointer;
      }

      [${SELECTED_ATTRIBUTE}] {
        border-radius: 6px;
        outline: 2px solid #1a73e8 !important;
        outline-offset: 3px;
        transition: outline-offset 160ms ease;
      }

      tr[${SELECTED_ATTRIBUTE}] > td {
        background: #eef5ff !important;
      }

      body.${COMPACT_MODE_CLASS} #posts table[id^="post"] {
        table-layout: auto !important;
      }

      body.${COMPACT_MODE_CLASS} #posts .fc-premium-author-cell {
        display: none !important;
      }

      body.${COMPACT_MODE_CLASS} #posts table[id^="post"] td {
        padding-bottom: 4px !important;
        padding-top: 4px !important;
      }

      body.${COMPACT_MODE_CLASS} .fc-premium-post-wrapper div[id^="edit"] > br,
      body.${COMPACT_MODE_CLASS} .fc-premium-post-wrapper div[id^="edit"] > table.cajasprin {
        display: none !important;
      }

      body.${COMPACT_MODE_CLASS} .fc-premium-post-wrapper {
        margin-bottom: 6px;
      }

      body.${COMPACT_MODE_CLASS} .fc-premium-post-wrapper[data-fc-premium-reply-indent] {
        margin-left: 18px;
      }

      #${POSTS_SELECTOR.slice(1)}[data-fc-premium-graph-view="quoted-by"] .fc-premium-post-wrapper[data-fc-premium-reply-indent] {
        margin-left: 34px;
      }

      @media (max-width: 700px) {
        .fc-premium-post-wrapper[data-fc-premium-reply-indent] {
          margin-left: 14px;
        }

        #${POSTS_SELECTOR.slice(1)}[data-fc-premium-graph-view="quoted-by"] .fc-premium-post-wrapper[data-fc-premium-reply-indent] {
          margin-left: 24px;
        }
      }

      body.${COMPACT_MODE_CLASS} #${THREAD_SUMMARY_ID} {
        font-size: 11px;
        margin: 6px auto;
        padding: 6px 8px;
      }

      body.${COMPACT_MODE_CLASS} #${TOP_TAGS_ID},
      body.${COMPACT_MODE_CLASS} #${FORUM_SIDEBAR_TOGGLE_BAR_ID} {
        margin-bottom: 5px;
        margin-top: 5px;
        padding: 5px 8px;
      }

      body.${COMPACT_MODE_CLASS} #${THREAD_CONTROLS_ID},
      body.${COMPACT_MODE_CLASS} #${THREAD_PROGRESS_ID} {
        gap: 4px;
      }

      body.${COMPACT_MODE_CLASS} #posts table[id^="post"] {
        font-size: 12px !important;
      }

      body.${COMPACT_MODE_CLASS} #posts table[id^="post"] .alt1,
      body.${COMPACT_MODE_CLASS} #posts table[id^="post"] .alt2 {
        padding-left: 6px !important;
        padding-right: 6px !important;
      }

      body.${COMPACT_MODE_CLASS} #threadslist td {
        padding-bottom: 2px !important;
        padding-top: 2px !important;
      }

      body.${COMPACT_MODE_CLASS} #threadslist,
      body.${COMPACT_MODE_CLASS} #threadslist .mfont,
      body.${COMPACT_MODE_CLASS} #threadslist .smallfont {
        font-size: 12px !important;
      }

      body.${COMPACT_MODE_CLASS} .fc-premium-header-author {
        display: inline-block;
      }

      body.${COMPACT_MODE_CLASS} table.tborder:has(td.navbar),
      body.${COMPACT_MODE_CLASS} table.tborder:has(.navbar) {
        display: none !important;
      }
    `;

    if (!existing) {
      document.head.appendChild(style);
    }
  }

  /**
   * @param {string} value
   * @returns {number}
   */
  function hashString(value) {
    let hash = 0;

    for (let index = 0; index < value.length; index += 1) {
      hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    }

    return hash;
  }

  /**
   * @param {string} tag
   * @returns {{ background: string, border: string, color: string }}
   */
  function getTagColors(tag) {
    const hue = hashString(tag.toLowerCase()) % 360;

    return {
      background: `hsl(${hue}, 82%, 92%)`,
      border: `hsl(${hue}, 58%, 60%)`,
      color: `hsl(${hue}, 70%, 24%)`,
    };
  }

  /**
   * @param {string} tag
   * @returns {HTMLElement}
   */
  function createTagChip(tag) {
    const canonicalTag = tag.toLowerCase();
    const colors = getTagColors(canonicalTag);
    const chip = document.createElement("span");

    chip.className = "fc-premium-tag-chip";
    chip.dataset.fcPremiumTag = canonicalTag;
    chip.role = "button";
    chip.tabIndex = 0;
    chip.textContent = `+${tag}`;
    chip.title = `Filtrar por +${tag}`;
    chip.style.setProperty("--fc-premium-tag-bg", colors.background);
    chip.style.setProperty("--fc-premium-tag-border", colors.border);
    chip.style.setProperty("--fc-premium-tag-color", colors.color);
    chip.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleTagFilter(canonicalTag);
    });
    chip.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      toggleTagFilter(canonicalTag);
    });

    return chip;
  }

  /**
   * @param {HTMLAnchorElement} title
   */
  function renderTaggedTitle(title) {
    if (title.dataset.fcPremiumTagsRendered === "true") {
      return;
    }

    const originalTitle = normalizeText(title.textContent);

    if (!TAG_PATTERN.test(originalTitle)) {
      TAG_PATTERN.lastIndex = 0;
      return;
    }

    TAG_PATTERN.lastIndex = 0;
    title.dataset.fcPremiumTagsRendered = "true";
    title.title = originalTitle;
    title.textContent = "";

    let currentIndex = 0;

    for (const match of originalTitle.matchAll(TAG_PATTERN)) {
      const matchIndex = match.index || 0;
      const tag = match[1];

      if (matchIndex > currentIndex) {
        title.append(
          document.createTextNode(
            originalTitle.slice(currentIndex, matchIndex),
          ),
        );
      }

      title.append(createTagChip(tag));
      currentIndex = matchIndex + match[0].length;
    }

    if (currentIndex < originalTitle.length) {
      title.append(document.createTextNode(originalTitle.slice(currentIndex)));
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

  /**
   * @returns {HTMLTableElement | null}
   */
  function getForumThreadsTable() {
    const table = document.getElementById("threadslist");

    if (table instanceof HTMLTableElement) {
      return table;
    }

    const title = document.querySelector(THREAD_TITLE_SELECTOR);
    const owner = title?.closest("table");

    return owner instanceof HTMLTableElement ? owner : null;
  }

  /**
   * @returns {HTMLTableElement | null}
   */
  function getForumThreadListHeaderTable() {
    const threadsTable = getForumThreadsTable();
    let sibling = threadsTable?.previousElementSibling || null;

    while (sibling) {
      if (
        sibling instanceof HTMLTableElement &&
        normalizeText(sibling.querySelector("td.tcat")?.textContent).startsWith(
          "Temas en el Foro",
        )
      ) {
        return sibling;
      }

      sibling = sibling.previousElementSibling;
    }

    for (const table of document.querySelectorAll("table.tborder")) {
      if (
        table instanceof HTMLTableElement &&
        normalizeText(table.querySelector("td.tcat")?.textContent).startsWith(
          "Temas en el Foro",
        )
      ) {
        return table;
      }
    }

    return null;
  }

  /**
   * @returns {string | null}
   */
  function getForumNameFromThreadListHeader() {
    const header = getForumThreadListHeaderTable();
    const label = normalizeText(
      header?.querySelector("td.tcat .normal")?.textContent,
    )
      .replace(/^:\s*/, "")
      .trim();

    return label || null;
  }

  /**
   * @param {HTMLTableElement} table
   * @param {HTMLTableElement | null} header
   * @param {string | null} forumName
   * @returns {boolean}
   */
  function isForumTitleSummaryTable(table, header, forumName) {
    if (
      header &&
      !(
        table.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING
      )
    ) {
      return false;
    }

    const title = normalizeText(table.querySelector("h1")?.textContent);

    if (!title) {
      return false;
    }

    if (forumName && title.toLowerCase() !== forumName.toLowerCase()) {
      return false;
    }

    return Boolean(table.querySelector("img[src*='forocoches_recarga']"));
  }

  /**
   * @param {HTMLTableElement} table
   * @param {HTMLTableElement | null} header
   * @param {string | null} forumName
   * @returns {boolean}
   */
  function isForumBreadcrumbTitleTable(table, header, forumName) {
    if (
      header &&
      !(
        table.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING
      )
    ) {
      return false;
    }

    const title = normalizeText(
      table.querySelector("td.navbar strong")?.textContent,
    );

    if (!title) {
      return false;
    }

    if (forumName && !title.toLowerCase().startsWith(forumName.toLowerCase())) {
      return false;
    }

    return Boolean(table.querySelector("img[src*='navbits_finallink']"));
  }

  function removeForumTitleTables() {
    const header = getForumThreadListHeaderTable();
    const forumName = getForumNameFromThreadListHeader();

    for (const table of document.querySelectorAll("table.tborder")) {
      if (
        table instanceof HTMLTableElement &&
        (isForumTitleSummaryTable(table, header, forumName) ||
          isForumBreadcrumbTitleTable(table, header, forumName))
      ) {
        table.remove();
      }
    }
  }

  /**
   * @returns {HTMLTableElement | null}
   */
  function getRelatedForumsPanel() {
    for (const table of document.querySelectorAll("table")) {
      if (!(table instanceof HTMLTableElement)) {
        continue;
      }

      const header = normalizeText(
        table.querySelector("tr:first-child td")?.textContent,
      ).toLowerCase();

      if (header === "foros relacionados" || header === "related forums") {
        return table;
      }
    }

    return null;
  }

  /**
   * @param {Element | null} row
   * @returns {HTMLTableCellElement[]}
   */
  function getDirectTableCells(row) {
    if (!(row instanceof HTMLTableRowElement)) {
      return [];
    }

    return Array.from(row.children).filter(
      (child) => child instanceof HTMLTableCellElement,
    );
  }

  /**
   * @param {HTMLTableCellElement} cell
   * @returns {boolean}
   */
  function cellContainsForumThreads(cell) {
    return Boolean(
      cell.querySelector("#threadslist") ||
      cell.querySelector(THREAD_TITLE_SELECTOR),
    );
  }

  /**
   * @param {HTMLTableElement} panel
   * @returns {HTMLTableCellElement | null}
   */
  function getForumSidebarCell(panel) {
    let current = panel.parentElement;

    while (current) {
      if (current instanceof HTMLTableCellElement) {
        const cells = getDirectTableCells(current.parentElement);
        const hasMainSibling = cells.some(
          (cell) => cell !== current && cellContainsForumThreads(cell),
        );

        if (hasMainSibling) {
          return current;
        }
      }

      current = current.parentElement;
    }

    return null;
  }

  /**
   * @param {HTMLTableCellElement} sidebarCell
   * @returns {HTMLTableCellElement | null}
   */
  function getForumMainCell(sidebarCell) {
    const cells = getDirectTableCells(sidebarCell.parentElement);

    return cells.find(cellContainsForumThreads) || null;
  }

  /**
   * @param {HTMLTableCellElement} cell
   * @returns {boolean}
   */
  function isForumSidebarSpacerCell(cell) {
    const width = Number(cell.getAttribute("width") || "0");
    const renderedWidth = cell.getBoundingClientRect().width;

    return (
      normalizeText(cell.textContent).length === 0 &&
      ((Number.isFinite(width) && width > 0 && width <= 8) ||
        (renderedWidth > 0 && renderedWidth <= 8))
    );
  }

  /**
   * @param {HTMLTableCellElement} sidebarCell
   * @returns {HTMLTableCellElement | null}
   */
  function getForumSidebarSpacerCell(sidebarCell) {
    const mainCell = getForumMainCell(sidebarCell);

    if (!mainCell) {
      return null;
    }

    const cells = getDirectTableCells(sidebarCell.parentElement);
    const sidebarIndex = cells.indexOf(sidebarCell);
    const mainIndex = cells.indexOf(mainCell);

    if (sidebarIndex < 0 || mainIndex < 0 || mainIndex <= sidebarIndex + 1) {
      return null;
    }

    return (
      cells.slice(sidebarIndex + 1, mainIndex).find(isForumSidebarSpacerCell) ||
      null
    );
  }

  /**
   * @param {HTMLElement} element
   * @param {boolean} hidden
   */
  function setForumLayoutElementHidden(element, hidden) {
    if (hidden) {
      element.setAttribute(FORUM_LAYOUT_HIDDEN_ATTRIBUTE, "true");
    } else {
      element.removeAttribute(FORUM_LAYOUT_HIDDEN_ATTRIBUTE);
    }
  }

  /**
   * @param {Element} element
   * @returns {boolean}
   */
  function isSmallLayoutSpacer(element) {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    if (normalizeText(element.textContent)) {
      return false;
    }

    if (element instanceof HTMLBRElement) {
      return true;
    }

    const explicitHeight = Number(
      element.getAttribute("height") || element.style.height.replace("px", ""),
    );
    const renderedHeight = element.getBoundingClientRect().height;

    return (
      ["DIV", "TABLE", "TBODY", "TR"].includes(element.tagName) &&
      ((Number.isFinite(explicitHeight) &&
        explicitHeight > 0 &&
        explicitHeight <= 12) ||
        (renderedHeight > 0 && renderedHeight <= 12))
    );
  }

  /**
   * @param {HTMLElement} element
   */
  function hideElementAndAdjacentSpacers(element) {
    setForumLayoutElementHidden(element, true);

    for (const sibling of [
      element.previousElementSibling,
      element.nextElementSibling,
    ]) {
      if (sibling instanceof HTMLElement && isSmallLayoutSpacer(sibling)) {
        setForumLayoutElementHidden(sibling, true);
      }
    }
  }

  /**
   * @param {HTMLTableElement} table
   * @returns {boolean}
   */
  function isForumHomeShortcutBar(table) {
    const text = normalizeLayoutText(table.textContent);

    return text === "inicio foro" || /^inicio foro\b/.test(text);
  }

  /**
   * @param {HTMLTableElement} table
   * @returns {boolean}
   */
  function isForumUserShortcutBar(table) {
    const text = normalizeLayoutText(table.textContent);

    return (
      text.includes("panel control") &&
      text.includes("temas iniciados") &&
      text.includes("temas participados") &&
      text.includes("finalizar sesion")
    );
  }

  /**
   * @returns {HTMLElement | null}
   */
  function getMainContentAnchor() {
    return getForumThreadsTable() || getPostsElement() || getThreadTitleTable();
  }

  /**
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  function isBeforeMainContent(element) {
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

      if (
        table.id === FORUM_CONTROLS_ROW_ID ||
        table.closest(`#${FORUM_CONTROLS_ROW_ID}`)
      ) {
        continue;
      }

      if (
        isBeforeMainContent(table) &&
        (isForumHomeShortcutBar(table) || isForumUserShortcutBar(table))
      ) {
        hideElementAndAdjacentSpacers(table);
      }
    }
  }

  /**
   * @param {HTMLTableCellElement} mainCell
   * @param {boolean} expanded
   */
  function setForumMainCellExpanded(mainCell, expanded) {
    if (mainCell.dataset.fcPremiumOriginalWidth === undefined) {
      mainCell.dataset.fcPremiumOriginalWidth =
        mainCell.getAttribute("width") || "";
    }

    if (expanded) {
      mainCell.setAttribute("width", "100%");
      mainCell.style.width = "100%";
      return;
    }

    if (mainCell.dataset.fcPremiumOriginalWidth) {
      mainCell.setAttribute("width", mainCell.dataset.fcPremiumOriginalWidth);
    }

    mainCell.style.width = "";
  }

  /**
   * @returns {HTMLButtonElement}
   */
  function getOrCreateForumSidebarToggleButton() {
    let button = document.getElementById(FORUM_SIDEBAR_TOGGLE_ID);

    if (!(button instanceof HTMLButtonElement)) {
      button = document.createElement("button");
      button.id = FORUM_SIDEBAR_TOGGLE_ID;
      button.type = "button";
      button.addEventListener("click", () => {
        setSavedForumSidebarHidden(!forumSidebarHidden);
      });
    }

    button.textContent = forumSidebarHidden
      ? "Mostrar panel izquierdo"
      : "Ocultar panel izquierdo";
    button.title = forumSidebarHidden
      ? "Mostrar la columna izquierda"
      : "Ocultar la columna izquierda";
    button.setAttribute("aria-expanded", String(!forumSidebarHidden));

    return button;
  }

  /**
   * @returns {HTMLTableRowElement | null}
   */
  function getForumToolbarRow() {
    const toolsCell = document.getElementById("forumtools");
    const row = toolsCell?.parentElement;

    return row instanceof HTMLTableRowElement ? row : null;
  }

  function renderHiddenThreadsToolbarButton() {
    if (!isForumDisplayPage()) {
      return;
    }

    const row = getForumToolbarRow();
    const toolsCell = document.getElementById("forumtools");

    if (!row || !(toolsCell instanceof HTMLTableCellElement)) {
      return;
    }

    let cell = document.getElementById(HIDDEN_THREADS_BUTTON_ID);

    if (!(cell instanceof HTMLTableCellElement)) {
      cell = document.createElement("td");
      cell.id = HIDDEN_THREADS_BUTTON_ID;
      cell.className = "vbmenu_control";
      cell.noWrap = true;
      cell.style.cursor = "pointer";
    }

    const link = document.createElement("a");
    link.href = "#";
    link.textContent = "Hilos escondidos";
    link.addEventListener("click", (event) => {
      event.preventDefault();
      openHiddenThreadsModal();
    });

    cell.textContent = "";
    cell.append(link);

    if (cell.parentElement !== row || cell.nextElementSibling !== toolsCell) {
      row.insertBefore(cell, toolsCell);
    }
  }

  /**
   * @returns {HTMLElement}
   */
  function ensureHiddenThreadsModal() {
    let modal = document.getElementById(HIDDEN_THREADS_MODAL_ID);

    if (modal instanceof HTMLElement) {
      return modal;
    }

    modal = document.createElement("div");
    modal.id = HIDDEN_THREADS_MODAL_ID;
    modal.hidden = true;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Hilos escondidos");

    const dialog = document.createElement("div");
    dialog.className = "fc-premium-hidden-threads-dialog";

    const header = document.createElement("div");
    header.className = "fc-premium-hidden-threads-header";

    const title = document.createElement("span");
    title.textContent = "Hilos escondidos";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "Cerrar";
    closeButton.addEventListener("click", closeHiddenThreadsModal);

    header.append(title, closeButton);

    const body = document.createElement("div");
    body.id = HIDDEN_THREADS_MODAL_BODY_ID;

    dialog.append(header, body);
    modal.append(dialog);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeHiddenThreadsModal();
      }
    });

    document.body.append(modal);
    return modal;
  }

  /**
   * @returns {boolean}
   */
  function isHiddenThreadsModalOpen() {
    const modal = document.getElementById(HIDDEN_THREADS_MODAL_ID);
    return modal instanceof HTMLElement && !modal.hidden;
  }

  function closeHiddenThreadsModal() {
    const modal = document.getElementById(HIDDEN_THREADS_MODAL_ID);

    if (modal instanceof HTMLElement) {
      modal.hidden = true;
    }

    document.documentElement.classList.remove(MODAL_OPEN_CLASS);
    document.body?.classList.remove(MODAL_OPEN_CLASS);
  }

  /**
   * @param {number} timestamp
   * @returns {string}
   */
  function formatHiddenThreadDate(timestamp) {
    if (!timestamp) {
      return "Sin fecha";
    }

    try {
      return new Date(timestamp).toLocaleString();
    } catch (_error) {
      return "Sin fecha";
    }
  }

  /**
   * @param {string[]} tags
   * @returns {DocumentFragment}
   */
  function createHiddenThreadTagsFragment(tags) {
    const fragment = document.createDocumentFragment();

    for (const tag of tags.slice(0, 5)) {
      const chip = document.createElement("span");
      chip.className = "fc-premium-tag-chip";
      chip.textContent = `+${tag}`;
      fragment.append(chip);
    }

    if (tags.length > 5) {
      fragment.append(document.createTextNode(` +${tags.length - 5}`));
    }

    return fragment;
  }

  function renderHiddenThreadsModalBody() {
    const modal = ensureHiddenThreadsModal();
    const body = modal.querySelector(`#${HIDDEN_THREADS_MODAL_BODY_ID}`);

    if (!(body instanceof HTMLElement)) {
      return;
    }

    body.textContent = "";

    const records = getHiddenForumThreadRecordsForCurrentForum();

    if (records.length === 0) {
      const empty = document.createElement("div");
      empty.className = "fc-premium-hidden-threads-empty";
      empty.textContent = "No hay hilos escondidos en este foro.";
      body.append(empty);
      return;
    }

    const table = document.createElement("table");
    table.className = "fc-premium-hidden-threads-table";

    const head = table.createTHead();
    const headRow = head.insertRow();

    for (const label of ["Hilo", "Info", "Oculto", "Accion"]) {
      const cell = document.createElement("th");
      cell.textContent = label;
      headRow.append(cell);
    }

    const tableBody = table.createTBody();

    for (const record of records) {
      const row = tableBody.insertRow();

      const titleCell = row.insertCell();
      const title = document.createElement("a");
      title.className = "fc-premium-hidden-thread-title";
      title.href = record.url;
      title.textContent = record.title || `Hilo ${record.id}`;
      titleCell.append(title);

      if (record.tags.length > 0) {
        const tags = document.createElement("div");
        tags.className = "fc-premium-hidden-thread-meta";
        tags.append(createHiddenThreadTagsFragment(record.tags));
        titleCell.append(tags);
      }

      const infoCell = row.insertCell();
      const info = [
        record.author ? `Autor: ${record.author}` : "",
        record.statsText,
        record.lastPostText,
      ].filter(Boolean);
      infoCell.textContent = info.length > 0 ? info.join(" · ") : "-";

      const hiddenAtCell = row.insertCell();
      hiddenAtCell.textContent = formatHiddenThreadDate(record.hiddenAt);

      const actionsCell = row.insertCell();
      const restore = document.createElement("button");
      restore.type = "button";
      restore.className = "fc-premium-hidden-thread-restore";
      restore.textContent = "Restaurar";
      restore.addEventListener("click", () => {
        void setForumThreadHiddenState(record.id, false);
      });
      actionsCell.append(restore);
    }

    body.append(table);
  }

  function openHiddenThreadsModal() {
    const modal = ensureHiddenThreadsModal();
    renderHiddenThreadsModalBody();
    modal.hidden = false;
    document.documentElement.classList.add(MODAL_OPEN_CLASS);
    document.body.classList.add(MODAL_OPEN_CLASS);
    modal
      .querySelector("button")
      ?.focus({ preventScroll: true });
  }

  /**
   * @param {HTMLTableElement} table
   * @returns {boolean}
   */
  function isNativeForumControlsTable(table) {
    return Boolean(
      table.querySelector("a[href*='newthread.php'][href*='do=newthread']") &&
      table.querySelector(".pagenav"),
    );
  }

  /**
   * @returns {HTMLTableElement | null}
   */
  function getNativeForumControlsTable() {
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

  /**
   * @returns {HTMLElement}
   */
  function createForumLoadingStatus() {
    const status = document.createElement("span");
    status.id = FORUM_LOADING_STATUS_ID;

    const spinner = document.createElement("span");
    spinner.className = "fc-premium-spinner";
    spinner.setAttribute("aria-hidden", "true");
    status.append(spinner);

    const text = document.createElement("span");
    text.dataset.fcPremiumLoadingText = "true";
    status.append(text);

    return status;
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

  /**
   * @param {Partial<ForumThreadLoadState>} state
   */
  function setForumThreadLoadState(state) {
    forumThreadLoadState = {
      ...forumThreadLoadState,
      ...state,
    };
    renderForumLoadingStatus();
  }

  /**
   * @param {string} query
   */
  function applyForumLiveSearchQuery(query) {
    const normalizedQuery = normalizeText(query);

    if (normalizedQuery === activeForumSearchQuery) {
      return;
    }

    activeForumSearchQuery = normalizedQuery;
    activeForumTagPage = 1;
    refreshForumTagUi({ readUrlState: false });
  }

  /**
   * @param {string} query
   */
  function scheduleForumLiveSearch(query) {
    window.clearTimeout(forumLiveSearchTimer);
    forumLiveSearchTimer = window.setTimeout(() => {
      applyForumLiveSearchQuery(query);
    }, FORUM_LIVE_SEARCH_DEBOUNCE_MS);
  }

  /**
   * @param {HTMLFormElement | HTMLElement | null} root
   */
  function installForumLiveSearch(root) {
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

  /**
   * @param {HTMLTableElement} controlsTable
   * @returns {HTMLFormElement | null}
   */
  function detachMovedForumSearchForm(controlsTable) {
    const form = document.querySelector(
      "form[name='busca'][action*='forocoches_search']",
    );

    if (form instanceof HTMLFormElement && controlsTable.contains(form)) {
      form.remove();
      return form;
    }

    return null;
  }

  /**
   * @param {HTMLTableElement} table
   */
  function refreshExistingForumControlsRow(table) {
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

  /**
   * @returns {HTMLTableElement | null}
   */
  function renderForumControlsRow() {
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

  /**
   * @param {HTMLTableCellElement} mainCell
   */
  function renderForumSidebarToggle(mainCell) {
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

  /**
   * @param {string | null | undefined} source
   * @returns {string[]}
   */
  function getTagsFromText(source) {
    const tags = new Set();

    TAG_PATTERN.lastIndex = 0;

    for (const match of String(source || "").matchAll(TAG_PATTERN)) {
      tags.add(match[1].toLowerCase());
    }

    TAG_PATTERN.lastIndex = 0;
    return Array.from(tags);
  }

  /**
   * @param {HTMLAnchorElement} title
   * @returns {string[]}
   */
  function getTitleTags(title) {
    const source = title.title || normalizeText(title.textContent);
    return getTagsFromText(source);
  }

  /**
   * @param {HTMLTableElement | null} table
   * @returns {HTMLTableRowElement[]}
   */
  function getForumThreadRows(table = getForumThreadsTable()) {
    return Array.from(table?.querySelectorAll("tr") || []).filter(
      (row) =>
        row instanceof HTMLTableRowElement &&
        row.querySelector(THREAD_TITLE_SELECTOR),
    );
  }

  /**
   * @returns {HTMLTableSectionElement | null}
   */
  function getForumThreadsBody() {
    const table = getForumThreadsTable();
    return table?.tBodies[0] || table?.createTBody() || null;
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

    nativeForumThreadHeaderRowHtml =
      firstThreadIndex > 0
        ? rows.slice(0, firstThreadIndex).map((row) => row.outerHTML)
        : [];
    nativeForumThreadRowHtml = getForumThreadRows().map((row) => row.outerHTML);
    forumThreadsPerPage =
      nativeForumThreadRowHtml.length || FORUM_THREAD_FALLBACK_PAGE_SIZE;
    renderedForumThreadListSignature = getForumThreadRowsSignature(
      nativeForumThreadRowHtml,
      "native",
    );
  }

  /**
   * @param {string[]} rowHtmlList
   * @param {string} scope
   * @returns {string}
   */
  function getForumThreadRowsSignature(rowHtmlList, scope) {
    return `${scope}|${rowHtmlList.length}|${rowHtmlList
      .map((html) => hashString(html).toString(36))
      .join(":")}`;
  }

  /**
   * @param {HTMLElement | Document} root
   */
  function renderVisibleForumThreadTitleTags(root = document) {
    for (const title of root.querySelectorAll(THREAD_TITLE_SELECTOR)) {
      if (title instanceof HTMLAnchorElement) {
        renderTaggedTitle(title);
      }
    }
  }

  /**
   * @returns {ForumThreadRecord[]}
   */
  function getCachedForumThreadsForCurrentForum() {
    const forumId = getForumId();

    return cachedForumThreads.filter((record) => record.forumId === forumId);
  }

  /**
   * @returns {ForumThreadRecord[]}
   */
  function getVisibleCachedForumThreadsForCurrentForum() {
    return getCachedForumThreadsForCurrentForum().filter(
      (record) => !record.isHidden,
    );
  }

  /**
   * @returns {ForumThreadRecord[]}
   */
  function getHiddenForumThreadRecordsForCurrentForum() {
    return sortForumThreadRecords(
      getCachedForumThreadsForCurrentForum().filter(
        (record) => record.isHidden,
      ),
    ).sort((left, right) => right.hiddenAt - left.hiddenAt);
  }

  /**
   * @param {string | null | undefined} query
   * @returns {string[]}
   */
  function getForumSearchTokens(query) {
    return normalizeLayoutText(query)
      .split(/\s+/)
      .filter(Boolean);
  }

  /**
   * @param {ForumThreadRecord} record
   * @returns {string}
   */
  function getForumThreadTitleSearchText(record) {
    return normalizeLayoutText(record.title);
  }

  /**
   * @param {ForumThreadRecord} record
   * @param {string[]} tokens
   * @returns {boolean}
   */
  function forumThreadMatchesSearchTokens(record, tokens) {
    if (tokens.length === 0) {
      return true;
    }

    const text = getForumThreadTitleSearchText(record);
    return tokens.every((token) => text.includes(token));
  }

  /**
   * @param {ForumThreadRecord[]} records
   * @returns {ForumThreadRecord[]}
   */
  function sortForumThreadRecords(records) {
    return records.slice().sort((left, right) => {
      if (left.lastSeen !== right.lastSeen) {
        return right.lastSeen - left.lastSeen;
      }

      if (left.recentIndex !== right.recentIndex) {
        return left.recentIndex - right.recentIndex;
      }

      return right.updatedAt - left.updatedAt;
    });
  }

  /**
   * @param {string | null} tag
   * @returns {ForumThreadRecord[]}
   */
  function getForumThreadRecordsForTag(tag) {
    const records = getVisibleCachedForumThreadsForCurrentForum();
    const tokens = getForumSearchTokens(activeForumSearchQuery);

    return sortForumThreadRecords(
      records.filter(
        (record) =>
          (!tag || record.tags.includes(tag)) &&
          forumThreadMatchesSearchTokens(record, tokens),
      ),
    );
  }

  /**
   * @param {{ history?: "push" | "replace" }} [options]
   */
  function syncForumTagUrl(options = {}) {
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

  /**
   * @param {number} pageNumber
   * @returns {URL}
   */
  function getForumDynamicPageUrl(pageNumber) {
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

  /**
   * @param {number} total
   */
  function renderNativeForumPagers(total) {
    const pageSize = forumThreadsPerPage || FORUM_THREAD_FALLBACK_PAGE_SIZE;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    activeForumTagPage = Math.min(Math.max(activeForumTagPage, 1), totalPages);

    for (const pager of document.querySelectorAll(".pagenav")) {
      if (!(pager instanceof HTMLElement)) {
        continue;
      }

      const container = pager.closest("table[width='100%']") || pager;

      if (container instanceof HTMLElement) {
        setForumLayoutElementHidden(container, false);
      }

      const table = document.createElement("table");
      table.className = "tborder";
      table.cellPadding = "3";
      table.cellSpacing = "1";
      table.border = "0";

      const body = table.createTBody();
      const row = body.insertRow();

      const label = row.insertCell();
      label.className = "vbmenu_control";
      label.style.fontWeight = "normal";
      label.textContent = `Pág ${activeForumTagPage} de ${totalPages}`;

      for (const pageNumber of getVisibleThreadPageNumbers(
        totalPages,
        activeForumTagPage,
      )) {
        const cell = row.insertCell();

        if (pageNumber === activeForumTagPage) {
          cell.className = "alt2";
          const current = document.createElement("span");
          current.className = "mfont";
          current.title = `Mostrando resultados filtrados`;
          const strong = document.createElement("strong");
          strong.textContent = String(pageNumber);
          current.append(strong);
          cell.append(current);
          continue;
        }

        cell.className = "alt1";
        const link = document.createElement("a");
        link.className = "mfont";
        link.href = getForumDynamicPageUrl(pageNumber).href;
        link.textContent = String(pageNumber);
        link.addEventListener("click", (event) => {
          event.preventDefault();
          setForumTagPage(pageNumber);
        });
        cell.append(link);
      }

      if (activeForumTagPage < totalPages) {
        const nextCell = row.insertCell();
        nextCell.className = "alt1";
        const next = document.createElement("a");
        next.className = "mfont";
        next.href = getForumDynamicPageUrl(activeForumTagPage + 1).href;
        next.textContent = ">";
        next.addEventListener("click", (event) => {
          event.preventDefault();
          setForumTagPage(activeForumTagPage + 1);
        });
        nextCell.append(next);

        const lastCell = row.insertCell();
        lastCell.className = "alt1";
        const last = document.createElement("a");
        last.className = "mfont";
        last.href = getForumDynamicPageUrl(totalPages).href;
        last.textContent = "Último »";
        last.addEventListener("click", (event) => {
          event.preventDefault();
          setForumTagPage(totalPages);
        });
        lastCell.append(last);
      }

      pager.textContent = "";
      pager.append(table);
    }
  }

  /**
   * @param {number} pageNumber
   */
  function setForumTagPage(pageNumber) {
    activeForumTagPage = pageNumber;
    if (!activeForumSearchQuery) {
      syncForumTagUrl({ history: "push" });
    }
    refreshForumTagUi({ readUrlState: !activeForumSearchQuery });
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  /**
   * @param {string[]} rowHtmlList
   * @param {string} signature
   * @returns {boolean}
   */
  function renderForumThreadRows(rowHtmlList, signature) {
    const table = getForumThreadsTable();

    if (!table) {
      return false;
    }

    if (signature === renderedForumThreadListSignature) {
      return false;
    }

    const template = document.createElement("template");
    template.innerHTML = [
      ...nativeForumThreadHeaderRowHtml,
      ...rowHtmlList,
    ].join("");

    for (const body of Array.from(table.tBodies)) {
      body.remove();
    }

    const body = table.createTBody();
    body.append(template.content);
    renderVisibleForumThreadTitleTags(body);
    renderedForumThreadListSignature = signature;
    return true;
  }

  /**
   * @returns {boolean}
   */
  function restoreNativeForumThreadRows() {
    if (nativeForumThreadRowHtml.length > 0) {
      return renderForumThreadRows(
        nativeForumThreadRowHtml,
        getForumThreadRowsSignature(nativeForumThreadRowHtml, "native"),
      );
    }

    return false;
  }

  /**
   * @returns {boolean}
   */
  function renderForumThreadList() {
    if (!isForumDisplayPage()) {
      return false;
    }

    captureNativeForumThreadRows();

    const cachedForumRecords = getCachedForumThreadsForCurrentForum();
    const records = getForumThreadRecordsForTag(activeTagFilter);

    if (
      cachedForumRecords.length === 0 &&
      !activeTagFilter &&
      !activeForumSearchQuery
    ) {
      return restoreNativeForumThreadRows();
    }

    const pageSize = forumThreadsPerPage || FORUM_THREAD_FALLBACK_PAGE_SIZE;
    const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
    activeForumTagPage = Math.min(Math.max(activeForumTagPage, 1), totalPages);

    const start = (activeForumTagPage - 1) * pageSize;
    const pageRecords = records.slice(start, start + pageSize);
    const rowHtmlList = pageRecords.map((record) => record.html);
    const signature = getForumThreadRowsSignature(
      rowHtmlList,
      [
        "dynamic",
        activeTagFilter || "",
        activeForumSearchQuery,
        activeForumTagPage,
        pageSize,
      ].join(":"),
    );
    const changed = renderForumThreadRows(rowHtmlList, signature);

    renderNativeForumPagers(records.length);
    return changed;
  }

  /**
   * @param {HTMLElement} row
   * @param {string} sourceUrl
   * @returns {string}
   */
  function getSerializableForumThreadRowHtml(row, sourceUrl) {
    const clone = row.cloneNode(true);

    if (!(clone instanceof HTMLElement)) {
      return row.outerHTML;
    }

    clone.removeAttribute(SELECTED_ATTRIBUTE);
    clone.removeAttribute(HIDDEN_THREAD_ATTRIBUTE);
    clone.querySelectorAll(`[${SELECTED_ATTRIBUTE}]`).forEach((element) => {
      element.removeAttribute(SELECTED_ATTRIBUTE);
    });
    clone
      .querySelectorAll(`[${HIDDEN_THREAD_ATTRIBUTE}]`)
      .forEach((element) => {
        element.removeAttribute(HIDDEN_THREAD_ATTRIBUTE);
      });

    for (const link of clone.querySelectorAll("a[href]")) {
      if (link instanceof HTMLAnchorElement) {
        link.href = new URL(link.getAttribute("href") || "", sourceUrl).href;
      }
    }

    for (const image of clone.querySelectorAll("img[src]")) {
      if (image instanceof HTMLImageElement) {
        image.src = new URL(image.getAttribute("src") || "", sourceUrl).href;
      }
    }

    return clone.outerHTML;
  }

  /**
   * @param {Document} doc
   * @returns {HTMLTableElement | null}
   */
  function getForumThreadsTableFromDocument(doc) {
    const table = doc.getElementById("threadslist");

    if (table instanceof HTMLTableElement) {
      return table;
    }

    const title = doc.querySelector(THREAD_TITLE_SELECTOR);
    const owner = title?.closest("table");

    return owner instanceof HTMLTableElement ? owner : null;
  }

  /**
   * @param {HTMLTableRowElement} row
   * @param {string} threadId
   * @param {string} sourceUrl
   * @param {string} forumId
   * @param {number} pageNumber
   * @param {number} pageIndex
   * @param {number} scrapeStartedAt
   * @returns {ForumThreadRecord | null}
   */
  function createForumThreadRecordFromRow(
    row,
    threadId,
    sourceUrl,
    forumId,
    pageNumber,
    pageIndex,
    scrapeStartedAt,
  ) {
    const title = row.querySelector(THREAD_TITLE_SELECTOR);

    if (!(title instanceof HTMLAnchorElement)) {
      return null;
    }

    const titleText = normalizeText(title.textContent);
    const cells = Array.from(row.cells);
    const titleCell = title.closest("td");
    const titleCellIndex =
      titleCell instanceof HTMLTableCellElement ? cells.indexOf(titleCell) : -1;
    const author = normalizeText(
      titleCell?.querySelector(".smallfont span")?.textContent,
    );
    const lastPostCell = titleCellIndex >= 0 ? cells[titleCellIndex + 1] : null;
    const statsCell = titleCellIndex >= 0 ? cells[titleCellIndex + 2] : null;
    const recentIndex = (pageNumber - 1) * forumThreadsPerPage + pageIndex;

    return {
      version: FORUM_THREAD_CACHE_RECORD_VERSION,
      id: threadId,
      forumId,
      url: new URL(title.getAttribute("href") || "", sourceUrl).href,
      title: titleText,
      tags: getTagsFromText(titleText),
      html: getSerializableForumThreadRowHtml(row, sourceUrl),
      preview: normalizeText(titleCell?.getAttribute("title")),
      author,
      lastPostText: normalizeText(lastPostCell?.textContent),
      statsText: normalizeText(
        statsCell?.getAttribute("title") || statsCell?.textContent,
      ),
      rowText: normalizeText(row.textContent),
      sourcePage: pageNumber,
      sourceIndex: pageIndex,
      recentIndex,
      lastSeen: scrapeStartedAt,
      updatedAt: Date.now(),
      isHidden: false,
      hiddenAt: 0,
    };
  }

  /**
   * @param {Document} doc
   * @param {string} sourceUrl
   * @param {string} forumId
   * @param {number} pageNumber
   * @param {number} scrapeStartedAt
   * @returns {ForumThreadRecord[]}
   */
  function collectForumThreadRecords(
    doc,
    sourceUrl,
    forumId,
    pageNumber,
    scrapeStartedAt,
  ) {
    const table = getForumThreadsTableFromDocument(doc);

    if (!table) {
      return [];
    }

    const rows = Array.from(table.querySelectorAll("tr")).filter(
      (row) =>
        row instanceof HTMLTableRowElement &&
        row.querySelector(THREAD_TITLE_SELECTOR),
    );

    return rows
      .map((row, index) => {
        const title = row.querySelector(THREAD_TITLE_SELECTOR);
        const url =
          title instanceof HTMLAnchorElement
            ? toUrl(title.getAttribute("href") || title.href)
            : null;
        const threadId = url ? getThreadId(url) : null;

        return threadId
          ? createForumThreadRecordFromRow(
              /** @type {HTMLTableRowElement} */ (row),
              threadId,
              sourceUrl,
              forumId,
              pageNumber,
              index,
              scrapeStartedAt,
            )
          : null;
      })
      .filter((record) => record !== null);
  }

  /**
   * @returns {ForumThreadRecord[]}
   */
  function collectCurrentForumThreadRecords() {
    const forumId = getForumId();

    if (!forumId) {
      return [];
    }

    return collectForumThreadRecords(
      document,
      location.href,
      forumId,
      getPageNumber(new URL(location.href)),
      Date.now(),
    );
  }

  /**
   * @param {string} threadId
   * @returns {ForumThreadRecord | null}
   */
  function getCurrentForumThreadRecord(threadId) {
    return (
      collectCurrentForumThreadRecords().find(
        (record) => record.id === threadId,
      ) || null
    );
  }

  /**
   * @returns {Promise<void>}
   */
  async function cacheCurrentForumThreadRows() {
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

  /**
   * @param {string} threadId
   * @param {boolean} hidden
   * @returns {Promise<boolean>}
   */
  async function setForumThreadHiddenState(threadId, hidden) {
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

  /**
   * @returns {Promise<boolean>}
   */
  async function hideSelectedForumThread() {
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

  /**
   * @param {ForumThreadRecord[]} records
   */
  function mergeCachedForumThreadRecords(records) {
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

  /**
   * @param {number} pageNumber
   * @returns {URL}
   */
  function getForumRecentPageUrl(pageNumber) {
    const url = new URL(location.href);
    clearForumStateQueryParams(url);
    url.hash = "";
    url.searchParams.delete("page");

    if (pageNumber > 1) {
      url.searchParams.set("page", String(pageNumber));
    }

    return url;
  }

  /**
   * @param {{ readUrlState?: boolean }} [options]
   */
  function refreshForumTagUi(options = {}) {
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

  /**
   * @param {number} pageNumber
   * @param {number} scrapeStartedAt
   * @returns {Promise<ForumThreadRecord[]>}
   */
  async function scrapeForumThreadPage(pageNumber, scrapeStartedAt) {
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
      scrapeStartedAt,
    );
  }

  /**
   * @param {ForumThreadRecord[]} records
   * @returns {Promise<void>}
   */
  async function saveScrapedForumThreadRecords(records) {
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

  /**
   * @param {number} startPage
   * @param {number} scrapeStartedAt
   * @returns {Promise<void>}
   */
  async function scrapeRecentForumThreadPages(startPage, scrapeStartedAt) {
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

  /**
   * @returns {Promise<void>}
   */
  async function initializeForumThreadCache() {
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

  /**
   * @param {string} tag
   */
  function toggleTagFilter(tag) {
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

  /**
   * @returns {{ tag: string, count: number, firstIndex: number }[]}
   */
  function getTopTitleTags() {
    const tagsByName = new Map();
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

    const bar = document.createElement("div");
    bar.id = TOP_TAGS_ID;

    const label = document.createElement("span");
    label.textContent = "Top tags:";
    bar.append(label);

    for (const summary of topTags) {
      const chip = createTagChip(summary.tag);
      chip.textContent = `+${summary.tag} (${summary.count})`;
      chip.title = `Filtrar ${summary.count} hilos con +${summary.tag}`;
      chip.setAttribute(
        "aria-pressed",
        String(activeTagFilter === summary.tag),
      );
      bar.append(chip);
    }

    table.before(bar);
  }

  /**
   * @param {EventTarget | null} target
   * @returns {boolean}
   */
  function isEditableTarget(target) {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return Boolean(
      target.closest("input, textarea, select, [contenteditable='true']"),
    );
  }

  /**
   * @param {HTMLAnchorElement} link
   * @returns {HTMLElement}
   */
  function getThreadNavigationOwner(link) {
    const row = link.closest("tr");

    if (row instanceof HTMLElement) {
      return row;
    }

    return link;
  }

  /**
   * @returns {NavigationItem[]}
   */
  function getThreadTitleNavigationItems() {
    /** @type {NavigationItem[]} */
    const items = [];

    for (const link of document.querySelectorAll(THREAD_TITLE_SELECTOR)) {
      if (!(link instanceof HTMLAnchorElement) || !isVisible(link)) {
        continue;
      }

      items.push({
        element: getThreadNavigationOwner(link),
        link,
      });
    }

    return items;
  }

  /**
   * @returns {NavigationItem[]}
   */
  function getPostNavigationItems() {
    const posts = getPostsElement();

    if (!posts) {
      return [];
    }

    /** @type {NavigationItem[]} */
    const items = [];

    for (const wrapper of posts.querySelectorAll(".fc-premium-post-wrapper")) {
      if (!(wrapper instanceof HTMLElement) || !isVisible(wrapper)) {
        continue;
      }

      const table = wrapper.querySelector(POST_TABLE_SELECTOR);
      const postId = table?.id.match(/^post(\d+)$/)?.[1] || null;
      const link = postId
        ? wrapper.querySelector(`#postcount${postId}`)
        : wrapper.querySelector("a[id^='postcount']");

      items.push({
        element: wrapper,
        link: link instanceof HTMLAnchorElement ? link : null,
      });
    }

    return items;
  }

  /**
   * @returns {NavigationItem[]}
   */
  function collectNavigationItems() {
    if (isForumDisplayPage()) {
      return getThreadTitleNavigationItems();
    }

    if (isThreadPage()) {
      return getPostNavigationItems();
    }

    return [];
  }

  /**
   * @param {{ reset?: boolean, scroll?: boolean, updateUrl?: boolean }} [options]
   */
  function refreshNavigation(options = {}) {
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

  /**
   * @param {{ scroll?: boolean, updateUrl?: boolean }} [options]
   */
  function renderNavigationSelection(options = {}) {
    for (const selected of document.querySelectorAll(
      `[${SELECTED_ATTRIBUTE}]`,
    )) {
      selected.removeAttribute(SELECTED_ATTRIBUTE);
    }

    const selected = navigationItems[selectedNavigationIndex];

    if (!selected) {
      renderNavigationStatus(null);
      return;
    }

    selected.element.setAttribute(SELECTED_ATTRIBUTE, "true");
    renderNavigationStatus(selected);

    if (options.updateUrl && isThreadPage()) {
      updateSelectedPostUrl(selected);
    }

    if (options.scroll) {
      scrollNavigationElementIntoView(selected.element);
    }
  }

  /**
   * @param {NavigationItem} selected
   */
  function updateSelectedPostUrl(selected) {
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

  /**
   * @param {NavigationItem | null} selected
   */
  function renderNavigationStatus(selected) {
    void selected;
    document.getElementById(NAVIGATION_STATUS_ID)?.remove();
  }

  /**
   * @param {HTMLElement} element
   */
  function scrollNavigationElementIntoView(element) {
    element.scrollIntoView({
      behavior: "smooth",
      block: isThreadPage() ? "start" : "nearest",
    });
  }

  /**
   * @param {HTMLElement | undefined} element
   * @returns {string | null}
   */
  function getPostIdFromNavigationElement(element) {
    if (!(element instanceof HTMLElement)) {
      return null;
    }

    const postTable = element.querySelector(POST_TABLE_SELECTOR);
    const postId = postTable?.id.match(/^post(\d+)$/)?.[1];

    return postId || null;
  }

  /**
   * @param {number} direction
   */
  function moveNavigation(direction) {
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

  /**
   * @param {number} index
   */
  function selectNavigationIndex(index) {
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

  /**
   * @param {HTMLElement} element
   * @param {{ scroll?: boolean, updateUrl?: boolean }} [options]
   */
  function selectNavigationElement(element, options = {}) {
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

  /**
   * @returns {HTMLElement | null}
   */
  function getSelectedPostWrapper() {
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

    const marked = document.querySelector(
      `.fc-premium-post-wrapper[${SELECTED_ATTRIBUTE}]`,
    );

    return marked instanceof HTMLElement ? marked : null;
  }

  /**
   * @param {HTMLAnchorElement} link
   * @returns {boolean}
   */
  function isMultiQuoteReplyLink(link) {
    const image = link.querySelector("img");
    const label = `${image?.id || ""} ${image?.alt || ""} ${
      image?.title || ""
    } ${image?.getAttribute("src") || ""}`;

    return /mq_\d+|multiquote|multi-cita/i.test(label);
  }

  /**
   * @param {HTMLAnchorElement} link
   * @returns {boolean}
   */
  function isSingleQuoteReplyLink(link) {
    return isQuoteReplyLink(link) && !isMultiQuoteReplyLink(link);
  }

  /**
   * @param {HTMLElement} wrapper
   * @param {"quote" | "multiquote"} action
   * @returns {HTMLAnchorElement | null}
   */
  function getPostReplyActionLink(wrapper, action) {
    const links = Array.from(
      wrapper.querySelectorAll(
        ".fc-premium-post-reply-actions a[href*='newreply.php?do=newreply']",
      ),
    ).filter((link) => link instanceof HTMLAnchorElement);

    return (
      links.find((link) =>
        action === "quote"
          ? isSingleQuoteReplyLink(link)
          : isMultiQuoteReplyLink(link),
      ) || null
    );
  }

  /**
   * @param {HTMLElement} wrapper
   * @returns {boolean}
   */
  function quoteSelectedPost(wrapper) {
    const link = getPostReplyActionLink(wrapper, "quote");

    if (!link) {
      return false;
    }

    link.click();
    return true;
  }

  /**
   * @param {HTMLElement} wrapper
   * @returns {boolean}
   */
  function toggleSelectedPostMultiquote(wrapper) {
    const link = getPostReplyActionLink(wrapper, "multiquote");
    const target = link?.querySelector("img[id^='mq_']");
    const postId =
      target?.id.replace(/^mq_/, "") || getPostIdFromNavigationElement(wrapper);

    if (postId && typeof window.mq_click === "function") {
      window.mq_click(postId);
      return true;
    }

    if (target instanceof HTMLElement) {
      target.click();
      return true;
    }

    if (!link) {
      return false;
    }

    link.click();
    return true;
  }

  /**
   * @param {HTMLAnchorElement} link
   * @returns {boolean}
   */
  function isThreadReplyWithoutQuoteLink(link) {
    const image = link.querySelector("img");
    const label = `${image?.alt || ""} ${image?.title || ""} ${
      image?.getAttribute("src") || ""
    }`;

    return (
      link.href.includes("newreply.php") &&
      link.href.includes("do=newreply") &&
      link.href.includes("noquote=1") &&
      /reply\.gif|respuesta/i.test(label)
    );
  }

  /**
   * @returns {HTMLAnchorElement | null}
   */
  function getThreadReplyWithoutQuoteLink() {
    return (
      Array.from(
        document.querySelectorAll("a[href*='newreply.php'][href*='noquote=1']"),
      )
        .filter((link) => link instanceof HTMLAnchorElement)
        .find(isThreadReplyWithoutQuoteLink) || null
    );
  }

  /**
   * @returns {boolean}
   */
  function openThreadReplyWithoutQuote() {
    const link = getThreadReplyWithoutQuoteLink();

    if (link) {
      link.click();
      return true;
    }

    const threadId = getThreadId(new URL(location.href));

    if (!threadId) {
      return false;
    }

    location.href = new URL(
      `newreply.php?do=newreply&t=${threadId}`,
      location.href,
    ).href;
    return true;
  }

  /**
   * @returns {ShortcutHelpItem[]}
   */
  function getShortcutHelpItems() {
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

  /**
   * @param {string} key
   * @returns {string}
   */
  function formatShortcutHelpKey(key) {
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

  /**
   * @returns {boolean}
   */
  function isShortcutHelpPopoverOpen() {
    const popover = document.getElementById(SHORTCUT_HELP_POPOVER_ID);
    return popover instanceof HTMLElement && !popover.hidden;
  }

  function closeShortcutHelpPopover() {
    const button = document.getElementById(SHORTCUT_HELP_BUTTON_ID);
    const popover = document.getElementById(SHORTCUT_HELP_POPOVER_ID);

    if (popover instanceof HTMLElement) {
      popover.hidden = true;
    }

    if (button instanceof HTMLButtonElement) {
      button.setAttribute("aria-expanded", "false");
    }
  }

  /**
   * @param {boolean} open
   */
  function setShortcutHelpPopoverOpen(open) {
    const button = document.getElementById(SHORTCUT_HELP_BUTTON_ID);
    const popover = document.getElementById(SHORTCUT_HELP_POPOVER_ID);

    if (!(button instanceof HTMLButtonElement) || !popover) {
      return;
    }

    popover.hidden = !open;
    button.setAttribute("aria-expanded", open ? "true" : "false");
  }

  /**
   * @param {MouseEvent} event
   */
  function handleShortcutHelpDocumentClick(event) {
    const target = event.target;

    if (!(target instanceof Node)) {
      return;
    }

    const button = document.getElementById(SHORTCUT_HELP_BUTTON_ID);
    const popover = document.getElementById(SHORTCUT_HELP_POPOVER_ID);

    if (button?.contains(target) || popover?.contains(target)) {
      return;
    }

    closeShortcutHelpPopover();
  }

  function renderShortcutHelpButton() {
    if (!document.body) {
      return;
    }

    document.getElementById(SHORTCUT_HELP_CONTAINER_ID)?.remove();
    document.getElementById(SHORTCUT_HELP_BUTTON_ID)?.remove();
    document.getElementById(SHORTCUT_HELP_POPOVER_ID)?.remove();

    const container = document.createElement("div");
    container.id = SHORTCUT_HELP_CONTAINER_ID;

    const button = document.createElement("button");
    button.id = SHORTCUT_HELP_BUTTON_ID;
    button.type = "button";
    button.textContent = "?";
    button.setAttribute("aria-label", "Mostrar atajos de teclado");
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-expanded", "false");

    const popover = document.createElement("div");
    popover.id = SHORTCUT_HELP_POPOVER_ID;
    popover.hidden = true;
    popover.setAttribute("role", "dialog");
    popover.setAttribute("aria-label", "Atajos de teclado");

    const title = document.createElement("div");
    title.className = "fc-premium-shortcut-help-title";
    title.textContent = "Atajos de teclado";
    popover.append(title);

    for (const item of getShortcutHelpItems()) {
      const row = document.createElement("div");
      row.className = "fc-premium-shortcut-help-row";

      const keys = document.createElement("span");
      keys.className = "fc-premium-shortcut-help-keys";

      for (const key of item.keys) {
        const keyElement = document.createElement("kbd");
        keyElement.className = "fc-premium-shortcut-help-key";
        keyElement.textContent = formatShortcutHelpKey(key);
        keys.append(keyElement);
      }

      const description = document.createElement("span");
      description.className = "fc-premium-shortcut-help-description";
      description.textContent = item.description;

      row.append(keys, description);
      popover.append(row);
    }

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setShortcutHelpPopoverOpen(!isShortcutHelpPopoverOpen());
    });

    document.addEventListener("click", handleShortcutHelpDocumentClick, true);
    container.append(button, popover);
    document.body.prepend(container);
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

  /**
   * @returns {NavigationItem | null}
   */
  function getSelectedNavigationItem() {
    if (navigationItems.length === 0) {
      refreshNavigation({ reset: true });
    }

    return navigationItems[selectedNavigationIndex] || null;
  }

  /**
   * @returns {boolean}
   */
  function openSelectedForumThreadInNewTab() {
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

  /**
   * @param {KeyboardEvent} event
   * @returns {boolean}
   */
  function hasKeyboardModifier(event) {
    return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
  }

  /**
   * @param {KeyboardEvent} event
   * @param {string} key
   * @returns {boolean}
   */
  function keyboardShortcutMatches(event, key) {
    if (key.length === 1) {
      return event.key.toLowerCase() === key.toLowerCase();
    }

    return event.key === key;
  }

  /**
   * @returns {boolean}
   */
  function isMacKeyboardPlatform() {
    return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || "");
  }

  /**
   * @param {KeyboardEvent} event
   * @returns {boolean}
   */
  function isOpenSelectedThreadInNewTabShortcut(event) {
    if (
      !isForumDisplayPage() ||
      event.key !== KEY_OPEN_SELECTED_THREAD_IN_NEW_TAB ||
      event.altKey ||
      event.shiftKey
    ) {
      return false;
    }

    return isMacKeyboardPlatform()
      ? event.metaKey && !event.ctrlKey
      : event.ctrlKey && !event.metaKey;
  }

  /**
   * @param {KeyboardEvent} event
   * @returns {boolean}
   */
  function handleHideSelectedThreadShortcut(event) {
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

  /**
   * @param {KeyboardEvent} event
   * @returns {boolean}
   */
  function handleSelectedPostActionShortcut(event) {
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

  /**
   * @param {KeyboardEvent} event
   */
  function onNavigationKeyDown(event) {
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
      (activeAuthorFilter || activeGraphView)
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

  /**
   * @param {Document} doc
   * @returns {number}
   */
  function getMaxThreadPage(doc) {
    const currentUrl = new URL(location.href);
    const currentThreadId = getThreadId(currentUrl);
    let maxPage = getPageNumber(currentUrl);

    for (const link of doc.querySelectorAll("a[href*='showthread.php']")) {
      if (!(link instanceof HTMLAnchorElement)) {
        continue;
      }

      const url = toUrl(link.getAttribute("href") || link.href);

      if (!url || getThreadId(url) !== currentThreadId) {
        continue;
      }

      maxPage = Math.max(maxPage, getPageNumber(url));
    }

    return maxPage;
  }

  /**
   * @param {number} totalPages
   * @returns {ThreadPage[]}
   */
  function getThreadPagesForTotal(totalPages) {
    /** @type {ThreadPage[]} */
    const pages = [];

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      pages.push({ pageNumber, url: getThreadPageUrl(pageNumber).href });
    }

    return pages;
  }

  /**
   * @param {number} pageNumber
   * @param {{ includeState?: boolean, preserveHash?: boolean }} [options]
   * @returns {URL}
   */
  function getThreadPageUrl(pageNumber, options = {}) {
    const currentUrl = new URL(location.href);
    const threadId =
      getThreadId(currentUrl) ||
      threadPages.map((page) => getThreadId(new URL(page.url))).find(Boolean) ||
      "";
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

  /**
   * @param {number} pageNumber
   * @param {{ history?: "push" | "replace", preserveHash?: boolean }} [options]
   */
  function updateThreadPageUrl(pageNumber, options = {}) {
    const url = getThreadPageUrl(pageNumber, {
      includeState: true,
      preserveHash: options.preserveHash,
    });
    updateBrowserHistory(url, options.history || "replace");
  }

  /**
   * @returns {ThreadPage[]}
   */
  function getThreadPages() {
    const maxPage = getMaxThreadPage(document);
    return getThreadPagesForTotal(maxPage);
  }

  /**
   * @param {Document} doc
   * @param {Element} postTable
   * @returns {Element}
   */
  function getPostWrapper(doc, postTable) {
    const posts = doc.querySelector(POSTS_SELECTOR);

    if (!posts) {
      return postTable;
    }

    let wrapper = postTable;

    while (wrapper.parentElement && wrapper.parentElement !== posts) {
      wrapper = wrapper.parentElement;
    }

    return posts.contains(wrapper) ? wrapper : postTable;
  }

  /**
   * @param {string} href
   * @returns {string | null}
   */
  function getQuotedPostId(href) {
    const url = toUrl(href);

    if (!url) {
      return null;
    }

    const fromPostParam = url.searchParams.get("p");

    if (fromPostParam && /^\d+$/.test(fromPostParam)) {
      return fromPostParam;
    }

    const hashMatch = url.hash.match(/^#post(\d+)$/);
    return hashMatch ? hashMatch[1] : null;
  }

  /**
   * @param {Document} doc
   * @param {string} postId
   * @returns {string[]}
   */
  function getQuotedPostIds(doc, postId) {
    const message = doc.getElementById(`post_message_${postId}`);

    if (!message) {
      return [];
    }

    const quotedIds = new Set();

    for (const link of message.querySelectorAll(
      "a[href*='showthread.php?p='][href*='#post']",
    )) {
      if (!(link instanceof HTMLAnchorElement)) {
        continue;
      }

      const quotedPostId = getQuotedPostId(
        link.getAttribute("href") || link.href,
      );

      if (quotedPostId && quotedPostId !== postId) {
        quotedIds.add(quotedPostId);
      }
    }

    return Array.from(quotedIds);
  }

  /**
   * @param {Document} doc
   * @param {number} pageNumber
   * @param {number} pageOffset
   * @returns {PostRecord[]}
   */
  function collectPosts(doc, pageNumber, pageOffset) {
    /** @type {PostRecord[]} */
    const posts = [];
    const seenWrappers = new Set();

    for (const table of doc.querySelectorAll(POST_TABLE_SELECTOR)) {
      if (!(table instanceof HTMLTableElement) || !/^post\d+$/.test(table.id)) {
        continue;
      }

      const id = table.id.replace(/^post/, "");
      const wrapper = getPostWrapper(doc, table);

      if (seenWrappers.has(wrapper)) {
        continue;
      }

      seenWrappers.add(wrapper);

      const author = normalizeText(
        doc.querySelector(`#postmenu_${id} .bigusername`)?.textContent ||
          doc.querySelector(`#postmenu_${id}`)?.textContent,
      );
      const postNumber =
        normalizeText(doc.querySelector(`#postcount${id}`)?.textContent) ||
        String(pageOffset + posts.length + 1);
      const postNumberValue = Number(postNumber);

      posts.push({
        id,
        html: wrapper.outerHTML,
        author,
        postNumber,
        pageNumber,
        pageIndex: posts.length,
        originalIndex:
          Number.isFinite(postNumberValue) && postNumberValue > 0
            ? postNumberValue - 1
            : pageOffset + posts.length,
        quotedPostIds: getQuotedPostIds(doc, id),
        replyingPostIds: [],
        isOriginalPoster: false,
        replyCount: 0,
      });
    }

    return posts;
  }

  /**
   * @param {string} html
   * @returns {Document}
   */
  function parseHtml(html) {
    return new DOMParser().parseFromString(html, "text/html");
  }

  /**
   * @param {string} url
   * @returns {Promise<Document>}
   */
  async function fetchThreadDocument(url) {
    const response = await fetch(url, {
      cache: "no-cache",
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw new Error(`Could not load ${url}: ${response.status}`);
    }

    return parseHtml(await response.text());
  }

  /**
   * @returns {HTMLElement | null}
   */
  function getPostsElement() {
    const posts = document.querySelector(POSTS_SELECTOR);
    return posts instanceof HTMLElement ? posts : null;
  }

  /**
   * @returns {HTMLElement | null}
   */
  function ensureThreadSummary() {
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

  /**
   * @param {HTMLElement | null} summary
   * @param {string} message
   */
  function setSummary(summary, message) {
    if (!summary) {
      return;
    }

    summary.innerHTML = message;
  }

  /**
   * @param {HTMLElement | null} summary
   * @param {ThreadLoadState} state
   */
  function renderThreadProgress(summary, state) {
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

  /**
   * @param {HTMLElement | null} summary
   */
  function installStickySummaryShadow(summary) {
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

  /**
   * @param {HTMLElement | null} summary
   */
  function renderThreadSummaryMenu(summary) {
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

  /**
   * @returns {HTMLTableElement | null}
   */
  function getThreadTitleTable() {
    const table = document.querySelector("table[id^='fcthread']");
    return table instanceof HTMLTableElement ? table : null;
  }

  /**
   * @returns {HTMLTableElement | null}
   */
  function getThreadBreadcrumbOuterTable() {
    const titleTable = getThreadTitleTable();

    return (
      Array.from(document.querySelectorAll("table.tborder")).find((table) => {
        if (!(table instanceof HTMLTableElement)) {
          return false;
        }

        if (
          titleTable &&
          !(
            table.compareDocumentPosition(titleTable) &
            Node.DOCUMENT_POSITION_FOLLOWING
          )
        ) {
          return false;
        }

        return Boolean(
          table.querySelector(".navbar") &&
          table.querySelector("img[src*='navbits_finallink']"),
        );
      }) || null
    );
  }

  /**
   * @returns {HTMLTableElement | null}
   */
  function getThreadBreadcrumbContentTable() {
    const outerTable = getThreadBreadcrumbOuterTable();
    const contentTable = outerTable?.rows[0]?.cells[0]?.querySelector("table");

    return contentTable instanceof HTMLTableElement ? contentTable : null;
  }

  /**
   * @returns {HTMLAnchorElement | null}
   */
  function getNavbarSearchLink() {
    const link = document.getElementById("navbar_search");
    return link instanceof HTMLAnchorElement ? link : null;
  }

  /**
   * @returns {{
   *   form: HTMLFormElement,
   *   controlsCell: HTMLTableCellElement,
   *   oldContainer: HTMLElement | null
   * } | null}
   */
  function getForumHeaderSearchFormParts() {
    const form = document.querySelector(
      "form[name='busca'][action*='forocoches_search']",
    );

    if (!(form instanceof HTMLFormElement)) {
      return null;
    }

    const nextCell = form.nextElementSibling;

    if (
      nextCell instanceof HTMLTableCellElement &&
      nextCell.querySelector("input[name='query']")
    ) {
      return {
        form,
        controlsCell: nextCell,
        oldContainer:
          nextCell.closest("table.cajasprin") ||
          nextCell.closest("table")?.parentElement?.closest("tr") ||
          nextCell.closest("table"),
      };
    }

    const queryInput = Array.from(
      document.querySelectorAll("input[name='query']"),
    )
      .filter((input) => input instanceof HTMLInputElement)
      .find((input) => input.classList.contains("cfield"));
    const controlsCell = queryInput?.closest("td");

    if (!(controlsCell instanceof HTMLTableCellElement)) {
      return null;
    }

    return {
      form,
      controlsCell,
      oldContainer:
        controlsCell.closest("table.cajasprin") ||
        controlsCell.closest("table")?.parentElement?.closest("tr") ||
        controlsCell.closest("table"),
    };
  }

  /**
   * @param {HTMLElement} searchSlot
   * @returns {boolean}
   */
  function moveForumHeaderSearchForm(searchSlot) {
    const parts = getForumHeaderSearchFormParts();

    if (!parts) {
      return false;
    }

    if (searchSlot.contains(parts.form)) {
      return true;
    }

    parts.form.classList.add("fc-premium-thread-header-search-form");

    for (const child of Array.from(parts.controlsCell.childNodes)) {
      if (child !== parts.form) {
        parts.form.append(child);
      }
    }

    searchSlot.append(parts.form);

    if (parts.oldContainer instanceof HTMLElement) {
      hideElementAndAdjacentSpacers(parts.oldContainer);
    }

    return true;
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

    const searchSlot = document.createElement("div");
    searchSlot.className = "fc-premium-thread-header-search";
    const movedHeaderSearch = moveForumHeaderSearchForm(searchSlot);

    if (!movedHeaderSearch && searchLink) {
      searchSlot.append(searchLink);
    }

    layout.append(searchSlot);
    cell.append(layout);

    if (searchParentCell instanceof HTMLElement) {
      searchParentCell.setAttribute(FORUM_LAYOUT_HIDDEN_ATTRIBUTE, "true");
    }

    if (breadcrumbOuterTable instanceof HTMLElement) {
      breadcrumbOuterTable.setAttribute(FORUM_LAYOUT_HIDDEN_ATTRIBUTE, "true");
    }
  }

  /**
   * @param {string} postId
   */
  function jumpToLoadedPost(postId) {
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

  /**
   * @param {HTMLElement | null} summary
   * @returns {HTMLElement | null}
   */
  function renderThreadControls(summary) {
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

  /**
   * @param {number} pageNumber
   */
  function setPageFilter(pageNumber) {
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

  /**
   * @param {number} pageNumber
   */
  function togglePageFilter(pageNumber) {
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

  /**
   * @param {number} totalPages
   * @param {number | null} currentPage
   * @returns {number[]}
   */
  function getVisibleThreadPageNumbers(totalPages, currentPage) {
    if (totalPages <= 11) {
      return Array.from({ length: totalPages }, (_value, index) => index + 1);
    }

    const page = currentPage || 1;
    const maxVisible = 11;
    const halfWindow = Math.floor(maxVisible / 2);
    const start = Math.max(
      1,
      Math.min(page - halfWindow, totalPages - maxVisible + 1),
    );

    return Array.from({ length: maxVisible }, (_value, index) => start + index);
  }

  /**
   * @returns {{ total: number, visible: number }}
   */
  function applyPageFilter() {
    const posts = getPostsElement();
    let total = 0;
    let visible = 0;

    if (!posts) {
      return { total, visible };
    }

    for (const wrapper of posts.querySelectorAll(".fc-premium-post-wrapper")) {
      if (!(wrapper instanceof HTMLElement)) {
        continue;
      }

      const pageNumber = Number(wrapper.dataset.fcPremiumOriginalPage || "0");
      const matches = !activePageFilter || pageNumber === activePageFilter;

      total += 1;

      if (matches) {
        visible += 1;
        wrapper.removeAttribute(HIDDEN_POST_PAGE_ATTRIBUTE);
      } else {
        wrapper.setAttribute(HIDDEN_POST_PAGE_ATTRIBUTE, "true");
      }
    }

    return { total, visible };
  }

  /**
   * @returns {HTMLTableElement[]}
   */
  function getOriginalThreadPageNavTables() {
    return Array.from(document.querySelectorAll("table.tborder")).filter(
      (table) => {
        if (!(table instanceof HTMLTableElement)) {
          return false;
        }

        const status = normalizeText(
          table.querySelector("td.vbmenu_control")?.textContent,
        );

        return /^Pág \d+ de \d+$/.test(status);
      },
    );
  }

  /**
   * @param {number} pageNumber
   * @param {number} currentPage
   * @returns {HTMLTableCellElement}
   */
  function createOriginalThreadPageCell(pageNumber, currentPage) {
    const cell = document.createElement("td");
    const isCurrent = pageNumber === currentPage;
    cell.className = isCurrent ? "alt2" : "alt1";

    if (isCurrent) {
      const span = document.createElement("span");
      span.className = "mfont";
      span.title = `Pagina ${pageNumber}`;

      const strong = document.createElement("strong");
      strong.textContent = String(pageNumber);
      span.append(strong);
      cell.append(span);
      return cell;
    }

    const link = document.createElement("a");
    link.className = "mfont";
    link.href = getThreadPageUrl(pageNumber).href;
    link.title = `Mostrar pagina ${pageNumber}`;
    link.textContent = String(pageNumber);
    cell.append(link);
    return cell;
  }

  /**
   * @param {string} text
   * @param {number} pageNumber
   * @returns {HTMLTableCellElement}
   */
  function createOriginalThreadPageActionCell(text, pageNumber) {
    const cell = document.createElement("td");
    cell.className = "alt1";

    const link = document.createElement("a");
    link.className = "smallfont";
    link.href = getThreadPageUrl(pageNumber).href;
    link.textContent = text;
    cell.append(link);
    return cell;
  }

  function updateOriginalThreadPageMenus() {
    if (!isThreadPage() || threadPages.length <= 1 || activeGraphView) {
      return;
    }

    const totalPages = threadPages.length;
    const currentPage =
      activePageFilter || getPageNumber(new URL(location.href));
    const visiblePages = getVisibleThreadPageNumbers(totalPages, currentPage);

    for (const table of getOriginalThreadPageNavTables()) {
      const body = table.tBodies[0] || table.createTBody();
      const row = document.createElement("tr");
      const statusCell = document.createElement("td");
      statusCell.className = "vbmenu_control";
      statusCell.style.fontWeight = "normal";
      statusCell.textContent = `Pág ${currentPage} de ${totalPages}`;
      row.append(statusCell);

      for (const pageNumber of visiblePages) {
        row.append(createOriginalThreadPageCell(pageNumber, currentPage));
      }

      if (currentPage < totalPages) {
        row.append(createOriginalThreadPageActionCell(">", currentPage + 1));
      }

      if (currentPage !== totalPages) {
        row.append(createOriginalThreadPageActionCell("Último »", totalPages));
      }

      body.textContent = "";
      body.append(row);
    }
  }

  /**
   * @param {HTMLAnchorElement} link
   * @returns {number | null}
   */
  function getOriginalThreadPageLinkNumber(link) {
    const table = link.closest("table.tborder");

    if (!(table instanceof HTMLTableElement)) {
      return null;
    }

    const status = normalizeText(
      table.querySelector("td.vbmenu_control")?.textContent,
    );

    if (!/^Pág \d+ de \d+$/.test(status)) {
      return null;
    }

    const url = toUrl(link.getAttribute("href") || link.href);

    if (!url || getThreadId(url) !== getThreadId(new URL(location.href))) {
      return null;
    }

    return getPageNumber(url);
  }

  /**
   * @param {MouseEvent} event
   */
  function handleThreadPageNavigationClick(event) {
    const link =
      event.target instanceof Element
        ? event.target.closest("a[href*='showthread.php']")
        : null;

    if (!(link instanceof HTMLAnchorElement)) {
      return;
    }

    const pageNumber = getOriginalThreadPageLinkNumber(link);

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
    if (!activeAuthorFilter && !activeGraphView) {
      return;
    }

    activeAuthorFilter = null;
    activeGraphView = null;
    pendingGraphView = null;
    activePageFilter = getPageNumber(new URL(location.href));
    updateThreadPageUrl(activePageFilter);
    updateOriginalThreadPageMenus();
    renderThreadPosts(loadedThreadPosts);
    renderThreadSummaryMenu(document.getElementById(THREAD_SUMMARY_ID));
  }

  /**
   * @param {string} author
   */
  function toggleAuthorFilter(author) {
    if (!isThreadPage()) {
      return;
    }

    const authorKey = normalizeAuthorName(author);

    if (!authorKey) {
      return;
    }

    activeAuthorFilter = activeAuthorFilter === authorKey ? null : authorKey;
    syncThreadStateUrl();
    applyAuthorFilter();
    renderThreadSummaryMenu(document.getElementById(THREAD_SUMMARY_ID));
    refreshNavigation({ reset: true });
  }

  function clearAuthorFilter() {
    if (!activeAuthorFilter) {
      return;
    }

    activeAuthorFilter = null;
    syncThreadStateUrl();
    applyAuthorFilter();
    renderThreadSummaryMenu(document.getElementById(THREAD_SUMMARY_ID));
    refreshNavigation({ reset: true });
  }

  /**
   * @returns {{ total: number, visible: number }}
   */
  function applyAuthorFilter() {
    const posts = getPostsElement();
    let total = 0;
    let visible = 0;

    if (!posts) {
      return { total, visible };
    }

    for (const wrapper of posts.querySelectorAll(".fc-premium-post-wrapper")) {
      if (!(wrapper instanceof HTMLElement)) {
        continue;
      }

      const authorKey = wrapper.dataset.fcPremiumAuthor || "";
      const matches = !activeAuthorFilter || authorKey === activeAuthorFilter;

      total += 1;

      if (matches) {
        visible += 1;
        wrapper.removeAttribute(HIDDEN_POST_ATTRIBUTE);
      } else {
        wrapper.setAttribute(HIDDEN_POST_ATTRIBUTE, "true");
      }
    }

    return { total, visible };
  }

  /**
   * @param {HTMLElement} wrapper
   * @param {string} author
   */
  function enhanceAuthorFilterButton(wrapper, author) {
    const authorKey = normalizeAuthorName(author);

    if (!authorKey) {
      return;
    }

    wrapper.dataset.fcPremiumAuthor = authorKey;

    const username = wrapper.querySelector(".bigusername");

    if (!(username instanceof HTMLElement)) {
      return;
    }

    const existingButton = username.parentElement?.querySelector(
      ".fc-premium-author-filter-button",
    );

    if (existingButton) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "fc-premium-author-filter-button";
    button.textContent = "filtrar";
    button.title = `Filtrar mensajes de ${author}`;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleAuthorFilter(author);
    });
    username.after(button);
  }

  /**
   * @param {PostRecord[]} posts
   */
  function applyReplyCounts(posts) {
    const repliesByPostId = new Map();

    for (const post of posts) {
      for (const quotedPostId of post.quotedPostIds) {
        if (!repliesByPostId.has(quotedPostId)) {
          repliesByPostId.set(quotedPostId, new Set());
        }

        repliesByPostId.get(quotedPostId).add(post.id);
      }
    }

    for (const post of posts) {
      post.replyingPostIds = Array.from(repliesByPostId.get(post.id) || []);
      post.replyCount = post.replyingPostIds.length;
    }
  }

  /**
   * @returns {ThreadGraph}
   */
  function createEmptyThreadGraph() {
    return {
      postById: new Map(),
      quotedByPostId: new Map(),
      quotingByPostId: new Map(),
      neighborsByPostId: new Map(),
      chronologicalNextByPostId: new Map(),
    };
  }

  /**
   * @param {Map<string, Set<string>>} map
   * @param {string} key
   * @returns {Set<string>}
   */
  function ensureGraphSet(map, key) {
    if (!map.has(key)) {
      map.set(key, new Set());
    }

    return map.get(key);
  }

  /**
   * @param {PostRecord[]} posts
   * @returns {ThreadGraph}
   */
  function buildThreadGraph(posts) {
    const graph = createEmptyThreadGraph();
    const chronologicalPosts = sortPostsChronologically(posts);

    for (const post of chronologicalPosts) {
      graph.postById.set(post.id, post);
      ensureGraphSet(graph.quotedByPostId, post.id);
      ensureGraphSet(graph.quotingByPostId, post.id);
      ensureGraphSet(graph.neighborsByPostId, post.id);
    }

    for (let index = 0; index < chronologicalPosts.length; index += 1) {
      const post = chronologicalPosts[index];
      const nextPost = chronologicalPosts[index + 1] || null;
      graph.chronologicalNextByPostId.set(post.id, nextPost?.id || null);
    }

    for (const post of chronologicalPosts) {
      for (const quotedPostId of post.quotedPostIds) {
        if (!graph.postById.has(quotedPostId)) {
          continue;
        }

        ensureGraphSet(graph.quotedByPostId, quotedPostId).add(post.id);
        ensureGraphSet(graph.quotingByPostId, post.id).add(quotedPostId);
        ensureGraphSet(graph.neighborsByPostId, quotedPostId).add(post.id);
        ensureGraphSet(graph.neighborsByPostId, post.id).add(quotedPostId);
      }
    }

    return graph;
  }

  /**
   * @param {string[]} postIds
   * @returns {PostRecord[]}
   */
  function getChronologicalGraphPosts(postIds) {
    const ids = new Set(postIds);

    return sortPostsChronologically(loadedThreadPosts).filter((post) =>
      ids.has(post.id),
    );
  }

  /**
   * @param {PostRecord} post
   * @param {string | null} preferredPostId
   * @returns {string | null}
   */
  function getConversationParentPostId(post, preferredPostId) {
    if (
      preferredPostId &&
      post.quotedPostIds.includes(preferredPostId) &&
      threadGraph.postById.has(preferredPostId)
    ) {
      return preferredPostId;
    }

    return (
      post.quotedPostIds.find((postId) => threadGraph.postById.has(postId)) ||
      null
    );
  }

  /**
   * @param {ActiveGraphView} view
   * @returns {PostRecord[]}
   */
  function getConversationChainPosts(view) {
    const chain = [];
    const seen = new Set();
    let currentPost = threadGraph.postById.get(view.rootPostId) || null;
    let preferredParentPostId = view.relatedPostId;

    while (currentPost && !seen.has(currentPost.id)) {
      chain.push(currentPost);
      seen.add(currentPost.id);

      const parentPostId = getConversationParentPostId(
        currentPost,
        preferredParentPostId,
      );

      preferredParentPostId = null;
      currentPost = parentPostId
        ? threadGraph.postById.get(parentPostId) || null
        : null;
    }

    return chain.reverse();
  }

  /**
   * @param {ActiveGraphView} view
   * @returns {PostRecord[]}
   */
  function getPostsForGraphView(view) {
    const root = threadGraph.postById.get(view.rootPostId);

    if (!root) {
      return [];
    }

    if (view.type === "quoted-sources") {
      return getChronologicalGraphPosts([...root.quotedPostIds, root.id]);
    }

    if (view.type === "quoted-by") {
      const replyPosts = getChronologicalGraphPosts(
        Array.from(threadGraph.quotedByPostId.get(root.id) || []),
      ).filter((post) => post.id !== root.id);

      return [root, ...replyPosts];
    }

    return getConversationChainPosts(view);
  }

  /**
   * @param {ActiveGraphView} view
   * @returns {string}
   */
  function getGraphViewLabel(view) {
    const root = threadGraph.postById.get(view.rootPostId);
    const rootLabel = root ? `#${root.postNumber}` : `#${view.rootPostId}`;

    if (view.type === "quoted-sources") {
      return `citas usadas por ${rootLabel}`;
    }

    if (view.type === "quoted-by") {
      return `${rootLabel} y sus citadores`;
    }

    return `conversacion de ${rootLabel}`;
  }

  /**
   * @param {GraphViewType} type
   * @param {string} rootPostId
   * @param {string | null} [relatedPostId]
   * @param {{ history?: "push" | "replace", scrollToFirstPost?: boolean, scrollToFirstReply?: boolean }} [options]
   */
  function setActiveGraphView(
    type,
    rootPostId,
    relatedPostId = null,
    options = {},
  ) {
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
      const viewPosts = getPostsForGraphView(activeGraphView);
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

  /**
   * @param {ThreadQueryState} queryState
   * @returns {ActiveGraphView | null}
   */
  function getValidGraphViewFromQueryState(queryState) {
    if (
      queryState.graphView &&
      threadGraph.postById.has(queryState.graphView.rootPostId)
    ) {
      return queryState.graphView;
    }

    return null;
  }

  /**
   * @param {URL} [url]
   */
  function applyThreadUrlState(url = new URL(location.href)) {
    if (!isThreadPage() || loadedThreadPosts.length === 0) {
      return;
    }

    const queryState = readThreadQueryState(url);
    activeGraphView = getValidGraphViewFromQueryState(queryState);
    pendingGraphView = null;
    activePageFilter = activeGraphView
      ? null
      : queryState.pageFilter || getPageNumber(url);
    activeAuthorFilter = queryState.authorFilter;

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

  function onThreadHistoryPopState() {
    applyThreadUrlState();
  }

  function installThreadHistoryNavigation() {
    window.addEventListener("popstate", onThreadHistoryPopState);
  }

  /**
   * @param {PostRecord[]} posts
   */
  function applyOriginalPosterFlags(posts) {
    const firstPost = posts
      .slice()
      .sort((left, right) => left.originalIndex - right.originalIndex)[0];
    const originalPoster = firstPost?.author.toLowerCase();

    if (!originalPoster) {
      return;
    }

    for (const post of posts) {
      post.isOriginalPoster = post.author.toLowerCase() === originalPoster;
    }
  }

  /**
   * @param {PostRecord[]} posts
   * @returns {PostRecord[]}
   */
  function sortPosts(posts) {
    return posts.slice().sort((left, right) => {
      if (left.replyCount !== right.replyCount) {
        return right.replyCount - left.replyCount;
      }

      return left.originalIndex - right.originalIndex;
    });
  }

  /**
   * @param {PostRecord[]} posts
   * @returns {PostRecord[]}
   */
  function sortPostsChronologically(posts) {
    return posts
      .slice()
      .sort((left, right) => left.originalIndex - right.originalIndex);
  }

  /**
   * @param {PostRecord[]} posts
   * @returns {PostRecord | null}
   */
  function getTopCitedPost(posts) {
    return sortPosts(posts).find((post) => post.replyCount > 0) || null;
  }

  /**
   * @param {PostRecord[]} posts
   * @param {number} limit
   * @returns {PostRecord[]}
   */
  function getPromotedCitedPosts(posts, limit) {
    const firstPost = sortPostsChronologically(posts)[0];

    return sortPosts(posts)
      .filter((post) => post.replyCount > 0)
      .slice(0, limit)
      .filter((post) => post.id !== firstPost?.id);
  }

  /**
   * @param {PostRecord[]} posts
   * @returns {PostRecord[]}
   */
  function getFeaturedChronologicalPosts(posts) {
    const chronologicalPosts = sortPostsChronologically(posts);

    if (activePageFilter) {
      return chronologicalPosts;
    }

    const firstPost = chronologicalPosts[0];
    const promotedPosts = getPromotedCitedPosts(posts, 3);

    if (!firstPost || promotedPosts.length === 0) {
      return chronologicalPosts;
    }

    const promotedPostIds = new Set(promotedPosts.map((post) => post.id));

    return [
      firstPost,
      ...promotedPosts,
      ...chronologicalPosts.filter(
        (post) => post.id !== firstPost.id && !promotedPostIds.has(post.id),
      ),
    ];
  }

  /**
   * @param {PostRecord[]} posts
   * @returns {PostRecord[]}
   */
  function getThreadViewPosts(posts) {
    if (activeGraphView) {
      return getPostsForGraphView(activeGraphView);
    }

    return getFeaturedChronologicalPosts(posts);
  }

  /**
   * @param {PostRecord} post
   * @param {number} index
   * @returns {number}
   */
  function getReplyIndentDepth(post, index) {
    if (!activeGraphView) {
      return 0;
    }

    if (activeGraphView.type === "quoted-by") {
      return post.id === activeGraphView.rootPostId ? 0 : 1;
    }

    if (activeGraphView.type === "conversation") {
      return index === 0 ? 0 : 1;
    }

    if (activeGraphView.type === "quoted-sources") {
      return post.id === activeGraphView.rootPostId ? 1 : 0;
    }

    return 0;
  }

  /**
   * @param {PostRecord[]} posts
   * @returns {Map<string, number>}
   */
  function getReplyRankByPostId(posts) {
    const rankByPostId = new Map();
    let rank = 0;

    for (const post of sortPosts(posts)) {
      if (post.replyCount <= 0) {
        continue;
      }

      rank += 1;
      rankByPostId.set(post.id, rank);
    }

    return rankByPostId;
  }

  /**
   * @param {string} postId
   * @param {{ scroll?: boolean, updateUrl?: boolean }} [options]
   */
  function selectPostById(postId, options = {}) {
    const table = document.getElementById(`post${postId}`);
    const wrapper = table?.closest(".fc-premium-post-wrapper");

    if (!(wrapper instanceof HTMLElement)) {
      return;
    }

    selectNavigationElement(wrapper, options);
  }

  /**
   * @param {HTMLElement} wrapper
   */
  function enhanceQuoteLinks(wrapper) {
    const sourcePostId = getPostIdFromNavigationElement(wrapper);

    for (const link of wrapper.querySelectorAll(
      "a[href*='showthread.php?p='][href*='#post']",
    )) {
      if (!(link instanceof HTMLAnchorElement)) {
        continue;
      }

      const quotedPostId = getQuotedPostId(
        link.getAttribute("href") || link.href,
      );

      if (!quotedPostId) {
        continue;
      }

      link.dataset.fcPremiumQuoteTarget = quotedPostId;
      link.title = "Ir al mensaje citado";
      markQuoteBlock(link, quotedPostId, sourcePostId);
      link.addEventListener("click", (event) => {
        const target = document.getElementById(`post${quotedPostId}`);

        if (!target) {
          return;
        }

        event.preventDefault();
        jumpToLoadedPost(quotedPostId);
      });
    }
  }

  /**
   * @param {HTMLAnchorElement} link
   * @param {string} quotedPostId
   * @param {string | null} sourcePostId
   */
  function markQuoteBlock(link, quotedPostId, sourcePostId) {
    const quoteTable = link.closest("table");
    const quoteWrapper = quoteTable?.parentElement;

    if (!(quoteWrapper instanceof HTMLElement)) {
      return;
    }

    quoteWrapper.dataset.fcPremiumQuoteBlock = quotedPostId;
    renderQuoteBlockActions(quoteWrapper, link, sourcePostId, quotedPostId);

    const quoteCell = quoteTable.querySelector("td");
    const body = Array.from(quoteCell?.children || []).find(
      (child) =>
        child instanceof HTMLElement &&
        child !== link.parentElement &&
        child.textContent.trim().length > 0,
    );

    if (body instanceof HTMLElement) {
      body.dataset.fcPremiumQuoteBody = "true";
    }
  }

  /**
   * @param {HTMLElement} quoteWrapper
   * @param {HTMLAnchorElement} quoteLink
   * @param {string | null} sourcePostId
   * @param {string} quotedPostId
   */
  function renderQuoteBlockActions(
    quoteWrapper,
    quoteLink,
    sourcePostId,
    quotedPostId,
  ) {
    if (!sourcePostId) {
      return;
    }

    quoteWrapper.querySelector(".fc-premium-quote-actions")?.remove();

    const targetContainer = quoteLink.parentElement || quoteWrapper;
    const actions = document.createElement("div");
    actions.className = "fc-premium-quote-actions";

    const conversationButton = document.createElement("button");
    conversationButton.type = "button";
    conversationButton.textContent = "Ver conversación";
    conversationButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setActiveGraphView("conversation", sourcePostId, quotedPostId, {
        scrollToFirstPost: true,
      });
    });
    actions.append(conversationButton);
    targetContainer.append(actions);
  }

  /**
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  function isInsidePremiumPostUi(element) {
    return Boolean(
      element.closest(
        ".fc-premium-author-hover-card, .fc-premium-post-reply-actions, .fc-premium-quote-actions",
      ),
    );
  }

  /**
   * @param {HTMLElement} wrapper
   * @returns {HTMLTableRowElement | null}
   */
  function getPostFooterRow(wrapper) {
    const footerSelector =
      "a[href*='report.php?p='], a[href*='newreply.php?do=newreply'], img[src*='statusicon/user_']";
    const rows = Array.from(wrapper.querySelectorAll("tr"));

    return (
      rows.find((row) => {
        if (!(row instanceof HTMLTableRowElement)) {
          return false;
        }

        return Array.from(row.querySelectorAll(footerSelector)).some(
          (control) =>
            control instanceof HTMLElement && !isInsidePremiumPostUi(control),
        );
      }) || null
    );
  }

  /**
   * @param {HTMLElement} wrapper
   * @returns {HTMLImageElement | null}
   */
  function getPostStatusImage(wrapper) {
    const footerRow = getPostFooterRow(wrapper);
    const image = footerRow?.querySelector("img[src*='statusicon/user_']");

    return image instanceof HTMLImageElement ? image : null;
  }

  /**
   * @param {HTMLElement} wrapper
   * @returns {HTMLAnchorElement | null}
   */
  function getPostReportLink(wrapper) {
    const footerRow = getPostFooterRow(wrapper);
    const link = footerRow?.querySelector("a[href*='report.php?p=']");

    return link instanceof HTMLAnchorElement ? link : null;
  }

  /**
   * @param {HTMLAnchorElement} link
   * @returns {boolean}
   */
  function isQuickReplyLink(link) {
    const image = link.querySelector("img");
    const label = `${link.id} ${image?.alt || ""} ${image?.title || ""} ${
      image?.getAttribute("src") || ""
    }`;

    return /quickreply|respuesta rapida|qr_\d+/i.test(label);
  }

  /**
   * @param {HTMLAnchorElement} link
   * @returns {boolean}
   */
  function isQuoteReplyLink(link) {
    const image = link.querySelector("img");
    const label = `${image?.alt || ""} ${image?.title || ""} ${
      image?.getAttribute("src") || ""
    }`;

    return /quote\.gif|multiquote|multi-cita|responder con cita/i.test(label);
  }

  /**
   * @param {HTMLElement} wrapper
   */
  function relocatePostFooterControls(wrapper) {
    const footerRow = getPostFooterRow(wrapper);
    const existingActions = wrapper.querySelector(
      ".fc-premium-post-reply-actions",
    );
    const existingReplyLinks = Array.from(
      existingActions?.querySelectorAll(
        "a[href*='newreply.php?do=newreply']",
      ) || [],
    ).filter((link) => link instanceof HTMLAnchorElement);
    existingActions?.remove();

    const footerReplyLinks = Array.from(
      footerRow?.querySelectorAll("a[href*='newreply.php?do=newreply']") || [],
    ).filter((link) => link instanceof HTMLAnchorElement);
    const replyLinks = [...footerReplyLinks, ...existingReplyLinks].filter(
      (link) => !isQuickReplyLink(link) && isQuoteReplyLink(link),
    );

    for (const link of footerReplyLinks) {
      if (isQuickReplyLink(link)) {
        link.remove();
      }
    }

    if (replyLinks.length > 0) {
      const actions = document.createElement("div");
      actions.className = "fc-premium-post-reply-actions";

      for (const link of replyLinks) {
        actions.append(link);
      }

      wrapper.append(actions);
    }

    if (footerRow) {
      footerRow.classList.add("fc-premium-post-footer-row");
    }
  }

  /**
   * @param {Node} node
   * @returns {boolean}
   */
  function isPreservedHiddenPostMenuNode(node) {
    return (
      node instanceof HTMLElement &&
      (node.classList.contains("vbmenu_popup") || /_menu$/.test(node.id))
    );
  }

  /**
   * @param {HTMLImageElement} image
   * @returns {boolean}
   */
  function isSpacerImage(image) {
    const src = image.getAttribute("src") || "";
    return /nada\.gif|clear\.gif|spacer/i.test(src);
  }

  /**
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  function isEmptyPostSeparatorTable(element) {
    if (
      !(element instanceof HTMLTableElement) ||
      !element.classList.contains("cajasprin") ||
      normalizeText(element.textContent)
    ) {
      return false;
    }

    if (element.querySelector("a, button, input, select, textarea")) {
      return false;
    }

    return Array.from(element.querySelectorAll("img")).every(
      (image) => image instanceof HTMLImageElement && isSpacerImage(image),
    );
  }

  /**
   * @param {Node} node
   * @returns {boolean}
   */
  function isRemovableTrailingPostLayoutNode(node) {
    if (
      node.nodeType === Node.TEXT_NODE ||
      node.nodeType === Node.COMMENT_NODE
    ) {
      return true;
    }

    if (node instanceof HTMLBRElement) {
      return true;
    }

    return node instanceof HTMLElement && isEmptyPostSeparatorTable(node);
  }

  /**
   * @param {HTMLElement} wrapper
   */
  function removeTrailingPostLayoutArtifacts(wrapper) {
    const table = wrapper.querySelector(POST_TABLE_SELECTOR);
    const postContainer = table?.closest("div[id^='edit']");

    if (!(table instanceof HTMLElement) || !postContainer) {
      return;
    }

    let node = table.nextSibling;

    while (node) {
      const next = node.nextSibling;

      if (isPreservedHiddenPostMenuNode(node)) {
        node = next;
        continue;
      }

      if (!isRemovableTrailingPostLayoutNode(node)) {
        break;
      }

      node.remove();
      node = next;
    }
  }

  /**
   * @param {HTMLElement} authorCell
   * @returns {string[]}
   */
  function getAuthorHoverLines(authorCell) {
    const lines = [];
    const seen = new Set();

    /**
     * @param {string | null | undefined} text
     */
    const addLine = (text) => {
      const line = normalizeText(text).replace(/\s+filtrar$/, "");

      if (!line || seen.has(line)) {
        return;
      }

      seen.add(line);
      lines.push(line);
    };

    for (const block of authorCell.querySelectorAll(".smallfont")) {
      const childDivs = Array.from(block.children).filter(
        (child) => child instanceof HTMLDivElement,
      );

      if (childDivs.length === 0) {
        addLine(block.textContent);
        continue;
      }

      for (const child of childDivs) {
        addLine(child.textContent);
      }
    }

    return lines.slice(0, 8);
  }

  /**
   * @param {HTMLElement} authorCell
   * @returns {HTMLImageElement | null}
   */
  function getAuthorProfileImage(authorCell) {
    const images = Array.from(authorCell.querySelectorAll("img")).filter(
      (image) => {
        if (!(image instanceof HTMLImageElement)) {
          return false;
        }

        const src = image.getAttribute("src") || "";
        return (
          Boolean(src) && !/statusicon|clear\.gif|spacer|button/i.test(src)
        );
      },
    );

    const avatar =
      images.find((image) =>
        /customavatar|avatar|profilepic|album/i.test(
          image.getAttribute("src") || "",
        ),
      ) ||
      images.find((image) => {
        const width = Number(image.getAttribute("width") || image.width || 0);
        const height = Number(
          image.getAttribute("height") || image.height || 0,
        );
        return width >= 40 || height >= 40;
      });

    if (!avatar) {
      return null;
    }

    const clone = document.createElement("img");
    clone.className = "fc-premium-author-avatar";
    clone.src = avatar.src;
    clone.alt = avatar.alt || "";
    clone.loading = "lazy";
    return clone;
  }

  /**
   * @param {HTMLElement} card
   * @param {HTMLElement} wrapper
   */
  function appendAuthorFooterControls(card, wrapper) {
    const statusImage = getPostStatusImage(wrapper);
    const reportLink = getPostReportLink(wrapper);

    if (!statusImage && !reportLink) {
      return;
    }

    const actions = document.createElement("span");
    actions.className = "fc-premium-author-card-actions";

    if (statusImage) {
      const status = document.createElement("span");
      status.className = "fc-premium-author-status";

      const icon = statusImage.cloneNode(true);
      const label = document.createElement("span");
      label.textContent = statusImage.title || statusImage.alt || "Estado";

      status.append(icon, label);
      actions.append(status);
    }

    if (reportLink) {
      const report = document.createElement("a");
      const reportImage = reportLink.querySelector("img");
      report.className = "fc-premium-author-report-link";
      report.href = reportLink.href;
      report.rel = reportLink.rel;
      report.title =
        reportLink.title ||
        reportImage?.title ||
        reportImage?.alt ||
        "Reportar mensaje";

      if (reportImage instanceof HTMLImageElement) {
        report.append(reportImage.cloneNode(true));
      }

      const label = document.createElement("span");
      label.textContent = "Reportar";
      report.append(label);
      actions.append(report);
    }

    card.append(actions);
  }

  /**
   * @param {PostRecord} post
   * @param {HTMLElement | null} authorCell
   * @param {HTMLElement} wrapper
   * @returns {HTMLElement}
   */
  function createHeaderAuthorMeta(post, authorCell, wrapper) {
    const meta = document.createElement("span");
    meta.className = "fc-premium-header-author";

    const authorLink = authorCell?.querySelector(".bigusername");

    if (authorLink instanceof HTMLAnchorElement) {
      const link = document.createElement("a");
      link.href = authorLink.href;
      link.textContent = post.author || normalizeText(authorLink.textContent);
      meta.append(link);
    } else {
      meta.textContent = post.author;
    }

    if (authorCell instanceof HTMLElement) {
      const card = document.createElement("span");
      card.className = "fc-premium-author-hover-card";
      const avatar = getAuthorProfileImage(authorCell);

      if (avatar) {
        card.append(avatar);
      }

      const title = document.createElement("strong");
      title.textContent = post.author || "Usuario";
      card.append(title);

      for (const line of getAuthorHoverLines(authorCell)) {
        const detail = document.createElement("span");
        detail.textContent = line;
        card.append(detail);
      }

      appendAuthorFooterControls(card, wrapper);
      meta.append(card);
    }

    return meta;
  }

  /**
   * @param {HTMLTableCellElement} cell
   */
  function rememberCellColSpan(cell) {
    if (!cell.dataset.fcPremiumOriginalColspan) {
      cell.dataset.fcPremiumOriginalColspan = String(cell.colSpan || 1);
    }
  }

  /**
   * @param {HTMLTableCellElement} cell
   */
  function applyCompactColSpan(cell) {
    rememberCellColSpan(cell);
    cell.colSpan = Math.max(cell.colSpan, 2);
  }

  /**
   * @param {HTMLTableCellElement} cell
   */
  function restoreOriginalColSpan(cell) {
    const original = Number(cell.dataset.fcPremiumOriginalColspan || "1");
    cell.colSpan = Number.isFinite(original) && original > 0 ? original : 1;
  }

  /**
   * @param {HTMLElement} wrapper
   */
  function updatePostCompactLayout(wrapper) {
    const table = wrapper.querySelector(POST_TABLE_SELECTOR);

    if (!(table instanceof HTMLTableElement)) {
      return;
    }

    const authorCell = table.querySelector(".fc-premium-author-cell");
    const headerRow = table.rows[0] || null;
    const compact = compactModeEnabled;

    for (const row of Array.from(table.rows)) {
      if (row === headerRow) {
        continue;
      }

      const rowHasAuthorCell = Array.from(row.cells).some((cell) =>
        cell.classList.contains("fc-premium-author-cell"),
      );
      const shouldExpandRow = rowHasAuthorCell || row.cells.length === 1;

      for (const cell of Array.from(row.cells)) {
        if (
          !(cell instanceof HTMLTableCellElement) ||
          cell === authorCell ||
          cell.classList.contains("fc-premium-author-cell")
        ) {
          continue;
        }

        if (compact && shouldExpandRow) {
          applyCompactColSpan(cell);
        } else {
          restoreOriginalColSpan(cell);
        }
      }
    }
  }

  function updateRenderedCompactPostLayouts() {
    for (const wrapper of document.querySelectorAll(
      ".fc-premium-post-wrapper",
    )) {
      if (wrapper instanceof HTMLElement) {
        updatePostCompactLayout(wrapper);
      }
    }
  }

  /**
   * @param {HTMLElement} wrapper
   * @param {PostRecord} post
   * @returns {{
   *   dateCell: HTMLTableCellElement | null,
   *   numberCell: HTMLTableCellElement | null
   * }}
   */
  function enhanceNativePostHeader(wrapper, post) {
    const table = wrapper.querySelector(POST_TABLE_SELECTOR);
    const postCountLink = table?.querySelector(`a[id='postcount${post.id}']`);
    const numberCell = postCountLink?.closest("td");
    const headerRow = postCountLink?.closest("tr");
    const dateCell =
      Array.from(headerRow?.children || []).find(
        (cell) => cell instanceof HTMLTableCellElement && cell !== numberCell,
      ) || null;
    const authorCell = table?.querySelector("td[width='175'][rowspan]");

    if (authorCell instanceof HTMLElement) {
      authorCell.classList.add("fc-premium-author-cell");
    }

    const messageCell = table?.querySelector(`#td_post_${post.id}`);

    if (messageCell instanceof HTMLElement) {
      messageCell.classList.add("fc-premium-message-cell");
    }

    if (
      dateCell instanceof HTMLTableCellElement &&
      !dateCell.querySelector(".fc-premium-header-author")
    ) {
      dateCell.classList.add("fc-premium-post-date-cell");
      dateCell.append(createHeaderAuthorMeta(post, authorCell, wrapper));
    }

    if (numberCell instanceof HTMLTableCellElement) {
      numberCell.classList.add("fc-premium-post-number-cell");
    }

    return {
      dateCell: dateCell instanceof HTMLTableCellElement ? dateCell : null,
      numberCell:
        numberCell instanceof HTMLTableCellElement ? numberCell : null,
    };
  }

  /**
   * @param {PostRecord} post
   * @param {number} rank
   * @param {Map<string, PostRecord>} postById
   * @param {number} replyIndentDepth
   * @returns {HTMLElement}
   */
  function renderPost(post, rank, postById, replyIndentDepth) {
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

    if (post.replyCount > 0) {
      wrapper.dataset.fcPremiumReplyCount = String(post.replyCount);
      wrapper.dataset.fcPremiumRank = String(rank);

      const badge = document.createElement("span");
      badge.className = "fc-premium-reply-badge";
      badge.textContent = `${
        post.replyCount === 1 ? "1 cita" : `${post.replyCount} citas`
      }`;
      appendReplyLinks(badge, post, postById);
      (header.dateCell || header.numberCell)?.append(badge);
    }

    updatePostCompactLayout(wrapper);
    return wrapper;
  }

  /**
   * @param {HTMLElement} badge
   * @param {PostRecord} post
   * @param {Map<string, PostRecord>} postById
   */
  function appendReplyLinks(badge, post, postById) {
    const maxLinks = 3;
    const visibleReplyIds = post.replyingPostIds.slice(0, maxLinks);

    if (visibleReplyIds.length === 0) {
      return;
    }

    const label = document.createElement("span");
    label.className = "fc-premium-original-position";
    label.textContent = "·";
    badge.append(label);

    for (const replyingPostId of visibleReplyIds) {
      const reply = postById.get(replyingPostId);
      const link = document.createElement("a");

      link.href = new URL(
        `showthread.php?p=${replyingPostId}#post${replyingPostId}`,
        location.href,
      ).href;
      link.textContent = `#${reply?.postNumber || replyingPostId}`;
      link.addEventListener("click", (event) => {
        if (!document.getElementById(`post${replyingPostId}`)) {
          return;
        }

        event.preventDefault();
        jumpToLoadedPost(replyingPostId);
      });
      badge.append(link);
      badge.append(document.createTextNode(" "));
    }

    if (post.replyingPostIds.length > visibleReplyIds.length) {
      const remaining = document.createElement("span");
      remaining.className = "fc-premium-original-position";
      remaining.textContent = ` +${post.replyingPostIds.length - visibleReplyIds.length}`;
      badge.append(remaining);
    }

    if (post.replyingPostIds.length > 1) {
      const quotedByButton = document.createElement("button");
      quotedByButton.type = "button";
      quotedByButton.textContent = "Ver todas";
      quotedByButton.title = "Ver citadores";
      quotedByButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        setActiveGraphView("quoted-by", post.id, null, {
          scrollToFirstReply: true,
        });
      });
      badge.append(quotedByButton);
    }
  }

  /**
   * @param {PostRecord[]} posts
   */
  function renderThreadPosts(posts) {
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
    applyAuthorFilter();
    applyPageFilter();
    updateOriginalThreadPageMenus();
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

  /**
   * @param {PostRecord[]} posts
   */
  function hydrateThreadPosts(posts) {
    applyReplyCounts(posts);
    applyOriginalPosterFlags(posts);
    loadedThreadPosts = posts.slice();
    threadGraph = buildThreadGraph(loadedThreadPosts);
    activatePendingGraphView();
  }

  /**
   * @returns {Promise<void>}
   */
  async function enhanceThreadPage() {
    ensureStyle();
    hideUnusedTopNavigationBars();
    enhanceThreadHeader();
    hideUnusedTopNavigationBars();

    const summary = ensureThreadSummary();
    const queryState = readThreadQueryState();
    const allPages = getThreadPages();
    const currentPageNumber = getPageNumber(new URL(location.href));
    const pages = [
      ...allPages.filter((page) => page.pageNumber === currentPageNumber),
      ...allPages.filter((page) => page.pageNumber !== currentPageNumber),
    ];
    /** @type {PostRecord[]} */
    const allPosts = [];
    let pageOffset = 0;

    threadPages = allPages;
    loadedThreadPosts = [];
    loadedThreadPageNumbers = new Set();
    threadGraph = createEmptyThreadGraph();
    activeGraphView = null;
    pendingGraphView = queryState.graphView;
    activePageFilter = queryState.graphView
      ? null
      : queryState.pageFilter || currentPageNumber;
    activeAuthorFilter = queryState.authorFilter;

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

      if (page.pageNumber !== pages[pages.length - 1].pageNumber) {
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

  /**
   * @returns {Promise<void>}
   */
  async function init() {
    if (window[INSTANCE_KEY] === SCRIPT_INSTANCE_VERSION) {
      return;
    }

    window[INSTANCE_KEY] = SCRIPT_INSTANCE_VERSION;
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
})();
