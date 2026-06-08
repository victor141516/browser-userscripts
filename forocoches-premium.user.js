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
  const POSTS_SELECTOR = "#posts";
  const POST_TABLE_SELECTOR = "table[id^='post']";
  const PAGE_LOAD_DELAY_MS = 250;

  /**
   * @typedef {object} PostRecord
   * @property {string} id
   * @property {string} html
   * @property {string} author
   * @property {number} pageNumber
   * @property {number} pageIndex
   * @property {number} originalIndex
   * @property {string[]} quotedPostIds
   * @property {number} replyCount
   */

  /**
   * @typedef {object} ThreadPage
   * @property {number} pageNumber
   * @property {string} url
   */

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

      .fc-premium-original-position {
        color: #17324d;
        font-weight: 400;
        margin-left: 6px;
        opacity: 0.8;
      }
    `;

    document.head.appendChild(style);
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

      posts.push({
        id,
        html: wrapper.outerHTML,
        author,
        pageNumber,
        pageIndex: posts.length,
        originalIndex: pageOffset + posts.length,
        quotedPostIds: getQuotedPostIds(doc, id),
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
      post.replyCount = repliesByPostId.get(post.id)?.size || 0;
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
   * @returns {HTMLElement}
   */
  function renderPost(post, rank) {
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
      wrapper.prepend(badge);
    }

    return wrapper;
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
    let rank = 0;

    for (const post of sortPosts(posts)) {
      if (post.replyCount > 0) {
        rank += 1;
      }

      fragment.append(renderPost(post, rank));
    }

    postsElement.append(fragment);
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
