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
  const THREAD_SUMMARY_ID = "fc-premium-thread-summary";
  const SELECTED_ATTRIBUTE = "data-fc-premium-selected";
  const POSTS_SELECTOR = "#posts";
  const POST_TABLE_SELECTOR = "table[id^='post']";
  const THREAD_TITLE_SELECTOR =
    "a[id^='thread_title_'][href*='showthread.php?t=']";
  const PAGE_LOAD_DELAY_MS = 250;
  const TAG_PATTERN = /\+([A-Za-z0-9_-]+)/g;

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

  /** @type {NavigationItem[]} */
  let navigationItems = [];
  let selectedNavigationIndex = -1;

  /**
   * @param {string | null | undefined} text
   * @returns {string}
   */
  function normalizeText(text) {
    return (text || "").replace(/\s+/g, " ").trim();
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

      #${THREAD_SUMMARY_ID} strong {
        color: #0b57d0;
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

      .fc-premium-reply-badge {
        background: #0b57d0;
        border-radius: 999px;
        color: #fff;
        display: inline-block;
        font: 700 11px/1 Verdana, Arial, sans-serif;
        margin: 0 0 6px;
        padding: 5px 8px;
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

      [${SELECTED_ATTRIBUTE}] {
        border-radius: 6px;
        outline: 2px solid #1a73e8 !important;
        outline-offset: 3px;
        transition:
          outline-offset 160ms ease,
          transform 160ms ease;
      }

      .fc-premium-post-wrapper[${SELECTED_ATTRIBUTE}],
      a[${SELECTED_ATTRIBUTE}] {
        transform: scale(1.005);
        transform-origin: center center;
      }

      tr[${SELECTED_ATTRIBUTE}] > td {
        background: #eef5ff !important;
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
    chip.textContent = `+${tag}`;
    chip.style.setProperty("--fc-premium-tag-bg", colors.background);
    chip.style.setProperty("--fc-premium-tag-border", colors.border);
    chip.style.setProperty("--fc-premium-tag-color", colors.color);

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
          document.createTextNode(originalTitle.slice(currentIndex, matchIndex)),
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
   * @param {{ reset?: boolean, scroll?: boolean }} [options]
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
   * @param {{ scroll?: boolean }} [options]
   */
  function renderNavigationSelection(options = {}) {
    for (const selected of document.querySelectorAll(`[${SELECTED_ATTRIBUTE}]`)) {
      selected.removeAttribute(SELECTED_ATTRIBUTE);
    }

    const selected = navigationItems[selectedNavigationIndex];

    if (!selected) {
      return;
    }

    selected.element.setAttribute(SELECTED_ATTRIBUTE, "true");

    if (options.scroll) {
      selected.element.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
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
    renderNavigationSelection({ scroll: true });
  }

  function openSelectedNavigationItem() {
    const selected = navigationItems[selectedNavigationIndex];

    if (!selected?.link) {
      return;
    }

    selected.link.click();
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
   * @returns {ThreadPage[]}
   */
  function getThreadPages() {
    const currentUrl = new URL(location.href);
    const maxPage = getMaxThreadPage(document);
    /** @type {ThreadPage[]} */
    const pages = [];

    for (let pageNumber = 1; pageNumber <= maxPage; pageNumber += 1) {
      const url = new URL(currentUrl.href);
      url.searchParams.set("page", String(pageNumber));
      pages.push({ pageNumber, url: url.href });
    }

    return pages;
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

      const quotedPostId = getQuotedPostId(link.getAttribute("href") || link.href);

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
      return existing;
    }

    const summary = document.createElement("div");
    summary.id = THREAD_SUMMARY_ID;
    posts.before(summary);
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

    if (post.replyCount > 0) {
      wrapper.dataset.fcPremiumReplyCount = String(post.replyCount);
      wrapper.dataset.fcPremiumRank = String(rank);

      const badge = document.createElement("div");
      badge.className = "fc-premium-reply-badge";
      badge.textContent =
        post.replyCount === 1 ? "1 cita" : `${post.replyCount} citas`;

      const originalPosition = document.createElement("span");
      originalPosition.className = "fc-premium-original-position";
      originalPosition.textContent = ` - pagina ${post.pageNumber}`;
      badge.append(originalPosition);
      appendReplyLinks(badge, post, postById);
      wrapper.prepend(badge);
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

      link.href = `#post${replyingPostId}`;
      link.textContent = `#${reply?.postNumber || replyingPostId}`;
      badge.append(link);
      badge.append(document.createTextNode(" "));
    }

    if (post.replyingPostIds.length > visibleReplyIds.length) {
      const remaining = document.createElement("span");
      remaining.className = "fc-premium-original-position";
      remaining.textContent = ` +${post.replyingPostIds.length - visibleReplyIds.length}`;
      badge.append(remaining);
    }
  }

  /**
   * @param {PostRecord[]} posts
   */
  function renderSortedPosts(posts) {
    const postsElement = getPostsElement();

    if (!postsElement) {
      return;
    }

    postsElement.textContent = "";

    const fragment = document.createDocumentFragment();
    const postById = new Map(posts.map((post) => [post.id, post]));
    let rank = 0;

    for (const post of sortPosts(posts)) {
      if (post.replyCount > 0) {
        rank += 1;
      }

      fragment.append(renderPost(post, rank, postById));
    }

    postsElement.append(fragment);
    refreshNavigation({ reset: true });
  }

  /**
   * @returns {Promise<void>}
   */
  async function enhanceThreadPage() {
    ensureStyle();

    const summary = ensureThreadSummary();
    const pages = getThreadPages();
    const currentPageNumber = getPageNumber(new URL(location.href));
    /** @type {PostRecord[]} */
    const allPosts = [];
    let pageOffset = 0;

    setSummary(
      summary,
      `<strong>Forocoches Premium:</strong> cargando ${pages.length} paginas para ordenar por citas...`,
    );

    for (const page of pages) {
      const doc =
        page.pageNumber === currentPageNumber
          ? document
          : await fetchThreadDocument(page.url);
      const pagePosts = collectPosts(doc, page.pageNumber, pageOffset);
      allPosts.push(...pagePosts);
      pageOffset += pagePosts.length;

      setSummary(
        summary,
        `<strong>Forocoches Premium:</strong> cargadas ${page.pageNumber}/${pages.length} paginas; ${allPosts.length} mensajes encontrados.`,
      );

      if (page.pageNumber !== pages[pages.length - 1].pageNumber) {
        await sleep(PAGE_LOAD_DELAY_MS);
      }
    }

    applyReplyCounts(allPosts);
    renderSortedPosts(allPosts);

    const quotedPosts = allPosts.filter((post) => post.replyCount > 0).length;
    const totalReplies = allPosts.reduce(
      (total, post) => total + post.replyCount,
      0,
    );

    setSummary(
      summary,
      `<strong>Forocoches Premium:</strong> ${allPosts.length} mensajes de ${pages.length} paginas. ${quotedPosts} mensajes tienen citas (${totalReplies} citas en total) y se han movido arriba.`,
    );
  }

  /**
   * @returns {Promise<void>}
   */
  async function init() {
    if (window[INSTANCE_KEY]) {
      return;
    }

    window[INSTANCE_KEY] = true;
    enhanceThreadTitleTags();

    if (isForumDisplayPage() || isThreadPage()) {
      installKeyboardNavigation();
    }

    if (isForumDisplayPage()) {
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
