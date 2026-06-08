// ==UserScript==
// @name         Forocoches Premium
// @namespace    http://tampermonkey.net/
// @version      2026-06-08-1
// @description  Improves Forocoches thread reading
// @author       victor141516
// @match        https://forocoches.com/foro/*
// @icon         https://forocoches.com/favicon.ico
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  "use strict";

  const STYLE_ID = "fc-premium-style";
  const INSTANCE_KEY = "__fcPremiumThreadEnhancerStarted";
  const TAG_FILTER_BAR_ID = "fc-premium-tag-filter-bar";
  const TOP_TAGS_ID = "fc-premium-top-tags";
  const AUTHOR_FILTER_BAR_ID = "fc-premium-author-filter-bar";
  const THREAD_FILTER_ACTIONS_ID = "fc-premium-thread-filter-actions";
  const FORUM_SIDEBAR_TOGGLE_BAR_ID = "fc-premium-forum-sidebar-toggle-bar";
  const FORUM_SIDEBAR_TOGGLE_ID = "fc-premium-forum-sidebar-toggle";
  const TOP_CITED_ID = "fc-premium-top-cited";
  const TOP_AUTHORS_ID = "fc-premium-top-authors";
  const THREAD_PAGES_ID = "fc-premium-thread-pages";
  const THREAD_PROGRESS_ID = "fc-premium-thread-progress";
  const NAVIGATION_STATUS_ID = "fc-premium-navigation-status";
  const QUOTE_RETURN_ID = "fc-premium-quote-return";
  const THREAD_SUMMARY_ID = "fc-premium-thread-summary";
  const THREAD_CONTROLS_ID = "fc-premium-thread-controls";
  const GLOBAL_COMPACT_TOGGLE_ID = "fc-premium-global-compact-toggle";
  const FORUM_SIDEBAR_HIDDEN_CLASS = "fc-premium-forum-sidebar-hidden";
  const COMPACT_MODE_CLASS = "fc-premium-compact";
  const COMPACT_MODE_STORAGE_KEY = "fcPremiumCompactMode";
  const COMPACT_QUOTES_CLASS = "fc-premium-compact-quotes";
  const COMPACT_QUOTES_STORAGE_KEY = "fcPremiumCompactQuotes";
  const FORUM_SIDEBAR_STORAGE_KEY = "fcPremiumForumSidebarHidden";
  const LOAD_ALL_PAGES_STORAGE_KEY = "fcPremiumLoadAllPages";
  const LAST_SELECTED_POST_STORAGE_PREFIX = "fcPremiumLastPost:";
  const THREAD_CACHE_STORAGE_PREFIX = "fcPremiumThreadCache:";
  const THREAD_VIEW_MODE_STORAGE_KEY = "fcPremiumThreadViewMode";
  const THREAD_CACHE_VERSION = 1;
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
  const THREAD_VIEW_MODES = ["ranked", "original", "cited"];

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
   * @typedef {object} ThreadPage
   * @property {number} pageNumber
   * @property {string} url
   */

  /**
   * @typedef {"ranked" | "original" | "cited"} ThreadViewMode
   */

  /**
   * @typedef {object} AuthorSummary
   * @property {string} key
   * @property {string} label
   * @property {number} count
   * @property {number} firstIndex
   */

  /**
   * @typedef {object} PageSummary
   * @property {number} pageNumber
   * @property {number} count
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
   * @typedef {object} ThreadCacheRecord
   * @property {number} version
   * @property {string} threadId
   * @property {number} totalPages
   * @property {number[]} cachedPageNumbers
   * @property {number} savedAt
   * @property {PostRecord[]} posts
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
  let threadCacheUsed = false;
  /** @type {ThreadGraph} */
  let threadGraph = createEmptyThreadGraph();
  /** @type {ActiveGraphView | null} */
  let activeGraphView = null;
  /** @type {ThreadViewMode} */
  let currentThreadViewMode = getSavedThreadViewMode();
  let compactModeEnabled = getSavedCompactMode();
  let compactQuotesEnabled = getSavedCompactQuotes();
  let forumSidebarHidden = getSavedForumSidebarHidden();
  let loadAllPagesEnabled = getSavedLoadAllPages();
  /** @type {string | null} */
  let activeTagFilter = null;
  /** @type {string | null} */
  let activeAuthorFilter = null;
  /** @type {number | null} */
  let activePageFilter = null;
  /** @type {string | null} */
  let quoteReturnPostId = null;
  /** @type {string | null} */
  let quoteReturnQuotedPostId = null;

  /**
   * @param {string | null | undefined} text
   * @returns {string}
   */
  function normalizeText(text) {
    return (text || "").replace(/\s+/g, " ").trim();
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
   * @param {string | null} mode
   * @returns {mode is ThreadViewMode}
   */
  function isThreadViewMode(mode) {
    return THREAD_VIEW_MODES.includes(mode || "");
  }

  /**
   * @returns {ThreadViewMode}
   */
  function getSavedThreadViewMode() {
    const mode = localStorage.getItem(THREAD_VIEW_MODE_STORAGE_KEY);
    return isThreadViewMode(mode) ? mode : "ranked";
  }

  /**
   * @param {ThreadViewMode} mode
   */
  function setSavedThreadViewMode(mode) {
    currentThreadViewMode = mode;
    localStorage.setItem(THREAD_VIEW_MODE_STORAGE_KEY, mode);
  }

  /**
   * @returns {boolean}
   */
  function getSavedCompactMode() {
    return localStorage.getItem(COMPACT_MODE_STORAGE_KEY) === "true";
  }

  /**
   * @param {boolean} enabled
   */
  function setSavedCompactMode(enabled) {
    compactModeEnabled = enabled;
    localStorage.setItem(COMPACT_MODE_STORAGE_KEY, String(enabled));
    applyCompactMode();
    updateGlobalCompactToggle();
  }

  function applyCompactMode() {
    document.body.classList.toggle(COMPACT_MODE_CLASS, compactModeEnabled);
  }

  function updateGlobalCompactToggle() {
    const toggle = document.getElementById(GLOBAL_COMPACT_TOGGLE_ID);

    if (!(toggle instanceof HTMLButtonElement)) {
      return;
    }

    toggle.textContent = compactModeEnabled ? "Compacto ON" : "Compacto";
    toggle.title = compactModeEnabled
      ? "Desactivar modo compacto"
      : "Activar modo compacto";
    toggle.setAttribute("aria-pressed", String(compactModeEnabled));
  }

  function installGlobalCompactToggle() {
    if (document.getElementById(GLOBAL_COMPACT_TOGGLE_ID)) {
      updateGlobalCompactToggle();
      return;
    }

    const toggle = document.createElement("button");
    toggle.id = GLOBAL_COMPACT_TOGGLE_ID;
    toggle.type = "button";
    toggle.addEventListener("click", () => {
      setSavedCompactMode(!compactModeEnabled);
    });

    const topMenuRow =
      document.querySelector("div.tborder table tr[align='center']") ||
      document.querySelector("div.tborder table tr");

    if (topMenuRow instanceof HTMLTableRowElement) {
      const cell = document.createElement("td");
      cell.className = "vbmenu_control";
      cell.append(toggle);
      topMenuRow.insertBefore(cell, topMenuRow.firstElementChild);
    } else {
      const bar = document.createElement("div");
      bar.id = "fc-premium-global-compact-bar";
      bar.append(toggle);
      document.body.prepend(bar);
    }

    updateGlobalCompactToggle();
  }

  /**
   * @returns {boolean}
   */
  function getSavedCompactQuotes() {
    return localStorage.getItem(COMPACT_QUOTES_STORAGE_KEY) === "true";
  }

  /**
   * @param {boolean} enabled
   */
  function setSavedCompactQuotes(enabled) {
    compactQuotesEnabled = enabled;
    localStorage.setItem(COMPACT_QUOTES_STORAGE_KEY, String(enabled));
    applyCompactQuotes();
  }

  function applyCompactQuotes() {
    document.body.classList.toggle(COMPACT_QUOTES_CLASS, compactQuotesEnabled);
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
   * @returns {boolean}
   */
  function getSavedLoadAllPages() {
    return localStorage.getItem(LOAD_ALL_PAGES_STORAGE_KEY) !== "false";
  }

  /**
   * @param {boolean} enabled
   */
  function setSavedLoadAllPages(enabled) {
    loadAllPagesEnabled = enabled;
    localStorage.setItem(LOAD_ALL_PAGES_STORAGE_KEY, String(enabled));
  }

  /**
   * @returns {string | null}
   */
  function getCurrentThreadPositionKey() {
    const threadId = getThreadId(new URL(location.href));

    return threadId ? `${LAST_SELECTED_POST_STORAGE_PREFIX}${threadId}` : null;
  }

  /**
   * @returns {string | null}
   */
  function getSavedSelectedPostId() {
    const key = getCurrentThreadPositionKey();

    return key ? localStorage.getItem(key) : null;
  }

  /**
   * @param {string} postId
   */
  function setSavedSelectedPostId(postId) {
    const key = getCurrentThreadPositionKey();

    if (key) {
      localStorage.setItem(key, postId);
    }
  }

  /**
   * @returns {string | null}
   */
  function getCurrentThreadCacheKey() {
    const threadId = getThreadId(new URL(location.href));

    return threadId ? `${THREAD_CACHE_STORAGE_PREFIX}${threadId}` : null;
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
      record.version !== THREAD_CACHE_VERSION ||
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
      posts,
    };
  }

  /**
   * @returns {ThreadCacheRecord | null}
   */
  function readCurrentThreadCache() {
    const key = getCurrentThreadCacheKey();

    if (!key) {
      return null;
    }

    try {
      return normalizeThreadCacheRecord(JSON.parse(localStorage.getItem(key)));
    } catch (error) {
      console.warn("Forocoches Premium: cache corrupta", error);
      localStorage.removeItem(key);
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
  function writeCurrentThreadCache(posts, totalPages, cachedPageNumbers) {
    const key = getCurrentThreadCacheKey();
    const threadId = getThreadId(new URL(location.href));

    if (!key || !threadId || posts.length === 0 || cachedPageNumbers.size === 0) {
      return;
    }

    /** @type {ThreadCacheRecord} */
    const record = {
      version: THREAD_CACHE_VERSION,
      threadId,
      totalPages,
      cachedPageNumbers: Array.from(cachedPageNumbers).sort(
        (left, right) => left - right,
      ),
      savedAt: Date.now(),
      posts: posts.map(normalizeCachedPostRecord),
    };

    try {
      localStorage.setItem(key, JSON.stringify(record));
    } catch (error) {
      console.warn("Forocoches Premium: no se pudo guardar la cache", error);
      localStorage.removeItem(key);
    }
  }

  function clearCurrentThreadCache() {
    const key = getCurrentThreadCacheKey();

    if (key) {
      localStorage.removeItem(key);
    }
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${THREAD_SUMMARY_ID} {
        background: #f7faff;
        border: 1px solid #b7d1ff;
        border-radius: 6px;
        box-sizing: border-box;
        color: #17324d;
        font: 12px/1.45 Verdana, Arial, sans-serif;
        margin: 12px auto;
        max-width: 100%;
        padding: 10px 12px;
      }

      #${THREAD_SUMMARY_ID}.fc-premium-summary-stuck {
        box-shadow: 0 4px 12px rgba(23, 50, 77, 0.16);
      }

      #${THREAD_SUMMARY_ID} strong {
        color: #0b57d0;
      }

      #${THREAD_PROGRESS_ID} {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
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

      #${THREAD_CONTROLS_ID} {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }

      #${THREAD_CONTROLS_ID} button {
        background: #fff;
        border: 1px solid #b7d1ff;
        border-radius: 5px;
        color: #17324d;
        cursor: pointer;
        font: 700 11px/1 Verdana, Arial, sans-serif;
        padding: 6px 8px;
      }

      #${THREAD_CONTROLS_ID} button[aria-pressed="true"] {
        background: #0b57d0;
        border-color: #0b57d0;
        color: #fff;
      }

      #${GLOBAL_COMPACT_TOGGLE_ID} {
        background: transparent;
        border: 0;
        color: inherit;
        cursor: pointer;
        font: inherit;
        font-weight: 700;
        padding: 0;
      }

      #${GLOBAL_COMPACT_TOGGLE_ID}[aria-pressed="true"] {
        color: #fff;
      }

      #${TOP_CITED_ID},
      #${TOP_AUTHORS_ID},
      #${THREAD_PAGES_ID} {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }

      #${THREAD_PAGES_ID} {
        gap: 8px;
      }

      #${THREAD_PAGES_ID} table {
        width: auto;
      }

      #${TOP_CITED_ID} span,
      #${TOP_AUTHORS_ID} span,
      #${THREAD_PAGES_ID} span {
        font-weight: 700;
      }

      #${TOP_CITED_ID} a,
      #${TOP_AUTHORS_ID} button,
      #${THREAD_PAGES_ID} button {
        background: #fff;
        border: 1px solid #b7d1ff;
        border-radius: 999px;
        color: #0b57d0;
        cursor: pointer;
        display: inline-block;
        font: 700 11px/1 Verdana, Arial, sans-serif;
        padding: 5px 8px;
        text-decoration: none;
      }

      #${TOP_CITED_ID} a:hover,
      #${TOP_AUTHORS_ID} button:hover,
      #${THREAD_PAGES_ID} button:hover {
        border-color: #0b57d0;
        text-decoration: underline;
        text-underline-offset: 2px;
      }

      #${THREAD_PAGES_ID} button[aria-pressed="true"] {
        background: #0b57d0;
        border-color: #0b57d0;
        color: #fff;
        text-decoration: none;
      }

      #${THREAD_PAGES_ID} .fc-premium-page-nav {
        border-collapse: separate;
        border-spacing: 1px;
        font: 12px/1 Verdana, Arial, sans-serif;
      }

      #${THREAD_PAGES_ID} .fc-premium-page-nav button {
        background: transparent;
        border: 0;
        color: #0b57d0;
        cursor: pointer;
        font: 700 12px/1 Verdana, Arial, sans-serif;
        padding: 0;
      }

      #${THREAD_PAGES_ID} .fc-premium-page-nav button:hover {
        text-decoration: underline;
        text-underline-offset: 2px;
      }

      #${THREAD_PAGES_ID} .fc-premium-page-nav td[aria-current="page"] button,
      #${THREAD_PAGES_ID} .fc-premium-page-nav td[aria-current="true"] button {
        color: #17324d;
        cursor: default;
        text-decoration: none;
      }

      #${NAVIGATION_STATUS_ID} {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }

      #${NAVIGATION_STATUS_ID} span {
        background: #e8f0fe;
        border: 1px solid #b7d1ff;
        border-radius: 999px;
        color: #17324d;
        display: inline-block;
        font: 700 11px/1 Verdana, Arial, sans-serif;
        padding: 5px 8px;
      }

      #${TAG_FILTER_BAR_ID} {
        align-items: center;
        background: #fff7d6;
        border: 1px solid #f0c36d;
        border-radius: 6px;
        box-sizing: border-box;
        color: #4d3417;
        display: flex;
        flex-wrap: wrap;
        font: 12px/1.4 Verdana, Arial, sans-serif;
        gap: 8px;
        margin: 10px auto;
        padding: 8px 10px;
      }

      #${TAG_FILTER_BAR_ID} button {
        background: #fff;
        border: 1px solid #d79721;
        border-radius: 5px;
        color: #4d3417;
        cursor: pointer;
        font: 700 11px/1 Verdana, Arial, sans-serif;
        padding: 5px 8px;
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

      #${AUTHOR_FILTER_BAR_ID} {
        align-items: center;
        background: #eef7ee;
        border: 1px solid #81c995;
        border-radius: 6px;
        box-sizing: border-box;
        color: #174d25;
        display: flex;
        flex-wrap: wrap;
        font: 12px/1.4 Verdana, Arial, sans-serif;
        gap: 8px;
        margin-top: 8px;
        padding: 8px 10px;
      }

      #${AUTHOR_FILTER_BAR_ID} button {
        background: #fff;
        border: 1px solid #34a853;
        border-radius: 5px;
        color: #174d25;
        cursor: pointer;
        font: 700 11px/1 Verdana, Arial, sans-serif;
        padding: 5px 8px;
      }

      #${THREAD_FILTER_ACTIONS_ID} {
        align-items: center;
        background: #f1f3f4;
        border: 1px solid #c4c7c5;
        border-radius: 6px;
        box-sizing: border-box;
        color: #3c4043;
        display: flex;
        flex-wrap: wrap;
        font: 12px/1.4 Verdana, Arial, sans-serif;
        gap: 8px;
        margin-top: 8px;
        padding: 8px 10px;
      }

      #${THREAD_FILTER_ACTIONS_ID} button {
        background: #fff;
        border: 1px solid #80868b;
        border-radius: 5px;
        color: #3c4043;
        cursor: pointer;
        font: 700 11px/1 Verdana, Arial, sans-serif;
        padding: 5px 8px;
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
        background: #fff;
        border: 1px solid #b7d1ff;
        border-radius: 5px;
        color: #17324d;
        cursor: pointer;
        font: 700 11px/1 Verdana, Arial, sans-serif;
        padding: 6px 8px;
      }

      #${FORUM_SIDEBAR_TOGGLE_ID}:hover {
        border-color: #0b57d0;
        color: #0b57d0;
      }

      #${QUOTE_RETURN_ID} {
        align-items: center;
        background: #fff7d6;
        border: 1px solid #f0c36d;
        border-radius: 6px;
        box-sizing: border-box;
        color: #4d3417;
        display: flex;
        flex-wrap: wrap;
        font: 12px/1.4 Verdana, Arial, sans-serif;
        gap: 8px;
        margin-top: 8px;
        padding: 8px 10px;
      }

      #${QUOTE_RETURN_ID} button {
        background: #fff;
        border: 1px solid #d79721;
        border-radius: 5px;
        color: #4d3417;
        cursor: pointer;
        font: 700 11px/1 Verdana, Arial, sans-serif;
        padding: 5px 8px;
      }

      .fc-premium-quote-actions {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-top: 5px;
      }

      .fc-premium-quote-actions button,
      .fc-premium-reply-badge button {
        background: #fff;
        border: 1px solid #b7d1ff;
        border-radius: 999px;
        color: #0b57d0;
        cursor: pointer;
        font: 700 10px/1 Verdana, Arial, sans-serif;
        padding: 4px 7px;
      }

      .fc-premium-quote-actions button:hover,
      .fc-premium-reply-badge button:hover {
        border-color: #0b57d0;
        text-decoration: underline;
        text-underline-offset: 2px;
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
        transition: transform 160ms ease;
      }

      .fc-premium-post-wrapper[data-fc-premium-reply-count] {
        background: #fff7d6;
        box-shadow: 0 0 0 2px #f0c36d;
        padding: 6px;
      }

      .fc-premium-post-wrapper[data-fc-premium-rank="1"] {
        background: #fff0bd;
        box-shadow: 0 0 0 3px #d79721;
      }

      .fc-premium-post-badges {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin: 0 0 6px;
      }

      .fc-premium-reply-badge {
        background: #0b57d0;
        border-radius: 999px;
        color: #fff;
        display: inline-block;
        font: 700 11px/1 Verdana, Arial, sans-serif;
        margin: 0;
        padding: 5px 8px;
      }

      .fc-premium-op-badge {
        background: #e6f4ea;
        border: 1px solid #34a853;
        border-radius: 999px;
        color: #137333;
        display: inline-block;
        font: 700 11px/1 Verdana, Arial, sans-serif;
        padding: 5px 8px;
      }

      .fc-premium-page-badge {
        background: #e8f0fe;
        border: 1px solid #b7d1ff;
        border-radius: 999px;
        color: #17324d;
        display: inline-block;
        font: 700 11px/1 Verdana, Arial, sans-serif;
        padding: 5px 8px;
      }

      .fc-premium-op-badge[data-fc-premium-author-filter],
      .fc-premium-page-badge[role="button"],
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
        color: #fff;
        font-weight: 700;
        margin-left: 4px;
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
        color: #e8f0fe;
        opacity: 0.92;
      }

      .fc-premium-compact-author-meta {
        color: #3c4043;
        display: none;
        font-weight: 700;
        margin-left: 8px;
      }

      .fc-premium-compact-author-meta a {
        color: #0b57d0;
        text-decoration: none;
      }

      .fc-premium-compact-author-meta a:hover {
        text-decoration: underline;
        text-underline-offset: 2px;
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

      body.${COMPACT_QUOTES_CLASS} [data-fc-premium-quote-body] {
        display: none !important;
      }

      body.${COMPACT_QUOTES_CLASS} [data-fc-premium-quote-block] {
        margin-bottom: 8px !important;
        margin-top: 4px !important;
        opacity: 0.88;
      }

      body.${COMPACT_QUOTES_CLASS} [data-fc-premium-quote-block] td.alt2 {
        padding: 5px 8px !important;
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

      body.${COMPACT_MODE_CLASS} #posts td[width="175"] {
        display: none !important;
      }

      body.${COMPACT_MODE_CLASS} #posts td[width="175"][rowspan] .smallfont {
        display: none !important;
      }

      body.${COMPACT_MODE_CLASS} #posts td[width="175"][rowspan] .bigusername {
        display: inline-block;
        font-size: 11px !important;
        max-width: 96px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      body.${COMPACT_MODE_CLASS} #posts table[id^="post"] td {
        padding-bottom: 4px !important;
        padding-top: 4px !important;
      }

      body.${COMPACT_MODE_CLASS} .fc-premium-post-wrapper {
        margin-bottom: 6px;
      }

      body.${COMPACT_MODE_CLASS} #${THREAD_SUMMARY_ID} {
        font-size: 11px;
        margin: 6px auto;
        padding: 6px 8px;
      }

      body.${COMPACT_MODE_CLASS} #${TOP_TAGS_ID},
      body.${COMPACT_MODE_CLASS} #${TAG_FILTER_BAR_ID},
      body.${COMPACT_MODE_CLASS} #${FORUM_SIDEBAR_TOGGLE_BAR_ID} {
        margin-bottom: 5px;
        margin-top: 5px;
        padding: 5px 8px;
      }

      body.${COMPACT_MODE_CLASS} #${THREAD_CONTROLS_ID},
      body.${COMPACT_MODE_CLASS} #${TOP_CITED_ID},
      body.${COMPACT_MODE_CLASS} #${TOP_AUTHORS_ID},
      body.${COMPACT_MODE_CLASS} #${THREAD_PAGES_ID},
      body.${COMPACT_MODE_CLASS} #${NAVIGATION_STATUS_ID} {
        gap: 4px;
        margin-top: 5px;
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

      body.${COMPACT_MODE_CLASS} .fc-premium-compact-author-meta {
        display: inline;
      }

      body.${COMPACT_MODE_CLASS} table.tborder:has(td.navbar),
      body.${COMPACT_MODE_CLASS} table.tborder:has(.navbar),
      body.${COMPACT_MODE_CLASS} #threadtools_menu,
      body.${COMPACT_MODE_CLASS} #threadsearch_menu,
      body.${COMPACT_MODE_CLASS} #threadrating_menu,
      body.${COMPACT_MODE_CLASS} #forumtools_menu,
      body.${COMPACT_MODE_CLASS} #forumsearch_menu {
        display: none !important;
      }
    `;

    document.head.appendChild(style);
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
      renderTagFilterBar();
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
      !(table.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING)
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
      !(table.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING)
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
      cells
        .slice(sidebarIndex + 1, mainIndex)
        .find(isForumSidebarSpacerCell) || null
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
   * @param {HTMLTableCellElement} mainCell
   */
  function renderForumSidebarToggle(mainCell) {
    let bar = document.getElementById(FORUM_SIDEBAR_TOGGLE_BAR_ID);

    if (!(bar instanceof HTMLElement)) {
      bar = document.createElement("div");
      bar.id = FORUM_SIDEBAR_TOGGLE_BAR_ID;

      const button = document.createElement("button");
      button.id = FORUM_SIDEBAR_TOGGLE_ID;
      button.type = "button";
      button.addEventListener("click", () => {
        setSavedForumSidebarHidden(!forumSidebarHidden);
      });
      bar.append(button);
    }

    const button = bar.querySelector("button");

    if (button instanceof HTMLButtonElement) {
      button.textContent = forumSidebarHidden
        ? "Mostrar panel izquierdo"
        : "Ocultar panel izquierdo";
      button.title = forumSidebarHidden
        ? "Mostrar la columna izquierda"
        : "Ocultar la columna izquierda";
      button.setAttribute("aria-expanded", String(!forumSidebarHidden));
    }

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
    removeForumTitleTables();
    applyForumSidebarVisibility();
  }

  /**
   * @param {HTMLAnchorElement} title
   * @returns {string[]}
   */
  function getTitleTags(title) {
    const source = title.title || normalizeText(title.textContent);
    const tags = new Set();

    TAG_PATTERN.lastIndex = 0;

    for (const match of source.matchAll(TAG_PATTERN)) {
      tags.add(match[1].toLowerCase());
    }

    TAG_PATTERN.lastIndex = 0;
    return Array.from(tags);
  }

  /**
   * @param {string} tag
   */
  function toggleTagFilter(tag) {
    if (!isForumDisplayPage()) {
      return;
    }

    activeTagFilter = activeTagFilter === tag ? null : tag;
    applyTagFilter();
    renderTopTagBar();
    renderTagFilterBar();
    refreshNavigation({ reset: true });
  }

  function clearTagFilter() {
    if (!activeTagFilter) {
      return;
    }

    activeTagFilter = null;
    applyTagFilter();
    renderTopTagBar();
    renderTagFilterBar();
    refreshNavigation({ reset: true });
  }

  /**
   * @returns {{ tag: string, count: number, firstIndex: number }[]}
   */
  function getTopTitleTags() {
    const tagsByName = new Map();
    let titleIndex = 0;

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

    const firstTitle = document.querySelector(THREAD_TITLE_SELECTOR);
    const table = firstTitle?.closest("table");

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
   * @returns {{ total: number, visible: number }}
   */
  function applyTagFilter() {
    let total = 0;
    let visible = 0;

    for (const title of document.querySelectorAll(THREAD_TITLE_SELECTOR)) {
      if (!(title instanceof HTMLAnchorElement)) {
        continue;
      }

      const row = getThreadNavigationOwner(title);
      const matches =
        !activeTagFilter || getTitleTags(title).includes(activeTagFilter);

      total += 1;

      if (matches) {
        visible += 1;
        row.removeAttribute(HIDDEN_THREAD_ATTRIBUTE);
      } else {
        row.setAttribute(HIDDEN_THREAD_ATTRIBUTE, "true");
      }
    }

    return { total, visible };
  }

  function renderTagFilterBar() {
    document.getElementById(TAG_FILTER_BAR_ID)?.remove();

    if (!activeTagFilter) {
      applyTagFilter();
      return;
    }

    const counts = applyTagFilter();
    const firstTitle = document.querySelector(THREAD_TITLE_SELECTOR);
    const table = firstTitle?.closest("table");

    if (!table?.parentElement) {
      return;
    }

    const bar = document.createElement("div");
    bar.id = TAG_FILTER_BAR_ID;
    bar.textContent = `Filtro +${activeTagFilter}: ${counts.visible}/${counts.total} hilos`;

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.textContent = "Limpiar";
    clearButton.addEventListener("click", clearTagFilter);
    bar.append(clearButton);
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
   * @param {{ reset?: boolean, scroll?: boolean, persist?: boolean, updateUrl?: boolean }} [options]
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
   * @param {{ scroll?: boolean, persist?: boolean, updateUrl?: boolean }} [options]
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

    if (options.persist !== false && isThreadPage()) {
      const postId = getPostIdFromNavigationElement(selected.element);

      if (postId) {
        setSavedSelectedPostId(postId);
      }
    }

    if (options.updateUrl && isThreadPage()) {
      updateSelectedPostUrl(selected);
    }

    if (options.scroll) {
      selected.element.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
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
      threadPages
        .map((page) => getThreadId(new URL(page.url)))
        .find(Boolean) ||
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

    url.hash = `post${postId}`;
    window.history.replaceState(window.history.state, "", url.href);
  }

  /**
   * @param {NavigationItem | null} selected
   */
  function renderNavigationStatus(selected) {
    if (!isThreadPage()) {
      return;
    }

    const summary = document.getElementById(THREAD_SUMMARY_ID);

    if (!(summary instanceof HTMLElement)) {
      return;
    }

    let status = document.getElementById(NAVIGATION_STATUS_ID);

    if (!(status instanceof HTMLElement)) {
      status = document.createElement("div");
      status.id = NAVIGATION_STATUS_ID;
      summary.append(status);
    }

    status.textContent = "";

    const chip = document.createElement("span");

    if (!selected || navigationItems.length === 0) {
      chip.textContent = "Seleccion: 0/0 mensajes visibles";
      status.append(chip);
      return;
    }

    const postId = getPostIdFromNavigationElement(selected.element);
    const postNumber =
      postId &&
      normalizeText(
        selected.element.querySelector(`#postcount${postId}`)?.textContent,
      );
    const author = normalizeText(
      selected.element.querySelector(".bigusername")?.textContent,
    );
    const pageNumber = selected.element.dataset.fcPremiumOriginalPage;
    const parts = [
      `Seleccion: ${selectedNavigationIndex + 1}/${navigationItems.length}`,
    ];

    if (postNumber) {
      parts.push(postNumber);
    }

    if (author) {
      parts.push(author);
    }

    if (pageNumber) {
      parts.push(`pagina ${pageNumber}`);
    }

    chip.textContent = parts.join(" - ");
    status.append(chip);
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
   */
  function selectNavigationElement(element) {
    const index = navigationItems.findIndex((item) => item.element === element);

    if (index < 0) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    selectedNavigationIndex = index;
    renderNavigationSelection({ scroll: true, updateUrl: true });
  }

  /**
   * @param {number} direction
   * @returns {boolean}
   */
  function moveCitedPostNavigation(direction) {
    if (!isThreadPage()) {
      return false;
    }

    if (navigationItems.length === 0) {
      refreshNavigation({ reset: true });
    }

    if (navigationItems.length === 0) {
      return false;
    }

    const startIndex = Math.min(
      Math.max(selectedNavigationIndex, 0),
      navigationItems.length - 1,
    );

    for (
      let index = startIndex + direction;
      index >= 0 && index < navigationItems.length;
      index += direction
    ) {
      const item = navigationItems[index];

      if (item.element.hasAttribute("data-fc-premium-reply-count")) {
        selectedNavigationIndex = index;
        renderNavigationSelection({ scroll: true, updateUrl: true });
        return true;
      }
    }

    return false;
  }

  function openSelectedNavigationItem() {
    if (isThreadPage()) {
      const selected = navigationItems[selectedNavigationIndex];

      if (selected) {
        updateSelectedPostUrl(selected);
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
   * @param {string} key
   * @returns {ThreadViewMode | null}
   */
  function getThreadViewModeShortcut(key) {
    if (key === "1") {
      return "ranked";
    }

    if (key === "2") {
      return "original";
    }

    if (key === "3") {
      return "cited";
    }

    return null;
  }

  /**
   * @param {KeyboardEvent} event
   * @returns {boolean}
   */
  function handleCitedPostShortcut(event) {
    if (
      !isThreadPage() ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      loadedThreadPosts.length === 0
    ) {
      return false;
    }

    if (event.key !== "[" && event.key !== "]") {
      return false;
    }

    event.preventDefault();
    moveCitedPostNavigation(event.key === "]" ? 1 : -1);
    return true;
  }

  /**
   * @param {KeyboardEvent} event
   * @returns {boolean}
   */
  function handleThreadViewShortcut(event) {
    if (
      !isThreadPage() ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      loadedThreadPosts.length === 0
    ) {
      return false;
    }

    const mode = getThreadViewModeShortcut(event.key);

    if (!mode) {
      return false;
    }

    event.preventDefault();
    switchThreadViewMode(mode);
    return true;
  }

  /**
   * @param {KeyboardEvent} event
   */
  function onNavigationKeyDown(event) {
    if (isEditableTarget(event.target)) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveNavigation(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveNavigation(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectNavigationIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      if (navigationItems.length === 0) {
        refreshNavigation({ reset: true });
      }
      selectNavigationIndex(navigationItems.length - 1);
    } else if (handleCitedPostShortcut(event)) {
      return;
    } else if (handleThreadViewShortcut(event)) {
      return;
    } else if (event.key === "Escape" && activeTagFilter) {
      event.preventDefault();
      clearTagFilter();
    } else if (
      event.key === "Escape" &&
      (activeAuthorFilter || activePageFilter || activeGraphView)
    ) {
      event.preventDefault();
      clearThreadFilters();
    } else if (event.key === "Enter") {
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
    const currentUrl = new URL(location.href);
    /** @type {ThreadPage[]} */
    const pages = [];

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      const url = new URL(currentUrl.href);
      url.searchParams.set("page", String(pageNumber));
      pages.push({ pageNumber, url: url.href });
    }

    return pages;
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

      posts.push({
        id,
        html: wrapper.outerHTML,
        author,
        postNumber,
        pageNumber,
        pageIndex: posts.length,
        originalIndex: pageOffset + posts.length,
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
      cache: "force-cache",
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
    if (!(summary instanceof HTMLElement)) {
      return;
    }

    let progress = document.getElementById(THREAD_PROGRESS_ID);

    if (!(progress instanceof HTMLElement)) {
      progress = document.createElement("div");
      progress.id = THREAD_PROGRESS_ID;
      summary.prepend(progress);
    }

    progress.textContent = "";

    if (state.isLoading) {
      const spinner = document.createElement("span");
      spinner.className = "fc-premium-spinner";
      spinner.setAttribute("aria-hidden", "true");
      progress.append(spinner);
    }

    const text = document.createElement("span");
    const quotedPosts = loadedThreadPosts.filter(
      (post) => post.replyCount > 0,
    ).length;
    const totalReplies = loadedThreadPosts.reduce(
      (total, post) => total + post.replyCount,
      0,
    );
    const pageLabel = `${state.loadedPages}/${state.targetPages}`;
    const loadingText = threadCacheUsed
      ? `${pageLabel} paginas desde cache`
      : state.isLoading
        ? `cargando paginas ${pageLabel}`
        : `${pageLabel} paginas cargadas`;

    text.innerHTML = `<strong>Forocoches Premium:</strong> ${loadingText}. ${state.loadedPosts} mensajes cargados. ${quotedPosts} mensajes tienen citas (${totalReplies} citas en total).`;
    progress.append(text);
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
   * @param {ThreadViewMode} mode
   * @returns {boolean}
   */
  function switchThreadViewMode(mode) {
    if (!isThreadViewMode(mode) || loadedThreadPosts.length === 0) {
      return false;
    }

    if (currentThreadViewMode !== mode) {
      setSavedThreadViewMode(mode);
      renderThreadPosts(loadedThreadPosts, currentThreadViewMode);
    }

    const summary = document.getElementById(THREAD_SUMMARY_ID);
    renderThreadControls(summary instanceof HTMLElement ? summary : null);
    return true;
  }

  /**
   * @param {HTMLElement | null} summary
   */
  function renderThreadSummaryMenu(summary) {
    if (!(summary instanceof HTMLElement)) {
      return;
    }

    renderThreadProgress(summary, threadLoadState);
    renderTopCitedLinks(summary);
    renderTopAuthorLinks(summary);
    renderThreadPageLinks(summary);
    renderThreadControls(summary);
    renderAuthorFilterBar();
    renderThreadFilterActions(summary);
    renderNavigationStatus(navigationItems[selectedNavigationIndex] || null);
    renderQuoteReturnControl(summary);
  }

  /**
   * @param {string} postId
   */
  function jumpToLoadedPost(postId) {
    const post = loadedThreadPosts.find((item) => item.id === postId);

    if (post) {
      activePageFilter = post.pageNumber;
      renderThreadPosts(loadedThreadPosts, currentThreadViewMode);
      renderThreadSummaryMenu(document.getElementById(THREAD_SUMMARY_ID));
    }

    selectPostById(postId);
  }

  /**
   * @param {HTMLElement | null} summary
   */
  function renderThreadControls(summary) {
    if (!summary) {
      return;
    }

    document.getElementById(THREAD_CONTROLS_ID)?.remove();

    const controls = document.createElement("div");
    controls.id = THREAD_CONTROLS_ID;

    const compactQuotesButton = document.createElement("button");
    compactQuotesButton.type = "button";
    compactQuotesButton.textContent = "Citas compactas";
    compactQuotesButton.setAttribute(
      "aria-pressed",
      String(compactQuotesEnabled),
    );
    compactQuotesButton.addEventListener("click", () => {
      setSavedCompactQuotes(!compactQuotesEnabled);
      renderThreadControls(summary);
    });
    controls.append(compactQuotesButton);

    const loadAllButton = document.createElement("button");
    loadAllButton.type = "button";
    loadAllButton.textContent = "Todas paginas";
    loadAllButton.setAttribute("aria-pressed", String(loadAllPagesEnabled));
    loadAllButton.addEventListener("click", () => {
      setSavedLoadAllPages(!loadAllPagesEnabled);
      location.reload();
    });
    controls.append(loadAllButton);

    const cacheButton = document.createElement("button");
    cacheButton.type = "button";
    cacheButton.textContent = "Actualizar cache";
    cacheButton.title = "Borrar la cache de este hilo y volver a cargar paginas";
    cacheButton.addEventListener("click", () => {
      clearCurrentThreadCache();
      location.reload();
    });
    controls.append(cacheButton);

    summary.append(controls);
  }

  /**
   * @param {HTMLElement | null} summary
   */
  function renderTopCitedLinks(summary) {
    if (!summary) {
      return;
    }

    document.getElementById(TOP_CITED_ID)?.remove();

    const topPosts = sortPosts(loadedThreadPosts)
      .filter((post) => post.replyCount > 0)
      .slice(0, 5);

    const strip = document.createElement("div");
    strip.id = TOP_CITED_ID;

    const label = document.createElement("span");
    label.textContent = "Top citados:";
    strip.append(label);

    if (topPosts.length === 0) {
      const empty = document.createElement("span");
      empty.textContent =
        loadedThreadPosts.length === 0 ? "cargando..." : "sin citas todavia";
      strip.append(empty);
      summary.append(strip);
      return;
    }

    for (const post of topPosts) {
      const link = document.createElement("a");
      link.href = `#post${post.id}`;
      link.textContent = `#${post.postNumber} ${post.author || "mensaje"} (${
        post.replyCount
      })`;
      link.addEventListener("click", (event) => {
        event.preventDefault();
        jumpToLoadedPost(post.id);
      });
      strip.append(link);
    }

    summary.append(strip);
  }

  /**
   * @param {PostRecord[]} posts
   * @param {number} limit
   * @returns {AuthorSummary[]}
   */
  function getTopAuthors(posts, limit) {
    /** @type {Map<string, AuthorSummary>} */
    const summariesByAuthor = new Map();

    for (const post of posts) {
      const key = normalizeAuthorName(post.author);

      if (!key) {
        continue;
      }

      const summary = summariesByAuthor.get(key);

      if (summary) {
        summary.count += 1;
      } else {
        summariesByAuthor.set(key, {
          key,
          label: post.author,
          count: 1,
          firstIndex: post.originalIndex,
        });
      }
    }

    return Array.from(summariesByAuthor.values())
      .filter((summary) => summary.count > 1)
      .sort((left, right) => {
        if (left.count !== right.count) {
          return right.count - left.count;
        }

        return left.firstIndex - right.firstIndex;
      })
      .slice(0, limit);
  }

  /**
   * @param {HTMLElement | null} summary
   */
  function renderTopAuthorLinks(summary) {
    if (!summary) {
      return;
    }

    document.getElementById(TOP_AUTHORS_ID)?.remove();

    const topAuthors = getTopAuthors(loadedThreadPosts, 5);

    if (topAuthors.length === 0) {
      return;
    }

    const strip = document.createElement("div");
    strip.id = TOP_AUTHORS_ID;

    const label = document.createElement("span");
    label.textContent = "Top autores:";
    strip.append(label);

    if (topAuthors.length === 0) {
      const empty = document.createElement("span");
      empty.textContent =
        loadedThreadPosts.length === 0 ? "cargando..." : "calculando...";
      strip.append(empty);
      summary.append(strip);
      return;
    }

    for (const author of topAuthors) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `${author.label} (${author.count})`;
      button.title = `Filtrar mensajes de ${author.label}`;
      button.addEventListener("click", () => {
        toggleAuthorFilter(author.label);
      });
      strip.append(button);
    }

    summary.append(strip);
  }

  /**
   * @param {PostRecord[]} posts
   * @returns {PageSummary[]}
   */
  function getPageSummaries(posts) {
    /** @type {Map<number, PageSummary>} */
    const summariesByPage = new Map();

    for (const post of posts) {
      const summary = summariesByPage.get(post.pageNumber);

      if (summary) {
        summary.count += 1;
      } else {
        summariesByPage.set(post.pageNumber, {
          pageNumber: post.pageNumber,
          count: 1,
        });
      }
    }

    return Array.from(summariesByPage.values()).sort(
      (left, right) => left.pageNumber - right.pageNumber,
    );
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
    renderThreadPosts(loadedThreadPosts, currentThreadViewMode);
    renderThreadSummaryMenu(document.getElementById(THREAD_SUMMARY_ID));
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
    if (!activePageFilter) {
      return;
    }

    activePageFilter = null;
    renderThreadPosts(loadedThreadPosts, currentThreadViewMode);
    renderThreadSummaryMenu(document.getElementById(THREAD_SUMMARY_ID));
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
    const start = Math.max(1, Math.min(page - halfWindow, totalPages - maxVisible + 1));

    return Array.from({ length: maxVisible }, (_value, index) => start + index);
  }

  /**
   * @param {string} text
   * @param {string} className
   * @param {boolean} pressed
   * @param {boolean} enabled
   * @param {() => void} onClick
   * @returns {HTMLTableCellElement}
   */
  function createThreadPageNavCell(text, className, pressed, enabled, onClick) {
    const cell = document.createElement("td");
    cell.className = className;

    if (pressed) {
      cell.setAttribute("aria-current", text === "Todas" ? "true" : "page");
    }

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.disabled = !enabled;

    if (enabled) {
      button.addEventListener("click", onClick);
    }

    cell.append(button);
    return cell;
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
   * @param {HTMLElement | null} summary
   */
  function renderThreadPageLinks(summary) {
    document.getElementById(THREAD_PAGES_ID)?.remove();

    if (!summary || threadPages.length <= 1) {
      return;
    }

    const pages = getPageSummaries(loadedThreadPosts);
    const countByPage = new Map(
      pages.map((page) => [page.pageNumber, page.count]),
    );
    const totalPages = threadPages.length;
    const currentPage = activePageFilter || null;
    const visiblePages = getVisibleThreadPageNumbers(totalPages, currentPage);

    const strip = document.createElement("div");
    strip.id = THREAD_PAGES_ID;

    const label = document.createElement("span");
    label.textContent = "Paginas:";
    strip.append(label);

    const nav = document.createElement("table");
    nav.className = "tborder fc-premium-page-nav";
    nav.cellPadding = "3";
    nav.cellSpacing = "1";
    nav.border = "0";

    const body = document.createElement("tbody");
    const row = document.createElement("tr");
    const statusCell = document.createElement("td");
    statusCell.className = "vbmenu_control";
    statusCell.style.fontWeight = "normal";
    statusCell.textContent = activePageFilter
      ? `Pag ${activePageFilter} de ${totalPages}`
      : `Pag 1 de ${totalPages}`;
    row.append(statusCell);

    row.append(
      createThreadPageNavCell(
        "Todas",
        activePageFilter ? "alt1" : "alt2",
        !activePageFilter,
        true,
        clearPageFilter,
      ),
    );

    for (const pageNumber of visiblePages) {
      const count = countByPage.get(pageNumber);
      const title = count
        ? `Pagina ${pageNumber}: ${count} mensajes cargados`
        : `Pagina ${pageNumber}: pendiente de cargar`;
      const cell = createThreadPageNavCell(
        String(pageNumber),
        activePageFilter === pageNumber ? "alt2" : "alt1",
        activePageFilter === pageNumber,
        true,
        () => setPageFilter(pageNumber),
      );
      cell.title = title;
      row.append(cell);
    }

    const nextPage = activePageFilter
      ? Math.min(activePageFilter + 1, totalPages)
      : 1;
    row.append(
      createThreadPageNavCell(
        ">",
        "alt1",
        false,
        Boolean(activePageFilter && activePageFilter < totalPages),
        () => setPageFilter(nextPage),
      ),
    );
    row.append(
      createThreadPageNavCell(
        "Ultimo »",
        "alt1",
        activePageFilter === totalPages,
        true,
        () => setPageFilter(totalPages),
      ),
    );

    body.append(row);
    nav.append(body);
    strip.append(nav);
    summary.append(strip);
    applyPageFilter();
  }

  /**
   * @returns {string[]}
   */
  function getActiveThreadFilterLabels() {
    /** @type {string[]} */
    const labels = [];

    if (activeGraphView) {
      labels.push(`vista ${getGraphViewLabel(activeGraphView)}`);
    }

    if (activeAuthorFilter) {
      labels.push(`autor ${getAuthorFilterLabel(activeAuthorFilter)}`);
    }

    if (activePageFilter) {
      labels.push(`pagina ${activePageFilter}`);
    }

    return labels;
  }

  function clearThreadFilters() {
    if (!activeAuthorFilter && !activePageFilter && !activeGraphView) {
      return;
    }

    activeAuthorFilter = null;
    activePageFilter = null;
    activeGraphView = null;
    renderThreadPosts(loadedThreadPosts, currentThreadViewMode);
    renderThreadSummaryMenu(document.getElementById(THREAD_SUMMARY_ID));
  }

  /**
   * @returns {{ total: number, visible: number, hidden: number }}
   */
  function getThreadFilterVisibilityCounts() {
    const posts = getPostsElement();
    let total = 0;
    let visible = 0;

    if (!posts) {
      return { total, visible, hidden: 0 };
    }

    for (const wrapper of posts.querySelectorAll(".fc-premium-post-wrapper")) {
      if (!(wrapper instanceof HTMLElement)) {
        continue;
      }

      total += 1;

      if (
        !wrapper.hasAttribute(HIDDEN_POST_ATTRIBUTE) &&
        !wrapper.hasAttribute(HIDDEN_POST_PAGE_ATTRIBUTE)
      ) {
        visible += 1;
      }
    }

    return { total, visible, hidden: total - visible };
  }

  /**
   * @param {HTMLElement | null} summary
   */
  function renderThreadFilterActions(summary) {
    document.getElementById(THREAD_FILTER_ACTIONS_ID)?.remove();

    if (
      !(summary instanceof HTMLElement) ||
      (!activeAuthorFilter && !activePageFilter && !activeGraphView)
    ) {
      return;
    }

    const bar = document.createElement("div");
    bar.id = THREAD_FILTER_ACTIONS_ID;
    const counts = getThreadFilterVisibilityCounts();
    bar.textContent = `Filtros activos: ${getActiveThreadFilterLabels().join(
      " + ",
    )}. Visibles: ${counts.visible}/${counts.total}`;

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.textContent = "Limpiar filtros";
    clearButton.addEventListener("click", clearThreadFilters);
    bar.append(clearButton);
    summary.append(bar);
  }

  /**
   * @param {string} authorKey
   * @returns {string}
   */
  function getAuthorFilterLabel(authorKey) {
    const matchingPost = loadedThreadPosts.find(
      (post) => normalizeAuthorName(post.author) === authorKey,
    );

    return matchingPost?.author || authorKey;
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
    applyAuthorFilter();
    renderAuthorFilterBar();
    renderThreadFilterActions(document.getElementById(THREAD_SUMMARY_ID));
    refreshNavigation({ reset: true, persist: false });
  }

  function clearAuthorFilter() {
    if (!activeAuthorFilter) {
      return;
    }

    activeAuthorFilter = null;
    applyAuthorFilter();
    renderAuthorFilterBar();
    renderThreadFilterActions(document.getElementById(THREAD_SUMMARY_ID));
    refreshNavigation({ reset: true, persist: false });
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

  function renderAuthorFilterBar() {
    document.getElementById(AUTHOR_FILTER_BAR_ID)?.remove();

    if (!activeAuthorFilter) {
      applyAuthorFilter();
      return;
    }

    const summary = document.getElementById(THREAD_SUMMARY_ID);

    if (!(summary instanceof HTMLElement)) {
      return;
    }

    const counts = applyAuthorFilter();
    const label = getAuthorFilterLabel(activeAuthorFilter);
    const bar = document.createElement("div");
    bar.id = AUTHOR_FILTER_BAR_ID;
    bar.textContent = `Autor ${label}: ${counts.visible}/${counts.total} mensajes`;

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.textContent = "Limpiar";
    clearButton.addEventListener("click", clearAuthorFilter);
    bar.append(clearButton);
    summary.append(bar);
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
      return getChronologicalGraphPosts([
        root.id,
        ...Array.from(threadGraph.quotedByPostId.get(root.id) || []),
      ]);
    }

    const queue = [root.id];
    const seen = new Set(queue);

    if (view.relatedPostId && threadGraph.postById.has(view.relatedPostId)) {
      queue.push(view.relatedPostId);
      seen.add(view.relatedPostId);
    }

    for (let index = 0; index < queue.length; index += 1) {
      const postId = queue[index];

      for (const nextId of threadGraph.neighborsByPostId.get(postId) || []) {
        if (seen.has(nextId)) {
          continue;
        }

        seen.add(nextId);
        queue.push(nextId);
      }
    }

    return getChronologicalGraphPosts(Array.from(seen));
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
   */
  function setActiveGraphView(type, rootPostId, relatedPostId = null) {
    if (!threadGraph.postById.has(rootPostId)) {
      return;
    }

    activeGraphView = {
      type,
      rootPostId,
      relatedPostId,
    };
    activePageFilter = null;
    renderThreadPosts(loadedThreadPosts, currentThreadViewMode);
    renderThreadSummaryMenu(document.getElementById(THREAD_SUMMARY_ID));
  }

  function clearActiveGraphView() {
    if (!activeGraphView) {
      return;
    }

    activeGraphView = null;
    renderThreadPosts(loadedThreadPosts, currentThreadViewMode);
    renderThreadSummaryMenu(document.getElementById(THREAD_SUMMARY_ID));
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
   * @param {ThreadViewMode} mode
   * @returns {string}
   */
  function getThreadViewModeLabel(mode) {
    if (mode === "original") {
      return "Original";
    }

    if (mode === "cited") {
      return "Solo citados";
    }

    return "Citas";
  }

  /**
   * @param {PostRecord[]} posts
   * @param {ThreadViewMode} mode
   * @returns {PostRecord[]}
   */
  function getPostsForView(posts, mode) {
    void mode;

    if (activeGraphView) {
      return getPostsForGraphView(activeGraphView);
    }

    return getFeaturedChronologicalPosts(posts);
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
   */
  function selectPostById(postId) {
    const table = document.getElementById(`post${postId}`);
    const wrapper = table?.closest(".fc-premium-post-wrapper");

    if (!(wrapper instanceof HTMLElement)) {
      return;
    }

    selectNavigationElement(wrapper);
  }

  /**
   * @param {string} postId
   * @returns {string}
   */
  function getPostJumpLabel(postId) {
    const table = document.getElementById(`post${postId}`);
    const wrapper = table?.closest(".fc-premium-post-wrapper");
    const postNumber = normalizeText(
      wrapper?.querySelector(`#postcount${postId}`)?.textContent,
    );
    const author = normalizeText(
      wrapper?.querySelector(".bigusername")?.textContent,
    );
    const pageNumber =
      wrapper instanceof HTMLElement
        ? wrapper.dataset.fcPremiumOriginalPage
        : "";
    const parts = [];

    if (postNumber) {
      parts.push(`#${postNumber}`);
    }

    if (author) {
      parts.push(author);
    }

    if (pageNumber) {
      parts.push(`pagina ${pageNumber}`);
    }

    return parts.join(" - ") || `#${postId}`;
  }

  /**
   * @param {string | null} postId
   * @param {string | null} [quotedPostId]
   */
  function setQuoteReturnPostId(postId, quotedPostId = null) {
    quoteReturnPostId = postId;
    quoteReturnQuotedPostId = quotedPostId;
    renderQuoteReturnControl(document.getElementById(THREAD_SUMMARY_ID));
  }

  function clearQuoteReturnPostId() {
    setQuoteReturnPostId(null);
  }

  /**
   * @param {HTMLElement | null} summary
   */
  function renderQuoteReturnControl(summary) {
    document.getElementById(QUOTE_RETURN_ID)?.remove();

    if (!(summary instanceof HTMLElement) || !quoteReturnPostId) {
      return;
    }

    const targetPostId = quoteReturnPostId;
    const bar = document.createElement("div");
    bar.id = QUOTE_RETURN_ID;
    bar.textContent = "Salto de cita:";

    const returnButton = document.createElement("button");
    returnButton.type = "button";
    returnButton.textContent = `Volver a ${getPostJumpLabel(targetPostId)}`;
    returnButton.addEventListener("click", () => {
      clearQuoteReturnPostId();
      selectPostById(targetPostId);
    });
    bar.append(returnButton);

    const allQuotesButton = document.createElement("button");
    allQuotesButton.type = "button";
    allQuotesButton.textContent = "Ver citas";
    allQuotesButton.addEventListener("click", () => {
      setActiveGraphView("quoted-sources", targetPostId);
    });
    bar.append(allQuotesButton);

    if (quoteReturnQuotedPostId) {
      const conversationButton = document.createElement("button");
      conversationButton.type = "button";
      conversationButton.textContent = "Conversacion";
      conversationButton.addEventListener("click", () => {
        setActiveGraphView(
          "conversation",
          targetPostId,
          quoteReturnQuotedPostId,
        );
      });
      bar.append(conversationButton);
    }

    const dismissButton = document.createElement("button");
    dismissButton.type = "button";
    dismissButton.textContent = "Cerrar";
    dismissButton.addEventListener("click", clearQuoteReturnPostId);
    bar.append(dismissButton);

    summary.append(bar);
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
        const sourceWrapper = link.closest(".fc-premium-post-wrapper");

        if (sourceWrapper instanceof HTMLElement) {
          const sourcePostId = getPostIdFromNavigationElement(sourceWrapper);

          if (sourcePostId && sourcePostId !== quotedPostId) {
            setQuoteReturnPostId(sourcePostId, quotedPostId);
          }
        }

        selectPostById(quotedPostId);
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
    renderQuoteBlockActions(quoteWrapper, sourcePostId, quotedPostId);

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
   * @param {string | null} sourcePostId
   * @param {string} quotedPostId
   */
  function renderQuoteBlockActions(quoteWrapper, sourcePostId, quotedPostId) {
    if (
      !sourcePostId ||
      quoteWrapper.querySelector(".fc-premium-quote-actions")
    ) {
      return;
    }

    const actions = document.createElement("div");
    actions.className = "fc-premium-quote-actions";

    const viewQuoteButton = document.createElement("button");
    viewQuoteButton.type = "button";
    viewQuoteButton.textContent = "Ver cita";
    viewQuoteButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      jumpToLoadedPost(quotedPostId);
    });
    actions.append(viewQuoteButton);

    const allQuotesButton = document.createElement("button");
    allQuotesButton.type = "button";
    allQuotesButton.textContent = "Ver citas";
    allQuotesButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setActiveGraphView("quoted-sources", sourcePostId);
    });
    actions.append(allQuotesButton);

    const conversationButton = document.createElement("button");
    conversationButton.type = "button";
    conversationButton.textContent = "Conversacion";
    conversationButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setActiveGraphView("conversation", sourcePostId, quotedPostId);
    });
    actions.append(conversationButton);
    quoteWrapper.append(actions);
  }

  /**
   * @param {HTMLElement} wrapper
   * @param {PostRecord} post
   */
  function enhanceCompactPostHeader(wrapper, post) {
    if (wrapper.querySelector(".fc-premium-compact-author-meta")) {
      return;
    }

    const table = wrapper.querySelector(POST_TABLE_SELECTOR);
    const postCountLink = table?.querySelector(`a[id='postcount${post.id}']`);
    const headerCell = postCountLink?.closest("tr")?.querySelector("td");

    if (!(headerCell instanceof HTMLElement)) {
      return;
    }

    const authorCell = table?.querySelector("td[width='175'][rowspan]");
    const authorLink = authorCell?.querySelector(".bigusername");
    const messageCount = normalizeText(authorCell?.textContent).match(
      /([\d.]+)\s+Mens\./,
    )?.[1];
    const meta = document.createElement("span");
    meta.className = "fc-premium-compact-author-meta";

    if (authorLink instanceof HTMLAnchorElement) {
      const link = document.createElement("a");
      link.href = authorLink.href;
      link.textContent = post.author || normalizeText(authorLink.textContent);
      meta.append(link);
    } else {
      meta.textContent = post.author;
    }

    if (messageCount) {
      meta.append(document.createTextNode(` - ${messageCount} mens.`));
    }

    headerCell.append(meta);
  }

  /**
   * @param {PostRecord} post
   * @param {number} rank
   * @param {Map<string, PostRecord>} postById
   * @returns {HTMLElement}
   */
  function renderPost(post, rank, postById) {
    const template = document.createElement("template");
    template.innerHTML = post.html;

    const wrapper = template.content.firstElementChild;

    if (!(wrapper instanceof HTMLElement)) {
      return document.createElement("div");
    }

    wrapper.classList.add("fc-premium-post-wrapper");
    wrapper.dataset.fcPremiumOriginalPage = String(post.pageNumber);
    enhanceQuoteLinks(wrapper);
    enhanceAuthorFilterButton(wrapper, post.author);
    enhanceCompactPostHeader(wrapper, post);
    const badges = document.createElement("div");
    badges.className = "fc-premium-post-badges";

    if (post.isOriginalPoster) {
      wrapper.dataset.fcPremiumOriginalPoster = "true";

      const opBadge = document.createElement("div");
      opBadge.className = "fc-premium-op-badge";
      opBadge.dataset.fcPremiumAuthorFilter = normalizeAuthorName(post.author);
      opBadge.title = `Filtrar mensajes de ${post.author}`;
      opBadge.textContent = "OP";
      opBadge.addEventListener("click", () => {
        toggleAuthorFilter(post.author);
      });
      badges.append(opBadge);
    }

    const pageBadge = document.createElement("div");
    pageBadge.className = "fc-premium-page-badge";
    pageBadge.role = "button";
    pageBadge.tabIndex = 0;
    pageBadge.textContent = `Pag. ${post.pageNumber}`;
    pageBadge.title = `Filtrar mensajes de la pagina ${post.pageNumber}`;
    pageBadge.addEventListener("click", () => {
      togglePageFilter(post.pageNumber);
    });
    pageBadge.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      togglePageFilter(post.pageNumber);
    });
    badges.append(pageBadge);

    if (post.replyCount > 0) {
      wrapper.dataset.fcPremiumReplyCount = String(post.replyCount);
      wrapper.dataset.fcPremiumRank = String(rank);

      const badge = document.createElement("div");
      badge.className = "fc-premium-reply-badge";
      badge.textContent = `#${rank} - ${
        post.replyCount === 1 ? "1 cita" : `${post.replyCount} citas`
      }`;
      appendReplyLinks(badge, post, postById);
      badges.append(badge);
    }

    if (badges.childElementCount > 0) {
      wrapper.prepend(badges);
    }

    return wrapper;
  }

  /**
   * @param {HTMLElement} badge
   * @param {PostRecord} post
   * @param {Map<string, PostRecord>} postById
   */
  function appendReplyLinks(badge, post, postById) {
    const maxLinks = 8;
    const visibleReplyIds = post.replyingPostIds.slice(0, maxLinks);

    if (visibleReplyIds.length === 0) {
      return;
    }

    const label = document.createElement("span");
    label.className = "fc-premium-original-position";
    label.textContent = " - citado por ";
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
        if (replyingPostId !== post.id) {
          setQuoteReturnPostId(post.id);
        }
        selectPostById(replyingPostId);
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

    const quotedByButton = document.createElement("button");
    quotedByButton.type = "button";
    quotedByButton.textContent = "Ver citadores";
    quotedByButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setActiveGraphView("quoted-by", post.id);
    });
    badge.append(quotedByButton);
  }

  /**
   * @param {PostRecord[]} posts
   * @param {ThreadViewMode} mode
   */
  function renderThreadPosts(posts, mode) {
    const postsElement = getPostsElement();

    if (!postsElement) {
      return;
    }

    const selectedPostId =
      getPostIdFromNavigationElement(
        navigationItems[selectedNavigationIndex]?.element,
      ) || getSavedSelectedPostId();
    postsElement.textContent = "";

    const fragment = document.createDocumentFragment();
    const postById = new Map(posts.map((post) => [post.id, post]));
    const rankByPostId = getReplyRankByPostId(posts);

    for (const post of getPostsForView(posts, mode)) {
      fragment.append(
        renderPost(post, rankByPostId.get(post.id) || 0, postById),
      );
    }

    postsElement.append(fragment);
    renderAuthorFilterBar();
    renderThreadFilterActions(document.getElementById(THREAD_SUMMARY_ID));
    applyPageFilter();
    refreshNavigation({ reset: true, persist: false });

    if (selectedPostId) {
      const selectedTable = document.getElementById(`post${selectedPostId}`);
      const selectedWrapper = selectedTable?.closest(".fc-premium-post-wrapper");

      if (
        selectedWrapper instanceof HTMLElement &&
        isVisible(selectedWrapper)
      ) {
        selectPostById(selectedPostId);
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
  }

  /**
   * @returns {Promise<void>}
   */
  async function enhanceThreadPage() {
    ensureStyle();

    const summary = ensureThreadSummary();
    const allPages = getThreadPages();
    const currentPageNumber = getPageNumber(new URL(location.href));
    const pages = loadAllPagesEnabled
      ? allPages
      : allPages.filter((page) => page.pageNumber === currentPageNumber);
    /** @type {PostRecord[]} */
    const allPosts = [];
    let pageOffset = 0;

    threadPages = allPages;
    loadedThreadPosts = [];
    loadedThreadPageNumbers = new Set();
    threadGraph = createEmptyThreadGraph();
    activeGraphView = null;
    threadCacheUsed = false;
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

    const cachedThread = loadAllPagesEnabled ? readCurrentThreadCache() : null;

    if (cachedThread && isCompleteThreadCache(cachedThread)) {
      const cachedPages = getThreadPagesForTotal(cachedThread.totalPages);
      threadPages = cachedPages;
      loadedThreadPageNumbers = new Set(cachedThread.cachedPageNumbers);
      hydrateThreadPosts(cachedThread.posts);
      threadCacheUsed = true;
      threadLoadState = {
        loadedPages: loadedThreadPageNumbers.size,
        targetPages: cachedThread.totalPages,
        totalPages: cachedThread.totalPages,
        loadedPosts: loadedThreadPosts.length,
        isLoading: false,
      };
      renderThreadPosts(loadedThreadPosts, currentThreadViewMode);
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

      renderThreadPosts(loadedThreadPosts, currentThreadViewMode);
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
    renderThreadPosts(loadedThreadPosts, currentThreadViewMode);
    renderThreadSummaryMenu(summary);

    if (loadAllPagesEnabled && loadedThreadPageNumbers.size >= pages.length) {
      writeCurrentThreadCache(
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
    if (window[INSTANCE_KEY]) {
      return;
    }

    window[INSTANCE_KEY] = true;
    applyCompactMode();
    applyCompactQuotes();
    enhanceThreadTitleTags();

    if (isForumDisplayPage() || isThreadPage()) {
      ensureStyle();
      installGlobalCompactToggle();
      installKeyboardNavigation();
    }

    if (isForumDisplayPage()) {
      enhanceForumDisplayPage();
      refreshNavigation({ reset: true });
    }

    if (!isThreadPage()) {
      return;
    }

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
    }
  }

  void init();
})();
