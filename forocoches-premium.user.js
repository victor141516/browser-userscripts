// ==UserScript==
// @name         Forocoches Premium
// @namespace    http://tampermonkey.net/
// @version      2026-06-12-193545
// @description  Improves Forocoches thread reading
// @author       victor141516
// @match        https://forocoches.com/foro/*
// @icon         https://forocoches.com/favicon.ico
// @grant        none
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(() => {
  // src/config/domIds.ts
  var STYLE_ID = "fc-premium-style";
  var INSTANCE_KEY = "__fcPremiumThreadEnhancerStarted";
  var SHORTCUT_HELP_CONTAINER_ID = "fc-premium-shortcut-help-container";
  var SHORTCUT_HELP_BUTTON_ID = "fc-premium-shortcut-help-button";
  var SHORTCUT_HELP_POPOVER_ID = "fc-premium-shortcut-help-popover";
  var HIDDEN_THREADS_BUTTON_ID = "fc-premium-hidden-threads-button";
  var HIDDEN_THREADS_MODAL_ID = "fc-premium-hidden-threads-modal";
  var HIDDEN_THREADS_MODAL_BODY_ID = "fc-premium-hidden-threads-modal-body";
  var MODAL_OPEN_CLASS = "fc-premium-modal-open";
  var TOP_TAGS_ID = "fc-premium-top-tags";
  var FORUM_SIDEBAR_TOGGLE_BAR_ID = "fc-premium-forum-sidebar-toggle-bar";
  var FORUM_SIDEBAR_TOGGLE_ID = "fc-premium-forum-sidebar-toggle";
  var FORUM_CONTROLS_ROW_ID = "fc-premium-forum-controls-row";
  var FORUM_SEARCH_SLOT_ID = "fc-premium-forum-search-slot";
  var FORUM_LOADING_STATUS_ID = "fc-premium-forum-loading-status";
  var THREAD_PROGRESS_ID = "fc-premium-thread-progress";
  var NAVIGATION_STATUS_ID = "fc-premium-navigation-status";
  var THREAD_SUMMARY_ID = "fc-premium-thread-summary";
  var THREAD_CONTROLS_ID = "fc-premium-thread-controls";
  var THREAD_SEARCH_PANEL_ID = "fc-premium-thread-search-panel";
  var THREAD_SEARCH_HEADER_SLOT_ID = "fc-premium-thread-search-header-slot";
  var THREAD_SEARCH_TEXT_INPUT_ID = "fc-premium-thread-search-text";
  var THREAD_SEARCH_AUTHOR_INPUT_ID = "fc-premium-thread-search-author";
  var THREAD_SEARCH_AUTHOR_DATALIST_ID = "fc-premium-thread-search-authors";
  var THREAD_SEARCH_SELECTED_AUTHORS_ID = "fc-premium-thread-search-selected-authors";
  var THREAD_SEARCH_STATUS_ID = "fc-premium-thread-search-status";
  var THREAD_SEARCH_EMPTY_ID = "fc-premium-thread-search-empty";
  var FORUM_SIDEBAR_HIDDEN_CLASS = "fc-premium-forum-sidebar-hidden";
  // src/config/keyboard.ts
  var KEY_NAV_PREVIOUS_POST = "ArrowUp";
  var KEY_NAV_NEXT_POST = "ArrowDown";
  var KEY_NAV_PREVIOUS_PAGE = "ArrowLeft";
  var KEY_NAV_NEXT_PAGE = "ArrowRight";
  var KEY_CLEAR_ACTIVE_VIEW = "Escape";
  var KEY_OPEN_SHORTCUT_HELP = "?";
  var KEY_QUOTE_SELECTED_POST = "Enter";
  var KEY_OPEN_SELECTED_THREAD_IN_NEW_TAB = "Enter";
  var KEY_OPEN_SELECTED_THREAD_IN_NEW_TAB_MODIFIER = "Cmd/Ctrl";
  var KEY_HIDE_SELECTED_THREAD = "h";
  var KEY_NEW_THREAD_REPLY = "n";
  var KEY_MULTIQUOTE_SELECTED_POST = "m";
  var KEY_RETURN_TO_THREAD_LIST = "l";
  // src/config/cache.ts
  var FORUM_SIDEBAR_STORAGE_KEY = "fcPremiumForumSidebarHidden";
  var THREAD_CACHE_MAX_AGE_MS = 10 * 60 * 1000;
  var THREAD_CACHE_MAX_BYTES = 500 * 1024 * 1024;
  var THREAD_CACHE_DB_NAME = "fcPremiumThreadCache";
  var THREAD_CACHE_DB_VERSION = 3;
  var THREAD_CACHE_STORE_NAME = "threads";
  var FORUM_THREAD_CACHE_STORE_NAME = "forumThreads";
  var THREAD_CACHE_RECORD_VERSION = 3;
  var FORUM_THREAD_CACHE_RECORD_VERSION = 1;
  var FORUM_THREAD_CACHE_RECENT_PAGES = 10;
  var FORUM_THREAD_CACHE_MAX_RECORDS = 1000;
  var FORUM_THREAD_FALLBACK_PAGE_SIZE = 40;
  var FORUM_LIVE_SEARCH_DEBOUNCE_MS = 220;
  var THREAD_CACHE_LEGACY_STORAGE_PREFIX = "fcPremiumThreadCache:";
  // src/config/query.ts
  var THREAD_STATE_QUERY_PARAMS = {
    graphType: "fcp_graph",
    graphRoot: "fcp_root",
    graphRelated: "fcp_related",
    pageFilter: "fcp_page",
    authorFilter: "fcp_author",
    searchQuery: "fcp_search"
  };
  var LEGACY_THREAD_STATE_QUERY_PARAMS = ["fcp_mode"];
  var FORUM_STATE_QUERY_PARAMS = {
    tag: "fcp_tag"
  };
  // src/config/selectors.ts
  var SELECTED_ATTRIBUTE = "data-fc-premium-selected";
  var FORUM_LAYOUT_HIDDEN_ATTRIBUTE = "data-fc-premium-layout-hidden";
  var POSTS_SELECTOR = "#posts";
  var POST_TABLE_SELECTOR = "table[id^='post']";
  var THREAD_TITLE_SELECTOR = "a[id^='thread_title_'][href*='showthread.php?t=']";
  var HIDDEN_THREAD_ATTRIBUTE = "data-fc-premium-tag-hidden";
  var HIDDEN_POST_FILTER_ATTRIBUTE = "data-fc-premium-filter-hidden";
  var HIDDEN_POST_PAGE_ATTRIBUTE = "data-fc-premium-page-hidden";
  // src/config/domain.ts
  var SCRIPT_INSTANCE_VERSION = "2026-06-09-19";
  var PAGE_LOAD_DELAY_MS = 250;
  var GRAPH_VIEW_TYPES = ["quoted-sources", "quoted-by", "conversation"];
  // src/shared/dom.ts
  function normalizeText(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function normalizeLayoutText(text) {
    return normalizeText(text).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  function normalizeAuthorName(author) {
    return normalizeText(author).toLowerCase();
  }
  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }
  function isVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  }
  function toUrl(href) {
    try {
      return new URL(href, location.href);
    } catch (_error) {
      return null;
    }
  }
  function getThreadId(url) {
    return url.searchParams.get("t");
  }
  function getPostQueryId(url) {
    return url.searchParams.get("p");
  }
  function getPageNumber(url) {
    const page = Number(url.searchParams.get("page") || "1");
    return Number.isFinite(page) && page > 0 ? page : 1;
  }
  function getLocationPostHashId(url = new URL(location.href)) {
    const match = url.hash.match(/^#post(\d+)$/);
    return match?.[1] || null;
  }
  function isThreadPage() {
    return location.pathname.endsWith("/showthread.php") && Boolean(getThreadId(new URL(location.href)) || getPostQueryId(new URL(location.href)));
  }
  function isForumDisplayPage() {
    return location.pathname.endsWith("/forumdisplay.php");
  }
  function getForumId(url = new URL(location.href)) {
    return url.searchParams.get("f") || "";
  }

  // src/ui/navigationDom.ts
  var THREAD_NAVIGATION_TOP_OFFSET_RATIO = 0.15;
  function getThreadTitleNavigationItems() {
    const items = [];
    for (const link of document.querySelectorAll(THREAD_TITLE_SELECTOR)) {
      if (!(link instanceof HTMLAnchorElement) || !isVisible(link)) {
        continue;
      }
      items.push({
        element: getThreadNavigationOwner(link),
        link
      });
    }
    return items;
  }
  function getPostNavigationItems(posts) {
    if (!posts) {
      return [];
    }
    const items = [];
    for (const wrapper of posts.querySelectorAll(".fc-premium-post-wrapper")) {
      if (!(wrapper instanceof HTMLElement) || !isVisible(wrapper)) {
        continue;
      }
      const postId = getPostIdFromNavigationElement(wrapper);
      const link = postId ? wrapper.querySelector(`#postcount${postId}`) : wrapper.querySelector("a[id^='postcount']");
      items.push({
        element: wrapper,
        link: link instanceof HTMLAnchorElement ? link : null
      });
    }
    return items;
  }
  function clearNavigationSelection() {
    for (const selected of document.querySelectorAll(`[${SELECTED_ATTRIBUTE}]`)) {
      selected.removeAttribute(SELECTED_ATTRIBUTE);
    }
  }
  function markNavigationItemSelected(item) {
    item.element.setAttribute(SELECTED_ATTRIBUTE, "true");
  }
  function scrollNavigationElementIntoView(element, block) {
    if (block === "start") {
      scrollElementToViewportOffset(element, THREAD_NAVIGATION_TOP_OFFSET_RATIO);
      return;
    }
    element.scrollIntoView({
      behavior: "smooth",
      block
    });
  }
  function scrollElementToViewportOffset(element, offsetRatio) {
    const targetTop = element.getBoundingClientRect().top + window.scrollY - window.innerHeight * offsetRatio;
    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "smooth"
    });
  }
  function getPostIdFromNavigationElement(element) {
    if (!(element instanceof HTMLElement)) {
      return null;
    }
    const postTable = element.querySelector(POST_TABLE_SELECTOR);
    const postId = postTable?.id.match(/^post(\d+)$/)?.[1];
    return postId || null;
  }
  function getSelectedPostWrapper() {
    const marked = document.querySelector(`.fc-premium-post-wrapper[${SELECTED_ATTRIBUTE}]`);
    return marked instanceof HTMLElement ? marked : null;
  }
  function getThreadNavigationOwner(link) {
    const row = link.closest("tr");
    if (row instanceof HTMLElement) {
      return row;
    }
    return link;
  }

  // node_modules/preact/dist/preact.module.js
  var n;
  var l;
  var u;
  var t;
  var i;
  var r;
  var o;
  var e;
  var f;
  var c;
  var a;
  var s;
  var h;
  var p;
  var v;
  var y;
  var d = {};
  var w = [];
  var _ = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;
  var g = Array.isArray;
  function m(n2, l2) {
    for (var u2 in l2)
      n2[u2] = l2[u2];
    return n2;
  }
  function b(n2) {
    n2 && n2.parentNode && n2.parentNode.removeChild(n2);
  }
  function k(l2, u2, t2) {
    var i2, r2, o2, e2 = {};
    for (o2 in u2)
      o2 == "key" ? i2 = u2[o2] : o2 == "ref" ? r2 = u2[o2] : e2[o2] = u2[o2];
    if (arguments.length > 2 && (e2.children = arguments.length > 3 ? n.call(arguments, 2) : t2), typeof l2 == "function" && l2.defaultProps != null)
      for (o2 in l2.defaultProps)
        e2[o2] === undefined && (e2[o2] = l2.defaultProps[o2]);
    return x(l2, e2, i2, r2, null);
  }
  function x(n2, t2, i2, r2, o2) {
    var e2 = { type: n2, props: t2, key: i2, ref: r2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: undefined, __v: o2 == null ? ++u : o2, __i: -1, __u: 0 };
    return o2 == null && l.vnode != null && l.vnode(e2), e2;
  }
  function S(n2) {
    return n2.children;
  }
  function C(n2, l2) {
    this.props = n2, this.context = l2;
  }
  function $(n2, l2) {
    if (l2 == null)
      return n2.__ ? $(n2.__, n2.__i + 1) : null;
    for (var u2;l2 < n2.__k.length; l2++)
      if ((u2 = n2.__k[l2]) != null && u2.__e != null)
        return u2.__e;
    return typeof n2.type == "function" ? $(n2) : null;
  }
  function I(n2) {
    if (n2.__P && n2.__d) {
      var u2 = n2.__v, t2 = u2.__e, i2 = [], r2 = [], o2 = m({}, u2);
      o2.__v = u2.__v + 1, l.vnode && l.vnode(o2), q(n2.__P, o2, u2, n2.__n, n2.__P.namespaceURI, 32 & u2.__u ? [t2] : null, i2, t2 == null ? $(u2) : t2, !!(32 & u2.__u), r2), o2.__v = u2.__v, o2.__.__k[o2.__i] = o2, D(i2, o2, r2), u2.__e = u2.__ = null, o2.__e != t2 && P(o2);
    }
  }
  function P(n2) {
    if ((n2 = n2.__) != null && n2.__c != null)
      return n2.__e = n2.__c.base = null, n2.__k.some(function(l2) {
        if (l2 != null && l2.__e != null)
          return n2.__e = n2.__c.base = l2.__e;
      }), P(n2);
  }
  function A(n2) {
    (!n2.__d && (n2.__d = true) && i.push(n2) && !H.__r++ || r != l.debounceRendering) && ((r = l.debounceRendering) || o)(H);
  }
  function H() {
    try {
      for (var n2, l2 = 1;i.length; )
        i.length > l2 && i.sort(e), n2 = i.shift(), l2 = i.length, I(n2);
    } finally {
      i.length = H.__r = 0;
    }
  }
  function L(n2, l2, u2, t2, i2, r2, o2, e2, f2, c2, a2) {
    var s2, h2, p2, v2, y2, _2, g2, m2 = t2 && t2.__k || w, b2 = l2.length;
    for (f2 = T(u2, l2, m2, f2, b2), s2 = 0;s2 < b2; s2++)
      (p2 = u2.__k[s2]) != null && (h2 = p2.__i != -1 && m2[p2.__i] || d, p2.__i = s2, _2 = q(n2, p2, h2, i2, r2, o2, e2, f2, c2, a2), v2 = p2.__e, p2.ref && h2.ref != p2.ref && (h2.ref && J(h2.ref, null, p2), a2.push(p2.ref, p2.__c || v2, p2)), y2 == null && v2 != null && (y2 = v2), (g2 = !!(4 & p2.__u)) || h2.__k === p2.__k ? (f2 = j(p2, f2, n2, g2), g2 && h2.__e && (h2.__e = null)) : typeof p2.type == "function" && _2 !== undefined ? f2 = _2 : v2 && (f2 = v2.nextSibling), p2.__u &= -7);
    return u2.__e = y2, f2;
  }
  function T(n2, l2, u2, t2, i2) {
    var r2, o2, e2, f2, c2, a2 = u2.length, s2 = a2, h2 = 0;
    for (n2.__k = new Array(i2), r2 = 0;r2 < i2; r2++)
      (o2 = l2[r2]) != null && typeof o2 != "boolean" && typeof o2 != "function" ? (typeof o2 == "string" || typeof o2 == "number" || typeof o2 == "bigint" || o2.constructor == String ? o2 = n2.__k[r2] = x(null, o2, null, null, null) : g(o2) ? o2 = n2.__k[r2] = x(S, { children: o2 }, null, null, null) : o2.constructor === undefined && o2.__b > 0 ? o2 = n2.__k[r2] = x(o2.type, o2.props, o2.key, o2.ref ? o2.ref : null, o2.__v) : n2.__k[r2] = o2, f2 = r2 + h2, o2.__ = n2, o2.__b = n2.__b + 1, e2 = null, (c2 = o2.__i = O(o2, u2, f2, s2)) != -1 && (s2--, (e2 = u2[c2]) && (e2.__u |= 2)), e2 == null || e2.__v == null ? (c2 == -1 && (i2 > a2 ? h2-- : i2 < a2 && h2++), typeof o2.type != "function" && (o2.__u |= 4)) : c2 != f2 && (c2 == f2 - 1 ? h2-- : c2 == f2 + 1 ? h2++ : (c2 > f2 ? h2-- : h2++, o2.__u |= 4))) : n2.__k[r2] = null;
    if (s2)
      for (r2 = 0;r2 < a2; r2++)
        (e2 = u2[r2]) != null && (2 & e2.__u) == 0 && (e2.__e == t2 && (t2 = $(e2)), K(e2, e2));
    return t2;
  }
  function j(n2, l2, u2, t2) {
    var i2, r2;
    if (typeof n2.type == "function") {
      for (i2 = n2.__k, r2 = 0;i2 && r2 < i2.length; r2++)
        i2[r2] && (i2[r2].__ = n2, l2 = j(i2[r2], l2, u2, t2));
      return l2;
    }
    n2.__e != l2 && (t2 && (l2 && n2.type && !l2.parentNode && (l2 = $(n2)), u2.insertBefore(n2.__e, l2 || null)), l2 = n2.__e);
    do {
      l2 = l2 && l2.nextSibling;
    } while (l2 != null && l2.nodeType == 8);
    return l2;
  }
  function O(n2, l2, u2, t2) {
    var i2, r2, o2, e2 = n2.key, f2 = n2.type, c2 = l2[u2], a2 = c2 != null && (2 & c2.__u) == 0;
    if (c2 === null && e2 == null || a2 && e2 == c2.key && f2 == c2.type)
      return u2;
    if (t2 > (a2 ? 1 : 0)) {
      for (i2 = u2 - 1, r2 = u2 + 1;i2 >= 0 || r2 < l2.length; )
        if ((c2 = l2[o2 = i2 >= 0 ? i2-- : r2++]) != null && (2 & c2.__u) == 0 && e2 == c2.key && f2 == c2.type)
          return o2;
    }
    return -1;
  }
  function z(n2, l2, u2) {
    l2[0] == "-" ? n2.setProperty(l2, u2 == null ? "" : u2) : n2[l2] = u2 == null ? "" : typeof u2 != "number" || _.test(l2) ? u2 : u2 + "px";
  }
  function N(n2, l2, u2, t2, i2) {
    var r2, o2;
    n:
      if (l2 == "style")
        if (typeof u2 == "string")
          n2.style.cssText = u2;
        else {
          if (typeof t2 == "string" && (n2.style.cssText = t2 = ""), t2)
            for (l2 in t2)
              u2 && l2 in u2 || z(n2.style, l2, "");
          if (u2)
            for (l2 in u2)
              t2 && u2[l2] == t2[l2] || z(n2.style, l2, u2[l2]);
        }
      else if (l2[0] == "o" && l2[1] == "n")
        r2 = l2 != (l2 = l2.replace(s, "$1")), o2 = l2.toLowerCase(), l2 = o2 in n2 || l2 == "onFocusOut" || l2 == "onFocusIn" ? o2.slice(2) : l2.slice(2), n2.l || (n2.l = {}), n2.l[l2 + r2] = u2, u2 ? t2 ? u2[a] = t2[a] : (u2[a] = h, n2.addEventListener(l2, r2 ? v : p, r2)) : n2.removeEventListener(l2, r2 ? v : p, r2);
      else {
        if (i2 == "http://www.w3.org/2000/svg")
          l2 = l2.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
        else if (l2 != "width" && l2 != "height" && l2 != "href" && l2 != "list" && l2 != "form" && l2 != "tabIndex" && l2 != "download" && l2 != "rowSpan" && l2 != "colSpan" && l2 != "role" && l2 != "popover" && l2 in n2)
          try {
            n2[l2] = u2 == null ? "" : u2;
            break n;
          } catch (n3) {}
        typeof u2 == "function" || (u2 == null || u2 === false && l2[4] != "-" ? n2.removeAttribute(l2) : n2.setAttribute(l2, l2 == "popover" && u2 == 1 ? "" : u2));
      }
  }
  function V(n2) {
    return function(u2) {
      if (this.l) {
        var t2 = this.l[u2.type + n2];
        if (u2[c] == null)
          u2[c] = h++;
        else if (u2[c] < t2[a])
          return;
        return t2(l.event ? l.event(u2) : u2);
      }
    };
  }
  function q(n2, u2, t2, i2, r2, o2, e2, f2, c2, a2) {
    var s2, h2, p2, v2, y2, d2, _2, k2, x2, M, $2, I2, P2, A2, H2, T2 = u2.type;
    if (u2.constructor !== undefined)
      return null;
    128 & t2.__u && (c2 = !!(32 & t2.__u), o2 = [f2 = u2.__e = t2.__e]), (s2 = l.__b) && s2(u2);
    n:
      if (typeof T2 == "function")
        try {
          if (k2 = u2.props, x2 = T2.prototype && T2.prototype.render, M = (s2 = T2.contextType) && i2[s2.__c], $2 = s2 ? M ? M.props.value : s2.__ : i2, t2.__c ? _2 = (h2 = u2.__c = t2.__c).__ = h2.__E : (x2 ? u2.__c = h2 = new T2(k2, $2) : (u2.__c = h2 = new C(k2, $2), h2.constructor = T2, h2.render = Q), M && M.sub(h2), h2.state || (h2.state = {}), h2.__n = i2, p2 = h2.__d = true, h2.__h = [], h2._sb = []), x2 && h2.__s == null && (h2.__s = h2.state), x2 && T2.getDerivedStateFromProps != null && (h2.__s == h2.state && (h2.__s = m({}, h2.__s)), m(h2.__s, T2.getDerivedStateFromProps(k2, h2.__s))), v2 = h2.props, y2 = h2.state, h2.__v = u2, p2)
            x2 && T2.getDerivedStateFromProps == null && h2.componentWillMount != null && h2.componentWillMount(), x2 && h2.componentDidMount != null && h2.__h.push(h2.componentDidMount);
          else {
            if (x2 && T2.getDerivedStateFromProps == null && k2 !== v2 && h2.componentWillReceiveProps != null && h2.componentWillReceiveProps(k2, $2), u2.__v == t2.__v || !h2.__e && h2.shouldComponentUpdate != null && h2.shouldComponentUpdate(k2, h2.__s, $2) === false) {
              u2.__v != t2.__v && (h2.props = k2, h2.state = h2.__s, h2.__d = false), u2.__e = t2.__e, u2.__k = t2.__k, u2.__k.some(function(n3) {
                n3 && (n3.__ = u2);
              }), w.push.apply(h2.__h, h2._sb), h2._sb = [], h2.__h.length && e2.push(h2);
              break n;
            }
            h2.componentWillUpdate != null && h2.componentWillUpdate(k2, h2.__s, $2), x2 && h2.componentDidUpdate != null && h2.__h.push(function() {
              h2.componentDidUpdate(v2, y2, d2);
            });
          }
          if (h2.context = $2, h2.props = k2, h2.__P = n2, h2.__e = false, I2 = l.__r, P2 = 0, x2)
            h2.state = h2.__s, h2.__d = false, I2 && I2(u2), s2 = h2.render(h2.props, h2.state, h2.context), w.push.apply(h2.__h, h2._sb), h2._sb = [];
          else
            do {
              h2.__d = false, I2 && I2(u2), s2 = h2.render(h2.props, h2.state, h2.context), h2.state = h2.__s;
            } while (h2.__d && ++P2 < 25);
          h2.state = h2.__s, h2.getChildContext != null && (i2 = m(m({}, i2), h2.getChildContext())), x2 && !p2 && h2.getSnapshotBeforeUpdate != null && (d2 = h2.getSnapshotBeforeUpdate(v2, y2)), A2 = s2 != null && s2.type === S && s2.key == null ? E(s2.props.children) : s2, f2 = L(n2, g(A2) ? A2 : [A2], u2, t2, i2, r2, o2, e2, f2, c2, a2), h2.base = u2.__e, u2.__u &= -161, h2.__h.length && e2.push(h2), _2 && (h2.__E = h2.__ = null);
        } catch (n3) {
          if (u2.__v = null, c2 || o2 != null)
            if (n3.then) {
              for (u2.__u |= c2 ? 160 : 128;f2 && f2.nodeType == 8 && f2.nextSibling; )
                f2 = f2.nextSibling;
              o2[o2.indexOf(f2)] = null, u2.__e = f2;
            } else {
              for (H2 = o2.length;H2--; )
                b(o2[H2]);
              B(u2);
            }
          else
            u2.__e = t2.__e, u2.__k = t2.__k, n3.then || B(u2);
          l.__e(n3, u2, t2);
        }
      else
        o2 == null && u2.__v == t2.__v ? (u2.__k = t2.__k, u2.__e = t2.__e) : f2 = u2.__e = G(t2.__e, u2, t2, i2, r2, o2, e2, c2, a2);
    return (s2 = l.diffed) && s2(u2), 128 & u2.__u ? undefined : f2;
  }
  function B(n2) {
    n2 && (n2.__c && (n2.__c.__e = true), n2.__k && n2.__k.some(B));
  }
  function D(n2, u2, t2) {
    for (var i2 = 0;i2 < t2.length; i2++)
      J(t2[i2], t2[++i2], t2[++i2]);
    l.__c && l.__c(u2, n2), n2.some(function(u3) {
      try {
        n2 = u3.__h, u3.__h = [], n2.some(function(n3) {
          n3.call(u3);
        });
      } catch (n3) {
        l.__e(n3, u3.__v);
      }
    });
  }
  function E(n2) {
    return typeof n2 != "object" || n2 == null || n2.__b > 0 ? n2 : g(n2) ? n2.map(E) : n2.constructor !== undefined ? null : m({}, n2);
  }
  function G(u2, t2, i2, r2, o2, e2, f2, c2, a2) {
    var s2, h2, p2, v2, y2, w2, _2, m2 = i2.props || d, k2 = t2.props, x2 = t2.type;
    if (x2 == "svg" ? o2 = "http://www.w3.org/2000/svg" : x2 == "math" ? o2 = "http://www.w3.org/1998/Math/MathML" : o2 || (o2 = "http://www.w3.org/1999/xhtml"), e2 != null) {
      for (s2 = 0;s2 < e2.length; s2++)
        if ((y2 = e2[s2]) && "setAttribute" in y2 == !!x2 && (x2 ? y2.localName == x2 : y2.nodeType == 3)) {
          u2 = y2, e2[s2] = null;
          break;
        }
    }
    if (u2 == null) {
      if (x2 == null)
        return document.createTextNode(k2);
      u2 = document.createElementNS(o2, x2, k2.is && k2), c2 && (l.__m && l.__m(t2, e2), c2 = false), e2 = null;
    }
    if (x2 == null)
      m2 === k2 || c2 && u2.data == k2 || (u2.data = k2);
    else {
      if (e2 = x2 == "textarea" && k2.defaultValue != null ? null : e2 && n.call(u2.childNodes), !c2 && e2 != null)
        for (m2 = {}, s2 = 0;s2 < u2.attributes.length; s2++)
          m2[(y2 = u2.attributes[s2]).name] = y2.value;
      for (s2 in m2)
        y2 = m2[s2], s2 == "dangerouslySetInnerHTML" ? p2 = y2 : s2 == "children" || (s2 in k2) || s2 == "value" && ("defaultValue" in k2) || s2 == "checked" && ("defaultChecked" in k2) || N(u2, s2, null, y2, o2);
      for (s2 in k2)
        y2 = k2[s2], s2 == "children" ? v2 = y2 : s2 == "dangerouslySetInnerHTML" ? h2 = y2 : s2 == "value" ? w2 = y2 : s2 == "checked" ? _2 = y2 : c2 && typeof y2 != "function" || m2[s2] === y2 || N(u2, s2, y2, m2[s2], o2);
      if (h2)
        c2 || p2 && (h2.__html == p2.__html || h2.__html == u2.innerHTML) || (u2.innerHTML = h2.__html), t2.__k = [];
      else if (p2 && (u2.innerHTML = ""), L(t2.type == "template" ? u2.content : u2, g(v2) ? v2 : [v2], t2, i2, r2, x2 == "foreignObject" ? "http://www.w3.org/1999/xhtml" : o2, e2, f2, e2 ? e2[0] : i2.__k && $(i2, 0), c2, a2), e2 != null)
        for (s2 = e2.length;s2--; )
          b(e2[s2]);
      c2 && x2 != "textarea" || (s2 = "value", x2 == "progress" && w2 == null ? u2.removeAttribute("value") : w2 != null && (w2 !== u2[s2] || x2 == "progress" && !w2 || x2 == "option" && w2 != m2[s2]) && N(u2, s2, w2, m2[s2], o2), s2 = "checked", _2 != null && _2 != u2[s2] && N(u2, s2, _2, m2[s2], o2));
    }
    return u2;
  }
  function J(n2, u2, t2) {
    try {
      if (typeof n2 == "function") {
        var i2 = typeof n2.__u == "function";
        i2 && n2.__u(), i2 && u2 == null || (n2.__u = n2(u2));
      } else
        n2.current = u2;
    } catch (n3) {
      l.__e(n3, t2);
    }
  }
  function K(n2, u2, t2) {
    var i2, r2;
    if (l.unmount && l.unmount(n2), (i2 = n2.ref) && (i2.current && i2.current != n2.__e || J(i2, null, u2)), (i2 = n2.__c) != null) {
      if (i2.componentWillUnmount)
        try {
          i2.componentWillUnmount();
        } catch (n3) {
          l.__e(n3, u2);
        }
      i2.base = i2.__P = null;
    }
    if (i2 = n2.__k)
      for (r2 = 0;r2 < i2.length; r2++)
        i2[r2] && K(i2[r2], u2, t2 || typeof n2.type != "function");
    t2 || b(n2.__e), n2.__c = n2.__ = n2.__e = undefined;
  }
  function Q(n2, l2, u2) {
    return this.constructor(n2, u2);
  }
  function R(u2, t2, i2) {
    var r2, o2, e2, f2;
    t2 == document && (t2 = document.documentElement), l.__ && l.__(u2, t2), o2 = (r2 = typeof i2 == "function") ? null : i2 && i2.__k || t2.__k, e2 = [], f2 = [], q(t2, u2 = (!r2 && i2 || t2).__k = k(S, null, [u2]), o2 || d, d, t2.namespaceURI, !r2 && i2 ? [i2] : o2 ? null : t2.firstChild ? n.call(t2.childNodes) : null, e2, !r2 && i2 ? i2 : o2 ? o2.__e : t2.firstChild, r2, f2), D(e2, u2, f2);
  }
  n = w.slice, l = { __e: function(n2, l2, u2, t2) {
    for (var i2, r2, o2;l2 = l2.__; )
      if ((i2 = l2.__c) && !i2.__)
        try {
          if ((r2 = i2.constructor) && r2.getDerivedStateFromError != null && (i2.setState(r2.getDerivedStateFromError(n2)), o2 = i2.__d), i2.componentDidCatch != null && (i2.componentDidCatch(n2, t2 || {}), o2 = i2.__d), o2)
            return i2.__E = i2;
        } catch (l3) {
          n2 = l3;
        }
    throw n2;
  } }, u = 0, t = function(n2) {
    return n2 != null && n2.constructor === undefined;
  }, C.prototype.setState = function(n2, l2) {
    var u2;
    u2 = this.__s != null && this.__s != this.state ? this.__s : this.__s = m({}, this.state), typeof n2 == "function" && (n2 = n2(m({}, u2), this.props)), n2 && m(u2, n2), n2 != null && this.__v && (l2 && this._sb.push(l2), A(this));
  }, C.prototype.forceUpdate = function(n2) {
    this.__v && (this.__e = true, n2 && this.__h.push(n2), A(this));
  }, C.prototype.render = S, i = [], o = typeof Promise == "function" ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, e = function(n2, l2) {
    return n2.__v.__b - l2.__v.__b;
  }, H.__r = 0, f = Math.random().toString(8), c = "__d" + f, a = "__a" + f, s = /(PointerCapture)$|Capture$/i, h = 0, p = V(false), v = V(true), y = 0;

  // src/ui/render.ts
  function renderElement(node) {
    const host = document.createElement("div");
    R(node, host);
    const element = host.firstElementChild;
    if (!(element instanceof HTMLElement)) {
      throw new Error("Preact component did not render an HTMLElement");
    }
    return element;
  }
  // node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js
  var f2 = 0;
  function u2(e2, t2, n2, o2, i2, u3) {
    t2 || (t2 = {});
    var a2, c2, p2 = t2;
    if ("ref" in p2)
      for (c2 in p2 = {}, t2)
        c2 == "ref" ? a2 = t2[c2] : p2[c2] = t2[c2];
    var l2 = { type: e2, props: p2, key: n2, ref: a2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: undefined, __v: --f2, __i: -1, __u: 0, __source: i2, __self: u3 };
    if (typeof e2 == "function" && (a2 = e2.defaultProps))
      for (c2 in a2)
        p2[c2] === undefined && (p2[c2] = a2[c2]);
    return l.vnode && l.vnode(l2), l2;
  }

  // src/ui/shortcutHelp.tsx
  function ShortcutHelpContainer(props) {
    return renderElement(/* @__PURE__ */ u2("div", {
      id: SHORTCUT_HELP_CONTAINER_ID,
      children: [
        /* @__PURE__ */ u2("button", {
          id: SHORTCUT_HELP_BUTTON_ID,
          type: "button",
          "aria-label": "Mostrar atajos de teclado",
          "aria-haspopup": "dialog",
          "aria-expanded": "false",
          onClick: (event) => {
            event.preventDefault();
            event.stopPropagation();
            props.onToggle();
          },
          children: "?"
        }, undefined, false, undefined, this),
        /* @__PURE__ */ u2("div", {
          id: SHORTCUT_HELP_POPOVER_ID,
          hidden: true,
          role: "dialog",
          "aria-label": "Atajos de teclado",
          children: [
            /* @__PURE__ */ u2("div", {
              className: "fc-premium-shortcut-help-title",
              children: "Atajos de teclado"
            }, undefined, false, undefined, this),
            props.items.map((item) => /* @__PURE__ */ u2(ShortcutHelpRow, {
              item,
              formatKey: props.formatKey
            }, undefined, false, undefined, this))
          ]
        }, undefined, true, undefined, this)
      ]
    }, undefined, true, undefined, this));
  }
  function ShortcutHelpRow(props) {
    return /* @__PURE__ */ u2("div", {
      className: "fc-premium-shortcut-help-row",
      children: [
        /* @__PURE__ */ u2("span", {
          className: "fc-premium-shortcut-help-keys",
          children: props.item.keys.map((key) => /* @__PURE__ */ u2("kbd", {
            className: "fc-premium-shortcut-help-key",
            children: props.formatKey(key)
          }, undefined, false, undefined, this))
        }, undefined, false, undefined, this),
        /* @__PURE__ */ u2("span", {
          className: "fc-premium-shortcut-help-description",
          children: props.item.description
        }, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this);
  }

  // src/ui/shortcutHelpDom.ts
  var documentClickInstalled = false;
  function isShortcutHelpPopoverOpen() {
    const popover = document.getElementById(SHORTCUT_HELP_POPOVER_ID);
    return popover instanceof HTMLElement && !popover.hidden;
  }
  function closeShortcutHelpPopover() {
    setShortcutHelpPopoverOpen(false);
  }
  function setShortcutHelpPopoverOpen(open) {
    const button = document.getElementById(SHORTCUT_HELP_BUTTON_ID);
    const popover = document.getElementById(SHORTCUT_HELP_POPOVER_ID);
    if (!(button instanceof HTMLButtonElement) || !popover) {
      return;
    }
    popover.hidden = !open;
    button.setAttribute("aria-expanded", open ? "true" : "false");
  }
  function renderShortcutHelpButton(options) {
    if (!document.body) {
      return;
    }
    document.getElementById(SHORTCUT_HELP_CONTAINER_ID)?.remove();
    document.getElementById(SHORTCUT_HELP_BUTTON_ID)?.remove();
    document.getElementById(SHORTCUT_HELP_POPOVER_ID)?.remove();
    const container = ShortcutHelpContainer({
      items: options.items,
      formatKey: options.formatKey,
      onToggle: () => {
        setShortcutHelpPopoverOpen(!isShortcutHelpPopoverOpen());
      }
    });
    installShortcutHelpDocumentClick();
    document.body.prepend(container);
  }
  function installShortcutHelpDocumentClick() {
    if (documentClickInstalled) {
      return;
    }
    documentClickInstalled = true;
    document.addEventListener("click", handleShortcutHelpDocumentClick, true);
  }
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

  // src/ui/shortcutHelpItems.ts
  function getShortcutHelpItems() {
    return [
      {
        keys: [KEY_NAV_PREVIOUS_POST, KEY_NAV_NEXT_POST],
        description: "Seleccionar mensaje anterior/siguiente"
      },
      {
        keys: [KEY_NAV_PREVIOUS_PAGE, KEY_NAV_NEXT_PAGE],
        description: "Ir a la pagina anterior/siguiente"
      },
      {
        keys: [KEY_RETURN_TO_THREAD_LIST],
        description: "Volver a la lista de hilos"
      },
      {
        keys: [KEY_QUOTE_SELECTED_POST],
        description: "Abrir/citar el seleccionado"
      },
      {
        keys: [
          KEY_OPEN_SELECTED_THREAD_IN_NEW_TAB_MODIFIER,
          KEY_OPEN_SELECTED_THREAD_IN_NEW_TAB
        ],
        description: "Abrir hilo seleccionado en nueva pestaña"
      },
      {
        keys: [KEY_HIDE_SELECTED_THREAD],
        description: "Esconder hilo seleccionado"
      },
      {
        keys: [KEY_NEW_THREAD_REPLY],
        description: "Responder sin cita"
      },
      {
        keys: [KEY_MULTIQUOTE_SELECTED_POST],
        description: "Alternar multicita"
      },
      {
        keys: [KEY_CLEAR_ACTIVE_VIEW],
        description: "Limpiar filtros o cerrar ayuda"
      },
      {
        keys: [KEY_OPEN_SHORTCUT_HELP],
        description: "Mostrar estos atajos"
      }
    ];
  }
  function formatShortcutHelpKey(key) {
    if (key === KEY_NAV_PREVIOUS_POST) {
      return "Arriba";
    }
    if (key === KEY_NAV_NEXT_POST) {
      return "Abajo";
    }
    if (key === KEY_NAV_PREVIOUS_PAGE) {
      return "Izquierda";
    }
    if (key === KEY_NAV_NEXT_PAGE) {
      return "Derecha";
    }
    if (key === KEY_CLEAR_ACTIVE_VIEW) {
      return "Esc";
    }
    if (key.length === 1) {
      return key.toUpperCase();
    }
    return key;
  }

  // src/shared/hash.ts
  function hashString(value) {
    let hash = 0;
    for (let index = 0;index < value.length; index += 1) {
      hash = hash * 31 + value.charCodeAt(index) >>> 0;
    }
    return hash;
  }

  // src/domain/forumThreadList.ts
  function getForumThreadRowsSignature(rowHtmlList, scope) {
    return `${scope}|${rowHtmlList.length}|${rowHtmlList.map((html) => hashString(html).toString(36)).join(":")}`;
  }
  function getForumThreadListPage(records, requestedPage, pageSize) {
    const totalPages = getForumThreadListTotalPages(records.length, pageSize);
    const currentPage = clampForumThreadListPage(requestedPage, totalPages);
    const start = (currentPage - 1) * pageSize;
    const pageRecords = records.slice(start, start + pageSize);
    return {
      currentPage,
      totalPages,
      pageSize,
      records: pageRecords,
      rowHtmlList: pageRecords.map((record) => record.html)
    };
  }
  function getForumThreadListTotalPages(totalRecords, pageSize) {
    return Math.max(1, Math.ceil(totalRecords / pageSize));
  }
  function clampForumThreadListPage(pageNumber, totalPages) {
    return Math.min(Math.max(pageNumber, 1), totalPages);
  }

  // src/services/queryState.ts
  function readForumQueryState(url = new URL(location.href)) {
    const tag = normalizeAuthorName(url.searchParams.get(FORUM_STATE_QUERY_PARAMS.tag));
    const page = Number(url.searchParams.get("page") || "1");
    return {
      tag: tag || null,
      page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
    };
  }
  function clearForumStateQueryParams(url) {
    for (const param of Object.values(FORUM_STATE_QUERY_PARAMS)) {
      url.searchParams.delete(param);
    }
  }
  function isGraphViewType(type) {
    return GRAPH_VIEW_TYPES.includes(type || "");
  }
  function isThreadUrl(url) {
    return url.pathname.endsWith("/showthread.php") && Boolean(getThreadId(url) || getPostQueryId(url));
  }
  function clearThreadStateQueryParams(url) {
    for (const param of Object.values(THREAD_STATE_QUERY_PARAMS)) {
      url.searchParams.delete(param);
    }
    for (const param of LEGACY_THREAD_STATE_QUERY_PARAMS) {
      url.searchParams.delete(param);
    }
  }
  function readThreadQueryState(url = new URL(location.href)) {
    const emptyState = {
      graphView: null,
      pageFilter: null,
      authorFilters: [],
      searchQuery: ""
    };
    if (!isThreadUrl(url)) {
      return emptyState;
    }
    const graphType = url.searchParams.get(THREAD_STATE_QUERY_PARAMS.graphType);
    const graphRoot = url.searchParams.get(THREAD_STATE_QUERY_PARAMS.graphRoot);
    const graphRelated = url.searchParams.get(THREAD_STATE_QUERY_PARAMS.graphRelated);
    const pageFilter = Number(url.searchParams.get(THREAD_STATE_QUERY_PARAMS.pageFilter) || "");
    const authorFilters = Array.from(new Set(url.searchParams.getAll(THREAD_STATE_QUERY_PARAMS.authorFilter).map((author) => normalizeAuthorName(author)).filter(Boolean)));
    const searchQuery = normalizeText(url.searchParams.get(THREAD_STATE_QUERY_PARAMS.searchQuery));
    const graphView = isGraphViewType(graphType) && graphRoot ? {
      type: graphType,
      rootPostId: graphRoot,
      relatedPostId: graphRelated || null
    } : null;
    return {
      graphView,
      pageFilter: !graphView && authorFilters.length === 0 && !searchQuery && Number.isFinite(pageFilter) && pageFilter > 0 ? pageFilter : null,
      authorFilters,
      searchQuery
    };
  }

  // src/services/keyboard.ts
  function isEditableTarget(target) {
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
  }
  function hasKeyboardModifier(event) {
    return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
  }
  function keyboardShortcutMatches(event, key) {
    if (key.length === 1) {
      return event.key.toLowerCase() === key.toLowerCase();
    }
    return event.key === key;
  }
  function isMacKeyboardPlatform() {
    return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || "");
  }
  function isOpenInNewTabKeyboardShortcut(event, key) {
    if (event.key !== key || event.altKey || event.shiftKey) {
      return false;
    }
    return isMacKeyboardPlatform() ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
  }

  // src/app/core/navigationController.ts
  function createNavigationController(options, state = {
    navigationItems: [],
    selectedNavigationIndex: -1
  }) {
    function collectNavigationItems() {
      return options.collectNavigationItems();
    }
    function renderNavigationStatus(selected) {
      options.onRenderNavigationStatus?.(selected);
    }
    function updateSelectedPostUrl(selected) {
      options.onUpdateSelectedThreadUrl?.(selected);
    }
    function getPostsElement() {
      return options.getPostsElement();
    }
    function renderNavigationSelection(renderOptions = {}) {
      clearNavigationSelection();
      const selected = state.navigationItems[state.selectedNavigationIndex];
      if (!selected) {
        renderNavigationStatus(null);
        return;
      }
      markNavigationItemSelected(selected);
      renderNavigationStatus(selected);
      if (renderOptions.updateUrl && isThreadPage()) {
        updateSelectedPostUrl(selected);
      }
      if (renderOptions.scroll) {
        const mode = isThreadPage() ? "start" : "nearest";
        scrollNavigationElementIntoView(selected.element, mode);
      }
    }
    function refreshNavigation(options2 = {}) {
      const previousElement = state.navigationItems[state.selectedNavigationIndex]?.element;
      state.navigationItems = collectNavigationItems();
      if (state.navigationItems.length === 0) {
        state.selectedNavigationIndex = -1;
        renderNavigationSelection(options2);
        return;
      }
      if (options2.reset || state.selectedNavigationIndex < 0) {
        state.selectedNavigationIndex = 0;
      } else {
        const preservedIndex = state.navigationItems.findIndex((item) => item.element === previousElement);
        state.selectedNavigationIndex = preservedIndex >= 0 ? preservedIndex : 0;
      }
      renderNavigationSelection(options2);
    }
    function moveNavigation(direction) {
      if (state.navigationItems.length === 0) {
        refreshNavigation({ reset: true });
      }
      if (state.navigationItems.length === 0) {
        return;
      }
      state.selectedNavigationIndex = Math.min(Math.max(state.selectedNavigationIndex + direction, 0), state.navigationItems.length - 1);
      renderNavigationSelection({ scroll: true, updateUrl: true });
    }
    function selectNavigationIndex(index) {
      if (state.navigationItems.length === 0) {
        refreshNavigation({ reset: true });
      }
      if (state.navigationItems.length === 0) {
        return;
      }
      state.selectedNavigationIndex = Math.min(Math.max(index, 0), state.navigationItems.length - 1);
      renderNavigationSelection({ scroll: true, updateUrl: true });
    }
    function selectNavigationElement(element, options2 = {}) {
      const index = state.navigationItems.findIndex((item) => item.element === element);
      if (index < 0) {
        if (options2.scroll !== false) {
          const mode = isThreadPage() ? "start" : "nearest";
          scrollNavigationElementIntoView(element, mode);
        }
        return;
      }
      state.selectedNavigationIndex = index;
      renderNavigationSelection({
        scroll: options2.scroll !== false,
        updateUrl: options2.updateUrl !== false
      });
    }
    function getSelectedPostWrapper2() {
      if (state.navigationItems.length === 0) {
        refreshNavigation({ reset: true });
      }
      const selected = state.navigationItems[state.selectedNavigationIndex]?.element;
      if (selected instanceof HTMLElement && selected.matches(".fc-premium-post-wrapper")) {
        return selected;
      }
      return getSelectedPostWrapper();
    }
    function getSelectedNavigationItem() {
      if (state.navigationItems.length === 0) {
        refreshNavigation({ reset: true });
      }
      return state.navigationItems[state.selectedNavigationIndex] || null;
    }
    return {
      refreshNavigation,
      getNavigationItems: () => state.navigationItems,
      getSelectedNavigationItem,
      getNavigationLength: () => state.navigationItems.length,
      getSelectedPostWrapper: getSelectedPostWrapper2,
      moveNavigation,
      selectNavigationIndex,
      selectNavigationElement
    };
  }

  // src/ui/components/ForumControls.tsx
  function ForumSidebarToggleButton(props) {
    return renderElement(/* @__PURE__ */ u2("button", {
      id: FORUM_SIDEBAR_TOGGLE_ID,
      type: "button",
      title: props.hidden ? "Mostrar la columna izquierda" : "Ocultar la columna izquierda",
      "aria-expanded": !props.hidden,
      onClick: props.onToggle,
      children: props.hidden ? "Mostrar panel izquierdo" : "Ocultar panel izquierdo"
    }, undefined, false, undefined, this));
  }
  function HiddenThreadsToolbarCell(props) {
    return renderElement(/* @__PURE__ */ u2("td", {
      id: HIDDEN_THREADS_BUTTON_ID,
      className: "vbmenu_control",
      ...{ noWrap: true },
      style: "cursor: pointer",
      children: /* @__PURE__ */ u2("a", {
        href: "#",
        onClick: (event) => {
          event.preventDefault();
          props.onOpen();
        },
        children: "Hilos escondidos"
      }, undefined, false, undefined, this)
    }, undefined, false, undefined, this));
  }
  function ForumLoadingStatus() {
    return renderElement(/* @__PURE__ */ u2("span", {
      id: FORUM_LOADING_STATUS_ID,
      children: [
        /* @__PURE__ */ u2("span", {
          className: "fc-premium-spinner",
          "aria-hidden": "true"
        }, undefined, false, undefined, this),
        /* @__PURE__ */ u2("span", {
          "data-fc-premium-loading-text": "true"
        }, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this));
  }

  // src/domain/tags.ts
  var SPECIAL_TAGS = [
    "tema serio"
  ];
  var SINGLE_WORD_TAG_PATTERN = /^[A-Za-z0-9_-]+/;
  var SPECIAL_TAG_PATTERNS = SPECIAL_TAGS.map((tag) => ({
    tag,
    pattern: new RegExp(`^${escapeRegExp(tag).replace(/\\ /g, "\\s+")}(?![\\p{L}\\p{N}_-])`, "iu")
  }));
  function normalizeTag(tag) {
    return tag.replace(/\s+/g, " ").trim().toLowerCase();
  }
  function findTagsInText(source) {
    const text = String(source || "");
    const matches = [];
    for (let index = 0;index < text.length; index += 1) {
      if (text[index] !== "+") {
        continue;
      }
      const tagMatch = matchTagAfterPlus(text.slice(index + 1));
      if (!tagMatch) {
        continue;
      }
      matches.push({
        tag: tagMatch.tag,
        start: index,
        end: index + 1 + tagMatch.length
      });
      index += tagMatch.length;
    }
    return matches;
  }
  function getTagsFromText(source) {
    return Array.from(new Set(findTagsInText(source).map((match) => match.tag)));
  }
  function splitTextByTags(source) {
    const parts = [];
    let currentIndex = 0;
    for (const match of findTagsInText(source)) {
      if (match.start > currentIndex) {
        parts.push({
          type: "text",
          text: source.slice(currentIndex, match.start)
        });
      }
      parts.push({
        type: "tag",
        text: source.slice(match.start, match.end),
        tag: match.tag
      });
      currentIndex = match.end;
    }
    if (currentIndex < source.length) {
      parts.push({
        type: "text",
        text: source.slice(currentIndex)
      });
    }
    return parts;
  }
  function matchTagAfterPlus(source) {
    const leadingWhitespaceLength = source.match(/^\s*/)?.[0].length || 0;
    const candidate = source.slice(leadingWhitespaceLength);
    for (const special of SPECIAL_TAG_PATTERNS) {
      const match = candidate.match(special.pattern);
      if (match?.[0]) {
        return {
          tag: normalizeTag(special.tag),
          length: leadingWhitespaceLength + match[0].length
        };
      }
    }
    const wordMatch = candidate.match(SINGLE_WORD_TAG_PATTERN);
    if (!wordMatch?.[0]) {
      return null;
    }
    return {
      tag: normalizeTag(wordMatch[0]),
      length: leadingWhitespaceLength + wordMatch[0].length
    };
  }
  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // src/ui/components/Tags.tsx
  function TagChip(props) {
    return renderElement(/* @__PURE__ */ u2(TagChipView, {
      ...props
    }, undefined, false, undefined, this));
  }
  function TagChipView(props) {
    const canonicalTag = normalizeTag(props.tag);
    return /* @__PURE__ */ u2(TagBase, {
      tag: canonicalTag,
      role: "button",
      tabIndex: 0,
      title: props.title || `Filtrar por +${props.tag}`,
      "aria-pressed": props.pressed,
      onClick: (event) => {
        event.preventDefault();
        event.stopPropagation();
        props.onToggle(canonicalTag);
      },
      onKeyDown: (event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        props.onToggle(canonicalTag);
      },
      children: props.label || `+${props.tag}`
    }, undefined, false, undefined, this);
  }
  function TagLabelView(props) {
    return /* @__PURE__ */ u2(TagBase, {
      tag: props.tag,
      title: props.title,
      children: props.label || `+${props.tag}`
    }, undefined, false, undefined, this);
  }
  function TopTagBar(props) {
    return renderElement(/* @__PURE__ */ u2("div", {
      id: "fc-premium-top-tags",
      children: [
        /* @__PURE__ */ u2("span", {
          children: "Top tags:"
        }, undefined, false, undefined, this),
        props.tags.map((summary) => /* @__PURE__ */ u2(TagChipView, {
          tag: summary.tag,
          label: `+${summary.tag} (${summary.count})`,
          title: `Filtrar ${summary.count} hilos con +${summary.tag}`,
          pressed: props.activeTag === summary.tag,
          onToggle: props.onToggle
        }, undefined, false, undefined, this))
      ]
    }, undefined, true, undefined, this));
  }
  function getTagColors(tag) {
    const hue = hashString(tag.toLowerCase()) % 360;
    return {
      background: `hsl(${hue}, 82%, 92%)`,
      border: `hsl(${hue}, 58%, 60%)`,
      color: `hsl(${hue}, 70%, 24%)`
    };
  }
  function TagBase(props) {
    const { tag, children, ...elementProps } = props;
    const canonicalTag = normalizeTag(tag);
    const colors = getTagColors(canonicalTag);
    return /* @__PURE__ */ u2("span", {
      ...elementProps,
      className: "fc-premium-tag-chip",
      "data-fc-premium-tag": canonicalTag,
      style: {
        "--fc-premium-tag-bg": colors.background,
        "--fc-premium-tag-border": colors.border,
        "--fc-premium-tag-color": colors.color
      },
      children
    }, undefined, false, undefined, this);
  }

  // src/ui/components/HiddenThreadsModal.tsx
  function HiddenThreadsModal(props) {
    return renderElement(/* @__PURE__ */ u2("div", {
      id: HIDDEN_THREADS_MODAL_ID,
      hidden: true,
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "Hilos escondidos",
      onClick: (event) => {
        if (event.target === event.currentTarget) {
          props.onClose();
        }
      },
      children: /* @__PURE__ */ u2("div", {
        className: "fc-premium-hidden-threads-dialog",
        children: [
          /* @__PURE__ */ u2("div", {
            className: "fc-premium-hidden-threads-header",
            children: [
              /* @__PURE__ */ u2("span", {
                children: "Hilos escondidos"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u2("button", {
                type: "button",
                onClick: props.onClose,
                children: "Cerrar"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ u2(HiddenThreadsModalBodyView, {
            records: props.records,
            onRestore: props.onRestore
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    }, undefined, false, undefined, this));
  }
  function HiddenThreadsModalBody(props) {
    return renderElement(/* @__PURE__ */ u2(HiddenThreadsModalBodyView, {
      records: props.records,
      onRestore: props.onRestore
    }, undefined, false, undefined, this));
  }
  function HiddenThreadsModalBodyView(props) {
    return /* @__PURE__ */ u2("div", {
      id: HIDDEN_THREADS_MODAL_BODY_ID,
      children: props.records.length === 0 ? /* @__PURE__ */ u2("div", {
        className: "fc-premium-hidden-threads-empty",
        children: "No hay hilos escondidos en este foro."
      }, undefined, false, undefined, this) : /* @__PURE__ */ u2("table", {
        className: "fc-premium-hidden-threads-table",
        children: [
          /* @__PURE__ */ u2("thead", {
            children: /* @__PURE__ */ u2("tr", {
              children: [
                /* @__PURE__ */ u2("th", {
                  children: "Hilo"
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u2("th", {
                  children: "Info"
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u2("th", {
                  children: "Oculto"
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u2("th", {
                  children: "Accion"
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this)
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u2("tbody", {
            children: props.records.map((record) => /* @__PURE__ */ u2(HiddenThreadRow, {
              record,
              onRestore: props.onRestore
            }, undefined, false, undefined, this))
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    }, undefined, false, undefined, this);
  }
  function HiddenThreadRow(props) {
    const record = props.record;
    const info = [
      record.author ? `Autor: ${record.author}` : "",
      record.statsText,
      record.lastPostText
    ].filter(Boolean);
    return /* @__PURE__ */ u2("tr", {
      children: [
        /* @__PURE__ */ u2("td", {
          children: [
            /* @__PURE__ */ u2("a", {
              className: "fc-premium-hidden-thread-title",
              href: record.url,
              children: record.title || `Hilo ${record.id}`
            }, undefined, false, undefined, this),
            record.tags.length > 0 ? /* @__PURE__ */ u2("div", {
              className: "fc-premium-hidden-thread-meta",
              children: [
                record.tags.slice(0, 5).map((tag) => /* @__PURE__ */ u2(TagLabelView, {
                  tag
                }, undefined, false, undefined, this)),
                record.tags.length > 5 ? ` +${record.tags.length - 5}` : ""
              ]
            }, undefined, true, undefined, this) : null
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ u2("td", {
          children: info.length > 0 ? info.join(" · ") : "-"
        }, undefined, false, undefined, this),
        /* @__PURE__ */ u2("td", {
          children: formatHiddenThreadDate(record.hiddenAt)
        }, undefined, false, undefined, this),
        /* @__PURE__ */ u2("td", {
          children: /* @__PURE__ */ u2("button", {
            type: "button",
            className: "fc-premium-hidden-thread-restore",
            onClick: () => props.onRestore(record.id),
            children: "Restaurar"
          }, undefined, false, undefined, this)
        }, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this);
  }
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

  // src/ui/hiddenThreadsModalDom.ts
  function renderHiddenThreadsToolbarButton(options) {
    if (!options.toolbarRow || !(options.toolsCell instanceof HTMLTableCellElement)) {
      return;
    }
    const existing = document.getElementById(HIDDEN_THREADS_BUTTON_ID);
    const cell = HiddenThreadsToolbarCell({
      onOpen: options.onOpen
    });
    if (existing instanceof HTMLTableCellElement) {
      existing.replaceWith(cell);
    }
    if (cell.parentElement !== options.toolbarRow || cell.nextElementSibling !== options.toolsCell) {
      options.toolbarRow.insertBefore(cell, options.toolsCell);
    }
  }
  function ensureHiddenThreadsModal(options) {
    let modal = document.getElementById(HIDDEN_THREADS_MODAL_ID);
    if (modal instanceof HTMLElement) {
      return modal;
    }
    modal = HiddenThreadsModal({
      records: options.records,
      onClose: options.onClose,
      onRestore: options.onRestore
    });
    document.body.append(modal);
    return modal;
  }
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
  function renderHiddenThreadsModalBody(options) {
    const body = options.modal.querySelector(`#${HIDDEN_THREADS_MODAL_BODY_ID}`);
    if (!(body instanceof HTMLElement)) {
      return;
    }
    body.replaceWith(HiddenThreadsModalBody({
      records: options.records,
      onRestore: options.onRestore
    }));
  }
  function openHiddenThreadsModal(options) {
    renderHiddenThreadsModalBody({
      modal: options.modal,
      records: options.records,
      onRestore: options.onRestore
    });
    options.modal.hidden = false;
    document.documentElement.classList.add(MODAL_OPEN_CLASS);
    document.body.classList.add(MODAL_OPEN_CLASS);
    options.modal.querySelector("button")?.focus({ preventScroll: true });
  }

  // src/adapters/forocoches/forumLayout.ts
  function getForumThreadsTable() {
    const table = document.getElementById("threadslist");
    if (table instanceof HTMLTableElement) {
      return table;
    }
    const title = document.querySelector(THREAD_TITLE_SELECTOR);
    const owner = title?.closest("table");
    return owner instanceof HTMLTableElement ? owner : null;
  }
  function getForumThreadListHeaderTable() {
    const threadsTable = getForumThreadsTable();
    let sibling = threadsTable?.previousElementSibling || null;
    while (sibling) {
      if (sibling instanceof HTMLTableElement && normalizeText(sibling.querySelector("td.tcat")?.textContent).startsWith("Temas en el Foro")) {
        return sibling;
      }
      sibling = sibling.previousElementSibling;
    }
    for (const table of document.querySelectorAll("table.tborder")) {
      if (table instanceof HTMLTableElement && normalizeText(table.querySelector("td.tcat")?.textContent).startsWith("Temas en el Foro")) {
        return table;
      }
    }
    return null;
  }
  function removeForumTitleTables() {
    const header = getForumThreadListHeaderTable();
    const forumName = getForumNameFromThreadListHeader();
    for (const table of document.querySelectorAll("table.tborder")) {
      if (table instanceof HTMLTableElement && (isForumTitleSummaryTable(table, header, forumName) || isForumBreadcrumbTitleTable(table, header, forumName))) {
        table.remove();
      }
    }
  }
  function getRelatedForumsPanel() {
    for (const table of document.querySelectorAll("table")) {
      if (!(table instanceof HTMLTableElement)) {
        continue;
      }
      const header = normalizeText(table.querySelector("tr:first-child td")?.textContent).toLowerCase();
      if (header === "foros relacionados" || header === "related forums") {
        return table;
      }
    }
    return null;
  }
  function getForumSidebarCell(panel) {
    let current = panel.parentElement;
    while (current) {
      if (current instanceof HTMLTableCellElement) {
        const cells = getDirectTableCells(current.parentElement);
        const hasMainSibling = cells.some((cell) => cell !== current && cellContainsForumThreads(cell));
        if (hasMainSibling) {
          return current;
        }
      }
      current = current.parentElement;
    }
    return null;
  }
  function getForumMainCell(sidebarCell) {
    const cells = getDirectTableCells(sidebarCell.parentElement);
    return cells.find(cellContainsForumThreads) || null;
  }
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
    return cells.slice(sidebarIndex + 1, mainIndex).find(isForumSidebarSpacerCell) || null;
  }
  function setForumLayoutElementHidden(element, hidden) {
    if (hidden) {
      element.setAttribute(FORUM_LAYOUT_HIDDEN_ATTRIBUTE, "true");
    } else {
      element.removeAttribute(FORUM_LAYOUT_HIDDEN_ATTRIBUTE);
    }
  }
  function hideElementAndAdjacentSpacers(element) {
    setForumLayoutElementHidden(element, true);
    for (const sibling of [
      element.previousElementSibling,
      element.nextElementSibling
    ]) {
      if (sibling instanceof HTMLElement && isSmallLayoutSpacer(sibling)) {
        setForumLayoutElementHidden(sibling, true);
      }
    }
  }
  function isForumTopShortcutBar(table) {
    return isForumHomeShortcutBar(table) || isForumUserShortcutBar(table);
  }
  function shouldIgnoreTopNavigationTable(table) {
    return table.id === FORUM_CONTROLS_ROW_ID || Boolean(table.closest(`#${FORUM_CONTROLS_ROW_ID}`));
  }
  function hideTopShortcutBarsBefore(anchor) {
    for (const table of document.querySelectorAll("table")) {
      if (!(table instanceof HTMLTableElement)) {
        continue;
      }
      if (shouldIgnoreTopNavigationTable(table)) {
        continue;
      }
      if (isBeforeMainContent(table, anchor) && isForumTopShortcutBar(table)) {
        hideElementAndAdjacentSpacers(table);
      }
    }
  }
  function isBeforeMainContent(element, anchor) {
    if (anchor && element.contains(anchor)) {
      return false;
    }
    return !anchor || Boolean(element.compareDocumentPosition(anchor) & Node.DOCUMENT_POSITION_FOLLOWING);
  }
  function setForumMainCellExpanded(mainCell, expanded) {
    if (mainCell.dataset.fcPremiumOriginalWidth === undefined) {
      mainCell.dataset.fcPremiumOriginalWidth = mainCell.getAttribute("width") || "";
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
  function getForumNameFromThreadListHeader() {
    const header = getForumThreadListHeaderTable();
    const label = normalizeText(header?.querySelector("td.tcat .normal")?.textContent).replace(/^:\s*/, "").trim();
    return label || null;
  }
  function isForumTitleSummaryTable(table, header, forumName) {
    if (header && !(table.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING)) {
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
  function isForumBreadcrumbTitleTable(table, header, forumName) {
    if (header && !(table.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING)) {
      return false;
    }
    const title = normalizeText(table.querySelector("td.navbar strong")?.textContent);
    if (!title) {
      return false;
    }
    if (forumName && !title.toLowerCase().startsWith(forumName.toLowerCase())) {
      return false;
    }
    return Boolean(table.querySelector("img[src*='navbits_finallink']"));
  }
  function getDirectTableCells(row) {
    if (!(row instanceof HTMLTableRowElement)) {
      return [];
    }
    return Array.from(row.children).filter((child) => child instanceof HTMLTableCellElement);
  }
  function cellContainsForumThreads(cell) {
    return Boolean(cell.querySelector("#threadslist") || cell.querySelector(THREAD_TITLE_SELECTOR));
  }
  function isForumSidebarSpacerCell(cell) {
    const width = Number(cell.getAttribute("width") || "0");
    const renderedWidth = cell.getBoundingClientRect().width;
    return normalizeText(cell.textContent).length === 0 && (Number.isFinite(width) && width > 0 && width <= 8 || renderedWidth > 0 && renderedWidth <= 8);
  }
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
    const explicitHeight = Number(element.getAttribute("height") || element.style.height.replace("px", ""));
    const renderedHeight = element.getBoundingClientRect().height;
    return ["DIV", "TABLE", "TBODY", "TR"].includes(element.tagName) && (Number.isFinite(explicitHeight) && explicitHeight > 0 && explicitHeight <= 12 || renderedHeight > 0 && renderedHeight <= 12);
  }
  function isForumHomeShortcutBar(table) {
    const text = normalizeLayoutText(table.textContent);
    return text === "inicio foro" || /^inicio foro\b/.test(text);
  }
  function isForumUserShortcutBar(table) {
    const text = normalizeLayoutText(table.textContent);
    return text.includes("panel control") && text.includes("temas iniciados") && text.includes("temas participados") && text.includes("finalizar sesion");
  }

  // src/adapters/forocoches/threadHeader.ts
  function getThreadTitleTable() {
    const table = document.querySelector("table[id^='fcthread']");
    return table instanceof HTMLTableElement ? table : null;
  }
  function getThreadBreadcrumbOuterTable() {
    const titleTable = getThreadTitleTable();
    const table = Array.from(document.querySelectorAll("table.tborder")).find((table2) => {
      if (!(table2 instanceof HTMLTableElement)) {
        return false;
      }
      if (titleTable && !(table2.compareDocumentPosition(titleTable) & Node.DOCUMENT_POSITION_FOLLOWING)) {
        return false;
      }
      return Boolean(table2.querySelector(".navbar") && table2.querySelector("img[src*='navbits_finallink']"));
    });
    return table instanceof HTMLTableElement ? table : null;
  }
  function getThreadBreadcrumbContentTable() {
    const outerTable = getThreadBreadcrumbOuterTable();
    const contentTable = outerTable?.rows[0]?.cells[0]?.querySelector("table");
    return contentTable instanceof HTMLTableElement ? contentTable : null;
  }
  function getNavbarSearchLink() {
    const link = document.getElementById("navbar_search");
    return link instanceof HTMLAnchorElement ? link : null;
  }
  function getThreadForumListLink() {
    const breadcrumbs = document.querySelector(".fc-premium-thread-header-breadcrumbs") || getThreadBreadcrumbContentTable() || getThreadBreadcrumbOuterTable();
    const links = Array.from((breadcrumbs || document).querySelectorAll("a[href*='forumdisplay.php']")).filter((link) => link instanceof HTMLAnchorElement);
    return links.at(-1) || null;
  }
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
  function hideForumHeaderSearchForm() {
    const parts = getForumHeaderSearchFormParts();
    if (parts?.oldContainer instanceof HTMLElement) {
      hideElementAndAdjacentSpacers(parts.oldContainer);
    }
  }
  function hideNativeThreadSearchMenu() {
    for (const id of ["threadsearch", "threadsearch_menu"]) {
      const element = document.getElementById(id);
      if (element instanceof HTMLElement) {
        element.setAttribute(FORUM_LAYOUT_HIDDEN_ATTRIBUTE, "true");
      }
    }
  }
  function getForumHeaderSearchFormParts() {
    const form = document.querySelector("form[name='busca'][action*='forocoches_search']");
    if (!(form instanceof HTMLFormElement)) {
      return null;
    }
    const nextCell = form.nextElementSibling;
    if (nextCell instanceof HTMLTableCellElement && nextCell.querySelector("input[name='query']")) {
      return {
        form,
        controlsCell: nextCell,
        oldContainer: nextCell.closest("table.cajasprin") || nextCell.closest("table")?.parentElement?.closest("tr") || nextCell.closest("table")
      };
    }
    const queryInput = Array.from(document.querySelectorAll("input[name='query']")).filter((input) => input instanceof HTMLInputElement).find((input) => input.classList.contains("cfield"));
    const controlsCell = queryInput?.closest("td");
    if (!(controlsCell instanceof HTMLTableCellElement)) {
      return null;
    }
    return {
      form,
      controlsCell,
      oldContainer: controlsCell.closest("table.cajasprin") || controlsCell.closest("table")?.parentElement?.closest("tr") || controlsCell.closest("table")
    };
  }

  // src/app/core/forumLayoutController.ts
  function createForumLayoutController(options) {
    let forumSidebarHidden = getSavedForumSidebarHidden();
    function getSavedForumSidebarHidden() {
      const saved = localStorage.getItem(FORUM_SIDEBAR_STORAGE_KEY);
      return saved === null ? true : saved === "true";
    }
    function setSavedForumSidebarHidden(hidden) {
      forumSidebarHidden = hidden;
      localStorage.setItem(FORUM_SIDEBAR_STORAGE_KEY, String(hidden));
      applyForumSidebarVisibility();
    }
    function getMainContentAnchor() {
      return getForumThreadsTable() || options.getPostsElement() || getThreadTitleTable();
    }
    function hideUnusedTopNavigationBars() {
      if (!isForumDisplayPage() && !isThreadPage()) {
        return;
      }
      hideTopShortcutBarsBefore(getMainContentAnchor());
    }
    function getOrCreateForumSidebarToggleButton() {
      const existing = document.getElementById(FORUM_SIDEBAR_TOGGLE_ID);
      const button = ForumSidebarToggleButton({
        hidden: forumSidebarHidden,
        onToggle: () => {
          setSavedForumSidebarHidden(!forumSidebarHidden);
        }
      });
      if (existing instanceof HTMLButtonElement) {
        existing.replaceWith(button);
      }
      return button;
    }
    function getForumToolbarRow() {
      const toolsCell = document.getElementById("forumtools");
      const row = toolsCell?.parentElement;
      return row instanceof HTMLTableRowElement ? row : null;
    }
    function renderHiddenThreadsToolbarButton2() {
      if (!isForumDisplayPage()) {
        return;
      }
      renderHiddenThreadsToolbarButton({
        toolbarRow: getForumToolbarRow(),
        toolsCell: document.getElementById("forumtools"),
        onOpen: openHiddenThreadsModal2
      });
    }
    function ensureHiddenThreadsModal2() {
      return ensureHiddenThreadsModal({
        records: options.getHiddenForumThreadRecordsForCurrentForum(),
        onClose: closeHiddenThreadsModal2,
        onRestore: (threadId) => {
          options.setForumThreadHiddenState(threadId, false);
        }
      });
    }
    function isHiddenThreadsModalOpen2() {
      return isHiddenThreadsModalOpen();
    }
    function closeHiddenThreadsModal2() {
      closeHiddenThreadsModal();
    }
    function renderHiddenThreadsModalBody2() {
      renderHiddenThreadsModalBody({
        modal: ensureHiddenThreadsModal2(),
        records: options.getHiddenForumThreadRecordsForCurrentForum(),
        onRestore: (threadId) => {
          options.setForumThreadHiddenState(threadId, false);
        }
      });
    }
    function openHiddenThreadsModal2() {
      openHiddenThreadsModal({
        modal: ensureHiddenThreadsModal2(),
        records: options.getHiddenForumThreadRecordsForCurrentForum(),
        onRestore: (threadId) => {
          options.setForumThreadHiddenState(threadId, false);
        }
      });
    }
    function isNativeForumControlsTable(table) {
      return Boolean(table.querySelector("a[href*='newthread.php'][href*='do=newthread']") && table.querySelector(".pagenav"));
    }
    function getNativeForumControlsTable() {
      const existing = document.getElementById(FORUM_CONTROLS_ROW_ID);
      if (existing instanceof HTMLTableElement) {
        return existing;
      }
      const threadsTable = getForumThreadsTable();
      const candidates = Array.from(document.querySelectorAll("table")).filter((table) => {
        if (!(table instanceof HTMLTableElement)) {
          return false;
        }
        if (!isNativeForumControlsTable(table)) {
          return false;
        }
        return !threadsTable || Boolean(table.compareDocumentPosition(threadsTable) & Node.DOCUMENT_POSITION_FOLLOWING);
      });
      return candidates[candidates.length - 1] || null;
    }
    function createForumLoadingStatus() {
      return ForumLoadingStatus();
    }
    function renderForumLoadingStatus() {
      const status = document.getElementById(FORUM_LOADING_STATUS_ID);
      if (!(status instanceof HTMLElement)) {
        return;
      }
      const loadState = options.getForumThreadLoadState();
      const visible = loadState.isLoading;
      const loadedPages = Math.min(loadState.loadedPages, loadState.targetPages);
      const text = status.querySelector("[data-fc-premium-loading-text]");
      status.dataset.fcPremiumLoading = String(visible);
      status.setAttribute("aria-hidden", String(!visible));
      status.title = visible ? "Cargando paginas del foro" : "";
      if (text instanceof HTMLElement) {
        text.textContent = `Cargando paginas ${loadedPages}`;
      }
    }
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
        options.scheduleForumLiveSearch(input.value);
      });
    }
    function detachMovedForumSearchForm(controlsTable) {
      const form = document.querySelector("form[name='busca'][action*='forocoches_search']");
      if (form instanceof HTMLFormElement && controlsTable.contains(form)) {
        form.remove();
        return form;
      }
      return null;
    }
    function refreshExistingForumControlsRow(table) {
      table.classList.add("fc-premium-forum-controls-table");
      table.removeAttribute(FORUM_LAYOUT_HIDDEN_ATTRIBUTE);
      const toggleCell = table.querySelector(".fc-premium-forum-sidebar-toggle-cell");
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
      const newThreadLink = table.querySelector("a[href*='newthread.php'][href*='do=newthread']");
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
      document.body.classList.toggle(FORUM_SIDEBAR_HIDDEN_CLASS, forumSidebarHidden);
      setForumLayoutElementHidden(sidebarCell, forumSidebarHidden);
      const spacerCell = getForumSidebarSpacerCell(sidebarCell);
      if (spacerCell) {
        setForumLayoutElementHidden(spacerCell, forumSidebarHidden);
      }
      setForumMainCellExpanded(mainCell, forumSidebarHidden);
      renderForumSidebarToggle(mainCell);
    }
    function enhanceForumDisplayPage() {
      options.ensureStyle();
      hideUnusedTopNavigationBars();
      removeForumTitleTables();
      applyForumSidebarVisibility();
      renderForumControlsRow();
      renderHiddenThreadsToolbarButton2();
      hideUnusedTopNavigationBars();
    }
    return {
      renderForumControlsRow,
      renderForumLoadingStatus,
      enhanceForumDisplayPage,
      renderHiddenThreadsToolbarButton: renderHiddenThreadsToolbarButton2,
      isHiddenThreadsModalOpen: isHiddenThreadsModalOpen2,
      closeHiddenThreadsModal: closeHiddenThreadsModal2,
      renderHiddenThreadsModalBody: renderHiddenThreadsModalBody2,
      openHiddenThreadsModal: openHiddenThreadsModal2
    };
  }

  // src/app/core/forumPageKeyboardController.ts
  function createForumPageKeyboardController(handlers) {
    function handleNavigationKeyDown(event) {
      if (isEditableTarget(event.target)) {
        return false;
      }
      if ((event.key === KEY_NAV_NEXT_POST || event.key === KEY_NAV_PREVIOUS_POST) && hasKeyboardModifier(event)) {
        return false;
      }
      if ((event.key === KEY_NAV_NEXT_PAGE || event.key === KEY_NAV_PREVIOUS_PAGE) && hasKeyboardModifier(event)) {
        return false;
      }
      if (event.key === KEY_OPEN_SHORTCUT_HELP) {
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
        if (!hasKeyboardModifier(event)) {
          event.preventDefault();
          handlers.moveNavigation(1);
          return true;
        }
        return false;
      }
      if (event.key === KEY_NAV_PREVIOUS_POST) {
        if (!hasKeyboardModifier(event)) {
          event.preventDefault();
          handlers.moveNavigation(-1);
          return true;
        }
        return false;
      }
      if (event.key === KEY_NAV_PREVIOUS_PAGE) {
        event.preventDefault();
        return handlers.navigateForumPage(-1);
      }
      if (event.key === KEY_NAV_NEXT_PAGE) {
        event.preventDefault();
        return handlers.navigateForumPage(1);
      }
      if (event.key === KEY_OPEN_SELECTED_THREAD_IN_NEW_TAB && handlers.isOpenSelectedThreadInNewTabShortcut(event)) {
        event.preventDefault();
        handlers.openSelectedForumThreadInNewTab();
        return true;
      }
      if (event.key === KEY_CLEAR_ACTIVE_VIEW) {
        if (handlers.isHiddenThreadsModalOpen()) {
          event.preventDefault();
          handlers.closeHiddenThreadsModal();
          return true;
        }
        if (handlers.activeTagFilterExists()) {
          event.preventDefault();
          handlers.clearTagFilter();
          return true;
        }
      }
      if (event.key === KEY_HIDE_SELECTED_THREAD) {
        event.preventDefault();
        handlers.hideSelectedForumThread();
        return true;
      }
      if (event.key === KEY_QUOTE_SELECTED_POST && !handlers.isThreadPage()) {
        event.preventDefault();
        handlers.openSelectedNavigationItem();
        return true;
      }
      return false;
    }
    return { handleNavigationKeyDown };
  }

  // src/domain/forumThreads.ts
  function getForumSearchTokens(query2) {
    return normalizeLayoutText(query2).split(/\s+/).filter(Boolean);
  }
  function forumThreadMatchesSearchTokens(record, tokens) {
    if (tokens.length === 0) {
      return true;
    }
    const text = normalizeLayoutText(record.title);
    return tokens.every((token) => text.includes(token));
  }
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
  function getVisibleForumThreadRecords(records) {
    return records.filter((record) => !record.isHidden);
  }
  function getHiddenForumThreadRecords(records) {
    return sortForumThreadRecords(records.filter((record) => record.isHidden)).sort((left, right) => right.hiddenAt - left.hiddenAt);
  }
  function filterForumThreadRecords(records, filters) {
    const tokens = getForumSearchTokens(filters.searchQuery);
    return sortForumThreadRecords(getVisibleForumThreadRecords(records).filter((record) => (!filters.tag || record.tags.includes(filters.tag)) && forumThreadMatchesSearchTokens(record, tokens)));
  }

  // src/adapters/forocoches/forumThreadParser.ts
  function getTitleTags(title) {
    const source = title.title || normalizeText(title.textContent);
    return getTagsFromText(source);
  }
  function collectForumThreadRecords(doc, sourceUrl, forumId, pageNumber, pageSize, scrapeStartedAt) {
    const table = getForumThreadsTableFromDocument(doc);
    if (!table) {
      return [];
    }
    const rows = Array.from(table.querySelectorAll("tr")).filter((row) => row instanceof HTMLTableRowElement && row.querySelector(THREAD_TITLE_SELECTOR));
    return rows.map((row, index) => {
      const title = row.querySelector(THREAD_TITLE_SELECTOR);
      const url = title instanceof HTMLAnchorElement ? toUrl(title.getAttribute("href") || title.href) : null;
      const threadId = url ? getThreadId(url) : null;
      return threadId ? createForumThreadRecordFromRow(row, threadId, sourceUrl, forumId, pageNumber, pageSize, index, scrapeStartedAt) : null;
    }).filter((record) => record !== null);
  }
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
    clone.querySelectorAll(`[${HIDDEN_THREAD_ATTRIBUTE}]`).forEach((element) => {
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
  function getForumThreadsTableFromDocument(doc) {
    const table = doc.getElementById("threadslist");
    if (table instanceof HTMLTableElement) {
      return table;
    }
    const title = doc.querySelector(THREAD_TITLE_SELECTOR);
    const owner = title?.closest("table");
    return owner instanceof HTMLTableElement ? owner : null;
  }
  function createForumThreadRecordFromRow(row, threadId, sourceUrl, forumId, pageNumber, pageSize, pageIndex, scrapeStartedAt) {
    const title = row.querySelector(THREAD_TITLE_SELECTOR);
    if (!(title instanceof HTMLAnchorElement)) {
      return null;
    }
    const titleText = normalizeText(title.textContent);
    const cells = Array.from(row.cells);
    const titleCell = title.closest("td");
    const titleCellIndex = titleCell instanceof HTMLTableCellElement ? cells.indexOf(titleCell) : -1;
    const author = normalizeText(titleCell?.querySelector(".smallfont span")?.textContent);
    const lastPostCell = titleCellIndex >= 0 ? cells[titleCellIndex + 1] : null;
    const statsCell = titleCellIndex >= 0 ? cells[titleCellIndex + 2] : null;
    const recentIndex = (pageNumber - 1) * pageSize + pageIndex;
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
      statsText: normalizeText(statsCell?.getAttribute("title") || statsCell?.textContent),
      rowText: normalizeText(row.textContent),
      sourcePage: pageNumber,
      sourceIndex: pageIndex,
      recentIndex,
      lastSeen: scrapeStartedAt,
      updatedAt: Date.now(),
      isHidden: false,
      hiddenAt: 0
    };
  }

  // src/adapters/forocoches/forumThreadListDom.ts
  function renderVisibleForumThreadTitleTags(root, renderTaggedTitle) {
    for (const title of root.querySelectorAll(THREAD_TITLE_SELECTOR)) {
      if (title instanceof HTMLAnchorElement) {
        renderTaggedTitle(title);
      }
    }
  }
  function renderForumThreadRowsFromHtml(options) {
    const table = getForumThreadsTable();
    if (!table || options.signature === options.currentSignature) {
      return false;
    }
    const template = document.createElement("template");
    template.innerHTML = [
      ...options.headerRowHtml,
      ...options.rowHtmlList
    ].join("");
    for (const body2 of Array.from(table.tBodies)) {
      body2.remove();
    }
    const body = table.createTBody();
    body.append(template.content);
    renderVisibleForumThreadTitleTags(body, options.renderTaggedTitle);
    return true;
  }
  function restoreForumThreadRowsFromHtml(options) {
    if (options.nativeRowHtml.length > 0) {
      return renderForumThreadRowsFromHtml({
        headerRowHtml: options.headerRowHtml,
        rowHtmlList: options.nativeRowHtml,
        signature: options.nativeSignature,
        currentSignature: options.currentSignature,
        renderTaggedTitle: options.renderTaggedTitle
      });
    }
    return false;
  }
  function applyHiddenForumThreadRows(hiddenThreadIds) {
    const table = getForumThreadsTable();
    if (!table) {
      return;
    }
    for (const row of Array.from(table.rows)) {
      const title = row.querySelector(THREAD_TITLE_SELECTOR);
      if (!(title instanceof HTMLAnchorElement)) {
        row.removeAttribute(HIDDEN_THREAD_ATTRIBUTE);
        continue;
      }
      const threadId = getThreadId(new URL(title.href));
      if (threadId && hiddenThreadIds.has(threadId)) {
        row.setAttribute(HIDDEN_THREAD_ATTRIBUTE, "true");
      } else {
        row.removeAttribute(HIDDEN_THREAD_ATTRIBUTE);
      }
    }
  }

  // src/app/core/forumTagsController.ts
  function createForumTagsController(options) {
    function createTagChip(tag) {
      return TagChip({
        tag,
        onToggle: toggleTagFilter
      });
    }
    function renderTaggedTitle(title) {
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
      options.ensureStyle();
      for (const title of document.querySelectorAll(THREAD_TITLE_SELECTOR)) {
        if (title instanceof HTMLAnchorElement) {
          renderTaggedTitle(title);
        }
      }
      if (isForumDisplayPage()) {
        renderTopTagBar();
      }
    }
    function renderVisibleForumThreadTitleTags2(root = document) {
      renderVisibleForumThreadTitleTags(root, renderTaggedTitle);
    }
    function toggleTagFilter(tag) {
      if (!isForumDisplayPage()) {
        return;
      }
      options.setActiveTagFilter(options.getActiveTagFilter() === tag ? null : tag);
      options.setActiveForumTagPage(1);
      options.syncForumTagUrl({ history: "push" });
      options.refreshForumTagUi();
    }
    function clearTagFilter() {
      if (!options.getActiveTagFilter()) {
        return;
      }
      options.setActiveTagFilter(null);
      options.setActiveForumTagPage(1);
      options.syncForumTagUrl({ history: "push" });
      options.refreshForumTagUi();
    }
    function getTopTitleTags() {
      const tagsByName = new Map;
      let titleIndex = 0;
      const forumRecords = options.getVisibleCachedForumThreadsForCurrentForum();
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
                firstIndex: titleIndex
              });
            }
          }
          titleIndex += 1;
        }
        return Array.from(tagsByName.values()).sort(compareTopTagSummary).slice(0, 12);
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
      return Array.from(tagsByName.values()).sort(compareTopTagSummary).slice(0, 12);
    }
    function compareTopTagSummary(left, right) {
      if (left.count !== right.count) {
        return right.count - left.count;
      }
      return left.firstIndex - right.firstIndex;
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
      table.before(TopTagBar({
        tags: topTags,
        activeTag: options.getActiveTagFilter(),
        onToggle: toggleTagFilter
      }));
    }
    return {
      renderTaggedTitle,
      enhanceThreadTitleTags,
      renderVisibleForumThreadTitleTags: renderVisibleForumThreadTitleTags2,
      toggleTagFilter,
      clearTagFilter,
      renderTopTagBar
    };
  }

  // src/services/threadCache/db.ts
  var threadCacheDbPromise = null;
  function canUseThreadCache() {
    return typeof indexedDB !== "undefined";
  }
  function openThreadCacheDb() {
    if (threadCacheDbPromise) {
      return threadCacheDbPromise;
    }
    if (!canUseThreadCache()) {
      return Promise.reject(new Error("IndexedDB no esta disponible"));
    }
    threadCacheDbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(THREAD_CACHE_DB_NAME, THREAD_CACHE_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        const store = db.objectStoreNames.contains(THREAD_CACHE_STORE_NAME) ? request.transaction?.objectStore(THREAD_CACHE_STORE_NAME) : db.createObjectStore(THREAD_CACHE_STORE_NAME, {
          keyPath: "threadId"
        });
        if (store && !store.indexNames.contains("savedAt")) {
          store.createIndex("savedAt", "savedAt", { unique: false });
        }
        const forumStore = db.objectStoreNames.contains(FORUM_THREAD_CACHE_STORE_NAME) ? request.transaction?.objectStore(FORUM_THREAD_CACHE_STORE_NAME) : db.createObjectStore(FORUM_THREAD_CACHE_STORE_NAME, {
          keyPath: "id"
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
        console.warn("Forocoches Premium: otra pestana esta bloqueando la cache");
      };
    });
    return threadCacheDbPromise;
  }
  function waitForIdbRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        reject(request.error || new Error("Fallo una operacion de IndexedDB"));
      };
    });
  }
  function waitForIdbTransaction(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => {
        reject(transaction.error || new Error("Fallo una transaccion de IndexedDB"));
      };
      transaction.onabort = () => {
        reject(transaction.error || new Error("Se aborto una transaccion de IndexedDB"));
      };
    });
  }
  async function readAllFromStore(storeName) {
    const db = await openThreadCacheDb();
    const transaction = db.transaction(storeName, "readonly");
    const records = await waitForIdbRequest(transaction.objectStore(storeName).getAll());
    await waitForIdbTransaction(transaction);
    return Array.isArray(records) ? records : [];
  }
  async function deleteFromStore(storeName, ids) {
    if (!ids.length) {
      return;
    }
    const db = await openThreadCacheDb();
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    ids.forEach((id) => store.delete(id));
    await waitForIdbTransaction(transaction);
  }
  async function upsertInStore(storeName, records) {
    if (records.length === 0) {
      return;
    }
    const db = await openThreadCacheDb();
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    for (const record of records) {
      store.put(record);
    }
    await waitForIdbTransaction(transaction);
  }

  // src/services/threadCache/validation.ts
  var LEGACY_THREAD_CACHE_RECORD_VERSION = 2;
  function isCachedPostRecord(value) {
    if (!value || typeof value !== "object") {
      return false;
    }
    const post = value;
    return typeof post.id === "string" && typeof post.html === "string" && typeof post.author === "string" && typeof post.postNumber === "string" && Number.isFinite(post.pageNumber) && Number.isFinite(post.pageIndex) && Number.isFinite(post.originalIndex) && Array.isArray(post.quotedPostIds);
  }
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
      replyCount: 0
    };
  }
  function estimateThreadCacheByteSize(value) {
    try {
      return getStringByteSize(JSON.stringify(value));
    } catch (error) {
      console.warn("Forocoches Premium: no se pudo medir la cache", error);
      return 0;
    }
  }
  function getStringByteSize(value) {
    const text = String(value || "");
    if (typeof TextEncoder !== "undefined") {
      return new TextEncoder().encode(text).byteLength;
    }
    return text.length * 2;
  }
  function normalizeThreadCacheRecord(value) {
    if (!value || typeof value !== "object") {
      return null;
    }
    const record = value;
    const isSupportedVersion = record.version === THREAD_CACHE_RECORD_VERSION || record.version === LEGACY_THREAD_CACHE_RECORD_VERSION;
    if (!isSupportedVersion || typeof record.threadId !== "string" || !Number.isFinite(record.totalPages) || !Array.isArray(record.cachedPageNumbers) || !Array.isArray(record.posts)) {
      return null;
    }
    const posts = record.posts.filter(isCachedPostRecord).map(normalizeCachedPostRecord);
    if (posts.length === 0) {
      return null;
    }
    return {
      version: THREAD_CACHE_RECORD_VERSION,
      threadId: record.threadId,
      totalPages: Number(record.totalPages),
      lastSeenPageNumber: Number.isFinite(record.lastSeenPageNumber) ? Number(record.lastSeenPageNumber) : Number(record.totalPages),
      cachedPageNumbers: record.cachedPageNumbers.map(Number).filter((pageNumber) => Number.isFinite(pageNumber) && pageNumber > 0),
      savedAt: Number(record.savedAt) || 0,
      byteSize: Number(record.byteSize) || estimateThreadCacheByteSize(record),
      posts
    };
  }
  function getRawThreadCacheRecordId(value) {
    if (!value || typeof value !== "object") {
      return null;
    }
    const threadId = value.threadId;
    return typeof threadId === "string" ? threadId : null;
  }
  function normalizeForumThreadRecord(value) {
    if (!value || typeof value !== "object") {
      return null;
    }
    const record = value;
    if (record.version !== FORUM_THREAD_CACHE_RECORD_VERSION || typeof record.id !== "string" || typeof record.forumId !== "string" || typeof record.url !== "string" || typeof record.title !== "string" || typeof record.html !== "string" || !Array.isArray(record.tags)) {
      return null;
    }
    const title = normalizeText(record.title);
    return {
      version: record.version,
      id: record.id,
      forumId: record.forumId,
      url: record.url,
      title,
      tags: getTagsFromText(title),
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
      hiddenAt: Number(record.hiddenAt) || 0
    };
  }
  function isThreadCacheExpired(cache2) {
    return Date.now() - cache2.savedAt > THREAD_CACHE_MAX_AGE_MS;
  }

  // src/services/threadCache/threadCache.ts
  async function deleteThreadCacheRecord(threadId) {
    if (!canUseThreadCache()) {
      return;
    }
    const db = await openThreadCacheDb();
    const transaction = db.transaction(THREAD_CACHE_STORE_NAME, "readwrite");
    transaction.objectStore(THREAD_CACHE_STORE_NAME).delete(threadId);
    await waitForIdbTransaction(transaction);
  }
  async function getAllThreadCacheRecords() {
    return readAllFromStore(THREAD_CACHE_STORE_NAME);
  }
  async function deleteThreadCacheRecords(threadIds) {
    if (!threadIds.length) {
      return;
    }
    await deleteFromStore(THREAD_CACHE_STORE_NAME, threadIds);
  }
  function clearLegacyThreadCaches() {
    try {
      for (let index = localStorage.length - 1;index >= 0; index -= 1) {
        const key = localStorage.key(index);
        if (key?.startsWith(THREAD_CACHE_LEGACY_STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn("Forocoches Premium: no se pudo limpiar la cache antigua", error);
    }
  }
  async function cleanupThreadCache() {
    if (!canUseThreadCache()) {
      return;
    }
    clearLegacyThreadCaches();
    try {
      const rawRecords = await getAllThreadCacheRecords();
      const records = [];
      const threadIdsToDelete = new Set;
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
      let totalBytes = records.reduce((total, record) => total + (record.byteSize || estimateThreadCacheByteSize(record)), 0);
      records.slice().sort((left, right) => left.savedAt - right.savedAt).forEach((record) => {
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
  async function readCurrentThreadCache() {
    const threadId = getThreadId(new URL(location.href));
    if (!threadId || !canUseThreadCache()) {
      return null;
    }
    try {
      const db = await openThreadCacheDb();
      const transaction = db.transaction(THREAD_CACHE_STORE_NAME, "readonly");
      const rawRecord = await waitForIdbRequest(transaction.objectStore(THREAD_CACHE_STORE_NAME).get(threadId));
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
  function isCompleteThreadCache(cache2) {
    const cachedPages = new Set(cache2.cachedPageNumbers);
    return cache2.totalPages > 0 && cachedPages.size >= cache2.totalPages && cache2.posts.length > 0;
  }
  async function writeCurrentThreadCache(posts, totalPages, cachedPageNumbers, lastSeenPageNumber = totalPages) {
    const threadId = getThreadId(new URL(location.href));
    if (!threadId || !canUseThreadCache() || posts.length === 0 || cachedPageNumbers.size === 0) {
      return;
    }
    const record = {
      version: THREAD_CACHE_RECORD_VERSION,
      threadId,
      totalPages,
      lastSeenPageNumber,
      cachedPageNumbers: Array.from(cachedPageNumbers).sort((left, right) => left - right),
      savedAt: Date.now(),
      byteSize: 0,
      posts: posts.map(normalizeCachedPostRecord)
    };
    record.byteSize = estimateThreadCacheByteSize(record);
    if (record.byteSize > THREAD_CACHE_MAX_BYTES) {
      console.warn("Forocoches Premium: este hilo supera el limite de cache configurado");
      return;
    }
    try {
      await cleanupThreadCache();
      await upsertInStore(THREAD_CACHE_STORE_NAME, [record]);
    } catch (error) {
      console.warn("Forocoches Premium: no se pudo guardar la cache", error);
    }
  }
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
  // src/services/threadCache/forumCache.ts
  async function readForumThreadCacheRecords() {
    if (!canUseThreadCache()) {
      return [];
    }
    try {
      const rawRecords = await readAllFromStore(FORUM_THREAD_CACHE_STORE_NAME);
      return Array.isArray(rawRecords) ? rawRecords.map(normalizeForumThreadRecord).filter((record) => record !== null) : [];
    } catch (error) {
      console.warn("Forocoches Premium: no se pudo leer la cache del foro", error);
      return [];
    }
  }
  async function writeForumThreadCacheRecords(records) {
    if (!canUseThreadCache() || records.length === 0) {
      return;
    }
    try {
      await upsertInStore(FORUM_THREAD_CACHE_STORE_NAME, records);
    } catch (error) {
      console.warn("Forocoches Premium: no se pudo guardar la cache del foro", error);
    }
  }
  async function deleteForumThreadCacheRecords(threadIds) {
    if (!canUseThreadCache() || threadIds.length === 0) {
      return;
    }
    await deleteFromStore(FORUM_THREAD_CACHE_STORE_NAME, threadIds);
  }
  async function cleanupForumThreadCache() {
    if (!canUseThreadCache()) {
      return;
    }
    try {
      const records = await readForumThreadCacheRecords();
      if (records.length <= FORUM_THREAD_CACHE_MAX_RECORDS) {
        return;
      }
      const idsToDelete = records.slice().sort((left, right) => {
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
      }).slice(0, records.length - FORUM_THREAD_CACHE_MAX_RECORDS).map((record) => record.id);
      await deleteForumThreadCacheRecords(idsToDelete);
    } catch (error) {
      console.warn("Forocoches Premium: no se pudo limpiar la cache del foro", error);
    }
  }
  // src/adapters/forocoches/threadParser.ts
  var FETCH_THREAD_DOCUMENT_TIMEOUT_MS = 1e4;
  function getMaxThreadPage(doc) {
    const currentUrl = new URL(location.href);
    const currentThreadId = getThreadId(currentUrl) || getThreadIdFromDocument(doc);
    const lastPageFromLink = getLastThreadPageFromLink(doc, currentThreadId);
    if (lastPageFromLink) {
      return lastPageFromLink;
    }
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
  function getLastThreadPageFromLink(doc, currentThreadId) {
    let lastPage = null;
    for (const link of doc.querySelectorAll("a[href*='showthread.php']")) {
      if (!(link instanceof HTMLAnchorElement)) {
        continue;
      }
      const label = normalizeLayoutText(`${link.textContent || ""} ${link.title || ""}`);
      if (!label.includes("ultimo") && !label.includes("ultima") && !label.includes("last")) {
        continue;
      }
      const url = toUrl(link.getAttribute("href") || link.href);
      if (!url || getThreadId(url) !== currentThreadId) {
        continue;
      }
      lastPage = Math.max(lastPage || 1, getPageNumber(url));
    }
    return lastPage;
  }
  function getThreadIdFromDocument(doc = document) {
    for (const link of doc.querySelectorAll("a[href*='showthread.php?t=']")) {
      if (!(link instanceof HTMLAnchorElement)) {
        continue;
      }
      const url = toUrl(link.getAttribute("href") || link.href);
      const threadId = url ? getThreadId(url) : null;
      if (threadId) {
        return threadId;
      }
    }
    return null;
  }
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
    return hashMatch?.[1] || null;
  }
  function getQuotedPostIds(doc, postId) {
    const message = doc.getElementById(`post_message_${postId}`);
    if (!message) {
      return [];
    }
    const quotedIds = new Set;
    for (const link of message.querySelectorAll("a[href*='showthread.php?p='][href*='#post']")) {
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
  function collectPosts(doc, pageNumber, pageOffset) {
    const posts = [];
    const seenWrappers = new Set;
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
      const author = normalizeText(doc.querySelector(`#postmenu_${id} .bigusername`)?.textContent || doc.querySelector(`#postmenu_${id}`)?.textContent);
      const postNumber = normalizeText(doc.querySelector(`#postcount${id}`)?.textContent) || String(pageOffset + posts.length + 1);
      const postNumberValue = Number(postNumber);
      posts.push({
        id,
        html: wrapper.outerHTML,
        author,
        postNumber,
        pageNumber,
        pageIndex: posts.length,
        originalIndex: Number.isFinite(postNumberValue) && postNumberValue > 0 ? postNumberValue - 1 : pageOffset + posts.length,
        quotedPostIds: getQuotedPostIds(doc, id),
        replyingPostIds: [],
        isOriginalPoster: false,
        replyCount: 0
      });
    }
    return posts;
  }
  function parseHtml(html) {
    return new DOMParser().parseFromString(html, "text/html");
  }
  async function fetchThreadDocument(url) {
    const controller = new AbortController;
    const timeoutId = window.setTimeout(() => controller.abort(), FETCH_THREAD_DOCUMENT_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        cache: "no-cache",
        credentials: "same-origin",
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(`Could not load ${url}: ${response.status}`);
      }
      return parseHtml(await response.text());
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  // src/app/core/cacheOperation.ts
  async function runCacheOperation(operation, fallback, label, timeoutMs = 3000) {
    let timeoutId = 0;
    try {
      return await Promise.race([
        operation,
        new Promise((resolve) => {
          timeoutId = window.setTimeout(() => resolve(fallback), timeoutMs);
        })
      ]);
    } catch (error) {
      console.warn(`Forocoches Premium: fallo en cache (${label})`, error);
      return fallback;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  // src/app/core/forumThreadCacheController.ts
  function createForumThreadCacheController(options) {
    let forumThreadScrapeStarted = false;
    let cachedForumThreads = [];
    function getCachedForumThreadsForCurrentForum() {
      const forumId = getForumId();
      return cachedForumThreads.filter((record) => record.forumId === forumId);
    }
    function getVisibleCachedForumThreadsForCurrentForum() {
      return getVisibleForumThreadRecords(getCachedForumThreadsForCurrentForum());
    }
    function getHiddenForumThreadRecordsForCurrentForum() {
      return getHiddenForumThreadRecords(getCachedForumThreadsForCurrentForum());
    }
    function getForumThreadRecordsForTag(tag) {
      return filterForumThreadRecords(getCachedForumThreadsForCurrentForum(), {
        tag,
        searchQuery: options.getActiveForumSearchQuery()
      });
    }
    function getCachedForumThreadIdsForCurrentForum() {
      return new Set(getCachedForumThreadsForCurrentForum().map((record) => record.id));
    }
    function wereAllForumThreadRecordsAlreadyCached(records, cachedThreadIds) {
      return records.length > 0 && records.every((record) => cachedThreadIds.has(record.id));
    }
    function mergeCachedForumThreadRecords(records) {
      if (records.length === 0) {
        return;
      }
      const byId = new Map(cachedForumThreads.map((record) => [record.id, record]));
      for (const record of records) {
        const previous = byId.get(record.id);
        byId.set(record.id, {
          ...record,
          isHidden: Boolean(previous?.isHidden || record.isHidden),
          hiddenAt: previous?.hiddenAt || record.hiddenAt || 0
        });
      }
      cachedForumThreads = Array.from(byId.values());
    }
    function collectCurrentForumThreadRecords() {
      const forumId = getForumId();
      if (!forumId) {
        return [];
      }
      return collectForumThreadRecords(document, location.href, forumId, getPageNumber(new URL(location.href)), options.getForumThreadsPerPage(), Date.now());
    }
    function getCurrentForumThreadRecord(threadId) {
      return collectCurrentForumThreadRecords().find((record) => record.id === threadId) || null;
    }
    async function cacheCurrentForumThreadRows() {
      const records = collectCurrentForumThreadRecords();
      if (records.length === 0) {
        return;
      }
      mergeCachedForumThreadRecords(records);
      await runCacheOperation(writeForumThreadCacheRecords(records.map((record) => cachedForumThreads.find((cachedRecord) => cachedRecord.id === record.id)).filter((record) => record !== undefined)), undefined, "guardar pagina actual");
    }
    async function setForumThreadHiddenState(threadId, hidden) {
      if (!threadId) {
        return false;
      }
      const now = Date.now();
      let existing = cachedForumThreads.find((record2) => record2.id === threadId) || getCurrentForumThreadRecord(threadId);
      if (hidden && getCachedForumThreadsForCurrentForum().length === 0) {
        await cacheCurrentForumThreadRows();
        existing = cachedForumThreads.find((record2) => record2.id === threadId) || existing;
      }
      if (!existing) {
        return false;
      }
      const record = {
        ...existing,
        isHidden: hidden,
        hiddenAt: hidden ? now : 0,
        updatedAt: now
      };
      cachedForumThreads = cachedForumThreads.filter((cachedRecord) => cachedRecord.id !== threadId).concat(record);
      await runCacheOperation(writeForumThreadCacheRecords([record]), undefined, "guardar hilo oculto");
      options.refreshForumTagUi();
      if (options.isHiddenThreadsModalOpen()) {
        options.renderHiddenThreadsModalBody();
      }
      return true;
    }
    async function hideSelectedForumThread() {
      const selected = options.getSelectedNavigationItem();
      const link = selected?.link;
      const threadId = link ? getThreadId(new URL(link.href)) : null;
      if (!threadId) {
        return false;
      }
      const previousIndex = Math.max(options.getNavigationItems().findIndex((item) => item === selected), 0);
      const hidden = await setForumThreadHiddenState(threadId, true);
      if (hidden && options.getNavigationLength() > 0) {
        options.selectNavigationIndex(Math.min(previousIndex, options.getNavigationLength() - 1));
      }
      return hidden;
    }
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
    function replaceForumPagersFromDocument(doc) {
      const currentPagers = Array.from(document.querySelectorAll(".pagenav"));
      const nextPagers = Array.from(doc.querySelectorAll(".pagenav"));
      currentPagers.forEach((pager, index) => {
        const nextPager = nextPagers[index];
        if (pager instanceof HTMLElement && nextPager instanceof HTMLElement) {
          pager.innerHTML = nextPager.innerHTML;
        }
      });
    }
    async function loadForumDisplayPageWithJavascript(url) {
      const forumId = getForumId(url);
      if (!forumId) {
        location.href = url.href;
        return;
      }
      options.setForumThreadLoadState({ isLoading: true });
      try {
        const pageNumber = getPageNumber(url);
        const doc = pageNumber === getPageNumber(new URL(location.href)) && url.pathname === location.pathname ? parseHtml(document.documentElement.outerHTML) : await fetchThreadDocument(url.href);
        const records = collectForumThreadRecords(doc, url.href, forumId, pageNumber, options.getForumThreadsPerPage(), Date.now());
        if (records.length === 0) {
          location.href = url.href;
          return;
        }
        replaceForumPagersFromDocument(doc);
        options.setActiveTagFilter(null);
        options.setActiveForumSearchQuery("");
        options.setActiveForumTagPage(pageNumber);
        options.setNativeForumThreadRows(records.map((record) => record.html), records.length, `native-page-${pageNumber}`);
        options.applyHiddenForumThreadRows();
        options.updateBrowserHistory(url, "push");
        mergeCachedForumThreadRecords(records);
        await runCacheOperation(writeForumThreadCacheRecords(records.map((record) => cachedForumThreads.find((cachedRecord) => cachedRecord.id === record.id)).filter((record) => record !== undefined)), undefined, "guardar pagina navegada");
        options.renderTopTagBar();
        options.refreshNavigation({ reset: true });
        window.scrollTo({ top: 0, behavior: "auto" });
      } catch (error) {
        console.warn("Forocoches Premium: no se pudo cargar la pagina del foro con JavaScript", error);
        location.href = url.href;
      } finally {
        options.setForumThreadLoadState({ isLoading: false });
      }
    }
    async function scrapeForumThreadPage(pageNumber, scrapeStartedAt) {
      const forumId = getForumId();
      if (!forumId) {
        return [];
      }
      const url = getForumRecentPageUrl(pageNumber);
      const doc = pageNumber === 1 && getPageNumber(new URL(location.href)) === 1 ? document : await fetchThreadDocument(url.href);
      return collectForumThreadRecords(doc, url.href, forumId, pageNumber, options.getForumThreadsPerPage(), scrapeStartedAt);
    }
    async function saveScrapedForumThreadRecords(records) {
      mergeCachedForumThreadRecords(records);
      await runCacheOperation(writeForumThreadCacheRecords(records.map((record) => cachedForumThreads.find((cachedRecord) => cachedRecord.id === record.id)).filter((record) => record !== undefined)), undefined, "guardar scrape");
      options.refreshForumTagUi();
    }
    async function scrapeRecentForumThreadPages(startPage, scrapeStartedAt, cachedThreadIdsBeforeScrape) {
      if (forumThreadScrapeStarted) {
        return;
      }
      forumThreadScrapeStarted = true;
      options.setForumThreadLoadState({ isLoading: true });
      let lastScrapedPage = Math.max(startPage - 1, 0);
      for (let pageNumber = startPage;pageNumber <= FORUM_THREAD_CACHE_RECENT_PAGES; pageNumber += 1) {
        try {
          const records = await scrapeForumThreadPage(pageNumber, scrapeStartedAt);
          const pageWasAlreadyCached = wereAllForumThreadRecordsAlreadyCached(records, cachedThreadIdsBeforeScrape);
          lastScrapedPage = pageNumber;
          options.setForumThreadLoadState({
            loadedPages: Math.max(options.getForumThreadLoadState().loadedPages, pageNumber)
          });
          await saveScrapedForumThreadRecords(records);
          if (pageWasAlreadyCached) {
            break;
          }
        } catch (error) {
          console.warn(`Forocoches Premium: no se pudo cachear la pagina ${pageNumber} del foro`, error);
        } finally {
          options.setForumThreadLoadState({
            loadedPages: Math.max(options.getForumThreadLoadState().loadedPages, pageNumber)
          });
        }
        if (pageNumber < FORUM_THREAD_CACHE_RECENT_PAGES) {
          await sleep(PAGE_LOAD_DELAY_MS);
        }
      }
      try {
        await runCacheOperation(cleanupForumThreadCache(), undefined, "limpiar cache");
        cachedForumThreads = await runCacheOperation(readForumThreadCacheRecords(), cachedForumThreads, "leer cache final");
      } finally {
        const loadedPages = Math.max(options.getForumThreadLoadState().loadedPages, lastScrapedPage);
        options.setForumThreadLoadState({
          loadedPages,
          isLoading: false
        });
        options.refreshForumTagUi();
      }
    }
    async function initializeForumThreadCache() {
      cachedForumThreads = await runCacheOperation(readForumThreadCacheRecords(), [], "leer cache inicial");
      options.setForumThreadLoadState({
        loadedPages: 0,
        targetPages: FORUM_THREAD_CACHE_RECENT_PAGES,
        isLoading: false
      });
      const scrapeStartedAt = Date.now();
      const cachedThreadIdsBeforeScrape = getCachedForumThreadIdsForCurrentForum();
      let firstPageWasAlreadyCached = false;
      try {
        const firstPageRecords = await scrapeForumThreadPage(1, scrapeStartedAt);
        firstPageWasAlreadyCached = wereAllForumThreadRecordsAlreadyCached(firstPageRecords, cachedThreadIdsBeforeScrape);
        await saveScrapedForumThreadRecords(firstPageRecords);
      } catch (error) {
        console.warn("Forocoches Premium: no se pudo cachear la primera pagina del foro", error);
        options.refreshForumTagUi();
      } finally {
        options.setForumThreadLoadState({
          loadedPages: Math.max(options.getForumThreadLoadState().loadedPages, 1)
        });
      }
      if (firstPageWasAlreadyCached) {
        options.setForumThreadLoadState({ isLoading: false });
        return;
      }
      scrapeRecentForumThreadPages(2, scrapeStartedAt, cachedThreadIdsBeforeScrape);
    }
    return {
      getCachedForumThreadsForCurrentForum,
      getVisibleCachedForumThreadsForCurrentForum,
      getHiddenForumThreadRecordsForCurrentForum,
      getForumThreadRecordsForTag,
      loadForumDisplayPageWithJavascript,
      initializeForumThreadCache,
      setForumThreadHiddenState,
      hideSelectedForumThread
    };
  }

  // src/domain/pagination.ts
  function getVisiblePageNumbers(totalPages, currentPage) {
    if (totalPages <= 11) {
      return Array.from({ length: totalPages }, (_value, index) => index + 1);
    }
    const page = currentPage || 1;
    const maxVisible = 11;
    const halfWindow = Math.floor(maxVisible / 2);
    const start = Math.max(1, Math.min(page - halfWindow, totalPages - maxVisible + 1));
    return Array.from({ length: maxVisible }, (_value, index) => start + index);
  }

  // src/ui/components/ForumPager.tsx
  function ForumPager(props) {
    return renderElement(/* @__PURE__ */ u2("table", {
      className: "tborder",
      cellPadding: "3",
      cellSpacing: "1",
      ...{ border: "0" },
      children: /* @__PURE__ */ u2("tbody", {
        children: /* @__PURE__ */ u2("tr", {
          children: [
            /* @__PURE__ */ u2("td", {
              className: "vbmenu_control",
              style: "font-weight: normal",
              children: [
                "Pág ",
                props.currentPage,
                " de ",
                props.totalPages
              ]
            }, undefined, true, undefined, this),
            props.visiblePages.map((pageNumber) => pageNumber === props.currentPage ? /* @__PURE__ */ u2("td", {
              className: "alt2",
              children: /* @__PURE__ */ u2("span", {
                className: "mfont",
                title: "Mostrando resultados filtrados",
                children: /* @__PURE__ */ u2("strong", {
                  children: pageNumber
                }, undefined, false, undefined, this)
              }, undefined, false, undefined, this)
            }, undefined, false, undefined, this) : /* @__PURE__ */ u2(ForumPagerLinkCell, {
              pageNumber,
              label: String(pageNumber),
              href: props.hrefForPage(pageNumber),
              onPageClick: props.onPageClick
            }, undefined, false, undefined, this)),
            props.currentPage < props.totalPages ? /* @__PURE__ */ u2(ForumPagerLinkCell, {
              pageNumber: props.currentPage + 1,
              label: ">",
              href: props.hrefForPage(props.currentPage + 1),
              onPageClick: props.onPageClick
            }, undefined, false, undefined, this) : null,
            props.currentPage < props.totalPages ? /* @__PURE__ */ u2(ForumPagerLinkCell, {
              pageNumber: props.totalPages,
              label: "Último »",
              href: props.hrefForPage(props.totalPages),
              onPageClick: props.onPageClick
            }, undefined, false, undefined, this) : null
          ]
        }, undefined, true, undefined, this)
      }, undefined, false, undefined, this)
    }, undefined, false, undefined, this));
  }
  function ForumPagerLinkCell(props) {
    return /* @__PURE__ */ u2("td", {
      className: "alt1",
      children: /* @__PURE__ */ u2("a", {
        className: "mfont",
        href: props.href,
        onClick: (event) => {
          event.preventDefault();
          props.onPageClick(props.pageNumber);
        },
        children: props.label
      }, undefined, false, undefined, this)
    }, undefined, false, undefined, this);
  }

  // src/app/core/forumThreadListRenderer.ts
  function createForumThreadListRenderer(options) {
    let renderedForumThreadListSignature = null;
    let forumThreadsPerPage = FORUM_THREAD_FALLBACK_PAGE_SIZE;
    let nativeForumThreadRowHtml = [];
    let nativeForumThreadHeaderRowHtml = [];
    let nativeForumPagerHtml = [];
    function captureNativeForumThreadRows() {
      if (nativeForumThreadRowHtml.length > 0) {
        return;
      }
      const table = getForumThreadsTable();
      if (!table) {
        return;
      }
      const rows = Array.from(table.rows);
      const firstThreadIndex = rows.findIndex((row) => row.querySelector(THREAD_TITLE_SELECTOR));
      const threadRows = firstThreadIndex >= 0 ? rows.slice(firstThreadIndex) : rows;
      nativeForumThreadHeaderRowHtml = firstThreadIndex > 0 ? rows.slice(0, firstThreadIndex).map((row) => row.outerHTML) : [];
      nativeForumThreadRowHtml = threadRows.map((row) => row.outerHTML);
      forumThreadsPerPage = threadRows.filter((row) => row.querySelector(THREAD_TITLE_SELECTOR)).length || FORUM_THREAD_FALLBACK_PAGE_SIZE;
      renderedForumThreadListSignature = getForumThreadRowsSignature(nativeForumThreadRowHtml, "native");
      captureNativeForumPagers();
    }
    function captureNativeForumPagers() {
      if (nativeForumPagerHtml.length > 0) {
        return;
      }
      nativeForumPagerHtml = Array.from(document.querySelectorAll(".pagenav")).filter((pager) => pager instanceof HTMLElement).map((pager) => pager.innerHTML);
    }
    function replaceNativeForumPagers() {
      nativeForumPagerHtml = Array.from(document.querySelectorAll(".pagenav")).filter((pager) => pager instanceof HTMLElement).map((pager) => pager.innerHTML);
    }
    function restoreNativeForumPagers() {
      for (const [index, pager] of Array.from(document.querySelectorAll(".pagenav")).entries()) {
        if (!(pager instanceof HTMLElement) || !nativeForumPagerHtml[index]) {
          continue;
        }
        const container = pager.closest("table[width='100%']") || pager;
        if (container instanceof HTMLElement) {
          setForumLayoutElementHidden(container, false);
        }
        pager.innerHTML = nativeForumPagerHtml[index];
      }
    }
    function getForumThreadsPerPage() {
      return forumThreadsPerPage || FORUM_THREAD_FALLBACK_PAGE_SIZE;
    }
    function getForumDynamicPageUrl(pageNumber) {
      return options.getForumDynamicPageUrl(pageNumber);
    }
    function renderNativeForumPagers(total) {
      const pageSize = getForumThreadsPerPage();
      const totalPages = getForumThreadListTotalPages(total, pageSize);
      const currentPage = clampForumThreadListPage(options.getActiveForumTagPage(), totalPages);
      options.setActiveForumTagPage(currentPage);
      for (const pager of document.querySelectorAll(".pagenav")) {
        if (!(pager instanceof HTMLElement)) {
          continue;
        }
        const container = pager.closest("table[width='100%']") || pager;
        if (container instanceof HTMLElement) {
          setForumLayoutElementHidden(container, false);
        }
        pager.textContent = "";
        pager.append(ForumPager({
          currentPage,
          totalPages,
          visiblePages: getVisiblePageNumbers(totalPages, currentPage),
          hrefForPage: (pageNumber) => getForumDynamicPageUrl(pageNumber).href,
          onPageClick: options.setForumTagPage
        }));
      }
    }
    function renderForumThreadRows(rowHtmlList, signature) {
      const changed = renderForumThreadRowsFromHtml({
        headerRowHtml: nativeForumThreadHeaderRowHtml,
        rowHtmlList,
        signature,
        currentSignature: renderedForumThreadListSignature,
        renderTaggedTitle: options.renderTaggedTitle
      });
      if (!changed) {
        return false;
      }
      renderedForumThreadListSignature = signature;
      return true;
    }
    function setNativeForumThreadRows(rowHtmlList, pageSize, signatureKey) {
      nativeForumThreadRowHtml = rowHtmlList;
      forumThreadsPerPage = pageSize || FORUM_THREAD_FALLBACK_PAGE_SIZE;
      renderedForumThreadListSignature = null;
      replaceNativeForumPagers();
      return renderForumThreadRows(nativeForumThreadRowHtml, getForumThreadRowsSignature(nativeForumThreadRowHtml, signatureKey));
    }
    function restoreNativeForumThreadRows() {
      const nativeSignature = getForumThreadRowsSignature(nativeForumThreadRowHtml, "native");
      const changed = restoreForumThreadRowsFromHtml({
        headerRowHtml: nativeForumThreadHeaderRowHtml,
        nativeRowHtml: nativeForumThreadRowHtml,
        nativeSignature,
        currentSignature: renderedForumThreadListSignature,
        renderTaggedTitle: options.renderTaggedTitle
      });
      if (changed) {
        renderedForumThreadListSignature = nativeSignature;
      }
      restoreNativeForumPagers();
      options.renderVisibleForumThreadTitleTags();
      return changed;
    }
    function applyHiddenForumThreadRows2() {
      const hiddenThreadIds = new Set(options.getHiddenForumThreadRecordsForCurrentForum().map((record) => record.id));
      applyHiddenForumThreadRows(hiddenThreadIds);
    }
    function renderForumThreadList() {
      if (!isForumDisplayPage()) {
        return false;
      }
      captureNativeForumThreadRows();
      const activeTagFilter = options.getActiveTagFilter();
      const activeForumSearchQuery = options.getActiveForumSearchQuery();
      const cachedForumRecords = options.getCachedForumThreadsForCurrentForum();
      const records = options.getForumThreadRecordsForTag(activeTagFilter);
      if (!activeTagFilter && !activeForumSearchQuery) {
        const changed2 = restoreNativeForumThreadRows();
        applyHiddenForumThreadRows2();
        return changed2;
      }
      if (cachedForumRecords.length === 0) {
        const changed2 = restoreNativeForumThreadRows();
        applyHiddenForumThreadRows2();
        return changed2;
      }
      const page = getForumThreadListPage(records, options.getActiveForumTagPage(), getForumThreadsPerPage());
      options.setActiveForumTagPage(page.currentPage);
      const signature = getForumThreadRowsSignature(page.rowHtmlList, [
        "dynamic",
        activeTagFilter || "",
        activeForumSearchQuery,
        page.currentPage,
        page.pageSize
      ].join(":"));
      const changed = renderForumThreadRows(page.rowHtmlList, signature);
      renderNativeForumPagers(records.length);
      return changed;
    }
    return {
      captureNativeForumThreadRows,
      getForumThreadsPerPage,
      setNativeForumThreadRows,
      applyHiddenForumThreadRows: applyHiddenForumThreadRows2,
      renderForumThreadList
    };
  }

  // src/app/core/forumPageController.ts
  function createForumPageController() {
    const initialForumQueryState = readForumQueryState();
    let activeTagFilter = initialForumQueryState.tag;
    let activeForumTagPage = initialForumQueryState.page;
    let activeForumSearchQuery = "";
    let forumLiveSearchTimer = 0;
    let forumThreadLoadState = {
      loadedPages: 0,
      targetPages: FORUM_THREAD_CACHE_RECENT_PAGES,
      isLoading: false
    };
    function getPostsElement() {
      const posts = document.querySelector(POSTS_SELECTOR);
      return posts instanceof HTMLElement ? posts : null;
    }
    function updateBrowserHistory(url, historyMode) {
      if (historyMode === "push" && url.href !== location.href) {
        window.history.pushState(window.history.state, "", url.href);
        return;
      }
      window.history.replaceState(window.history.state, "", url.href);
    }
    function collectNavigationItems() {
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
      getPostsElement
    });
    function renderNavigationStatus() {
      document.getElementById(NAVIGATION_STATUS_ID)?.remove();
    }
    function updateSelectedPostUrl(selected) {
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
    function isOpenSelectedThreadInNewTabShortcut(event) {
      if (!isForumDisplayPage()) {
        return false;
      }
      return isOpenInNewTabKeyboardShortcut(event, KEY_OPEN_SELECTED_THREAD_IN_NEW_TAB);
    }
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
    function openSelectedNavigationItem() {
      const selected = getSelectedNavigationItem();
      if (!selected?.link) {
        return;
      }
      selected.link.click();
    }
    function navigateForumPage(direction) {
      if (!isForumDisplayPage()) {
        return false;
      }
      const currentPage = activeTagFilter || activeForumSearchQuery ? activeForumTagPage : getPageNumber(new URL(location.href));
      const targetPage = currentPage + direction;
      if (targetPage < 1) {
        return false;
      }
      if (activeTagFilter || activeForumSearchQuery) {
        const totalPages = getForumThreadListTotalPages(getForumThreadRecordsForTag(activeTagFilter).length, getForumThreadsPerPage());
        const clampedPage = clampForumThreadListPage(targetPage, totalPages);
        if (clampedPage === currentPage) {
          return false;
        }
        setForumTagPage(clampedPage);
        return true;
      }
      const targetUrl = Array.from(document.querySelectorAll(".pagenav a[href*='forumdisplay.php']")).filter((link) => link instanceof HTMLAnchorElement).map((link) => toUrl(link.getAttribute("href") || link.href)).find((url) => url && url.pathname === location.pathname && getForumId(url) === getForumId() && getPageNumber(url) === targetPage);
      if (!targetUrl) {
        return false;
      }
      loadForumDisplayPageWithJavascript(targetUrl);
      return true;
    }
    function renderShortcutHelpButton2() {
      renderShortcutHelpButton({ items: getShortcutHelpItems(), formatKey: formatShortcutHelpKey });
    }
    function installForumKeyboardNavigation() {
      window.addEventListener("keydown", forumPageKeyboard.handleNavigationKeyDown, true);
    }
    function ensureStyle() {
      const existing = document.getElementById(STYLE_ID);
      const style = existing instanceof HTMLStyleElement ? existing : document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `#fc-premium-thread-summary {
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

#fc-premium-thread-summary[hidden] {
  display: none !important;
}

#fc-premium-thread-summary.fc-premium-summary-stuck {
  box-shadow: 0 4px 12px rgba(23, 50, 77, 0.16);
}

#fc-premium-thread-summary strong {
  color: #0b57d0;
}

#fc-premium-thread-progress {
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

#fc-premium-shortcut-help-container {
  box-sizing: border-box;
  display: flex;
  justify-content: flex-end;
  margin: 4px 8px 0;
  min-height: 23px;
  position: relative;
  z-index: 50;
}

#fc-premium-shortcut-help-button {
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

#fc-premium-shortcut-help-button:hover,
#fc-premium-shortcut-help-button:focus-visible,
#fc-premium-shortcut-help-button[aria-expanded="true"] {
  background: #f7faff;
  border-color: #5f8fc7;
  color: #17324d;
  opacity: 0.95;
  outline: none;
}

#fc-premium-shortcut-help-popover {
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

#fc-premium-shortcut-help-popover[hidden] {
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

#fc-premium-thread-controls {
  display: flex;
  flex: 0 0 auto;
  gap: 5px;
  margin-left: auto;
}

#fc-premium-thread-controls button {
  background: #fff;
  border: 1px solid #b7d1ff;
  border-radius: 4px;
  color: #17324d;
  cursor: pointer;
  font: 700 10px/1 Verdana, Arial, sans-serif;
  padding: 4px 6px;
}

#fc-premium-thread-controls button:disabled {
  color: #80868b;
  cursor: default;
  opacity: 0.72;
}

#fc-premium-thread-controls.fc-premium-thread-toolbar-controls {
  display: table-cell;
  margin-left: 0;
  white-space: nowrap;
}

#fc-premium-thread-controls.fc-premium-thread-toolbar-controls button {
  background: transparent;
  border: 0;
  border-radius: 0;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  padding: 0 3px;
}

#fc-premium-thread-controls.fc-premium-thread-toolbar-controls button:hover {
  text-decoration: underline;
}

#fc-premium-thread-controls.fc-premium-thread-toolbar-controls button:disabled {
  cursor: default;
  opacity: 0.45;
  text-decoration: none;
}

#fc-premium-thread-controls.fc-premium-thread-toolbar-controls #fc-premium-thread-progress {
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
  flex: 1;
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

.fc-premium-thread-header-message-search {
  flex: 1;
}

.fc-premium-thread-header-message-search #fc-premium-thread-search-panel {
  margin: 0;
  width: 100%;
}

.fc-premium-thread-header-message-search #fc-premium-thread-search-panel td {
  padding: 2px 4px;
}

.fc-premium-thread-header-message-search .fc-premium-thread-search-layout {
  gap: 3px 5px;
  grid-template-columns: minmax(120px, 1fr) minmax(100px, 0.85fr) auto auto;
}

.fc-premium-thread-header-message-search #fc-premium-thread-search-status {
  grid-column: 1 / -1;
}

.fc-premium-thread-header-message-search #fc-premium-thread-search-selected-authors {
  margin-top: 3px;
}

#fc-premium-thread-search-panel {
  margin: 0 0 8px;
  width: 100%;
}

#fc-premium-thread-search-panel .fc-premium-thread-search-cell {
  padding: 5px 6px;
}

.fc-premium-thread-search-layout {
  align-items: end;
  display: grid;
  gap: 5px 8px;
  grid-template-columns: minmax(180px, 1fr) minmax(170px, 250px) auto auto minmax(115px, auto);
}

.fc-premium-thread-search-field {
  color: #17324d;
  display: grid;
  font: 700 10px/1.25 Verdana, Arial, sans-serif;
  gap: 2px;
  min-width: 0;
}

.fc-premium-thread-search-field input {
  border: 1px solid #7f9db9;
  box-sizing: border-box;
  font: 11px Verdana, Arial, sans-serif;
  height: 20px;
  min-width: 0;
  padding: 2px 4px;
  width: 100%;
}

.fc-premium-thread-search-button {
  background: #e6e9ed;
  border: 1px solid #7f8c99;
  border-left-color: #f8f8f8;
  border-radius: 2px;
  border-top-color: #f8f8f8;
  box-shadow: inset -1px -1px 0 #bcc3ca;
  color: #1f3550;
  cursor: pointer;
  font: 700 10px/1 Verdana, Arial, sans-serif;
  height: 20px;
  padding: 2px 7px 3px;
  white-space: nowrap;
}

.fc-premium-thread-search-button:hover {
  background: #f2f5f8;
  color: #0b57d0;
}

.fc-premium-thread-search-button:disabled {
  color: #80868b;
  cursor: default;
  opacity: 0.65;
}

#fc-premium-thread-search-selected-authors {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 5px;
}

.fc-premium-thread-author-chip {
  align-items: center;
  background: #f7faff;
  border: 1px solid #9db7e5;
  border-radius: 2px;
  color: #17324d;

  display: inline-flex;
  font: 10px/1 Verdana, Arial, sans-serif;
  gap: 3px;
  padding: 2px 4px;
}

.fc-premium-thread-author-chip button {
  background: transparent;
  border: 0;
  color: #0b57d0;
  cursor: pointer;
  font: 700 11px/1 Verdana, Arial, sans-serif;
  padding: 0 1px;
}

#fc-premium-thread-search-status {
  color: #3c4043;
  font: 10px/1.25 Verdana, Arial, sans-serif;
  min-width: 0;
  text-align: right;
  white-space: nowrap;
}

#fc-premium-thread-search-empty {
  background: #fff;
  border: 1px solid #b7d1ff;
  box-sizing: border-box;
  color: #3c4043;
  font: 11px/1.35 Verdana, Arial, sans-serif;
  margin: 0 0 8px;
  padding: 8px 10px;
  text-align: center;
}

#fc-premium-thread-search-empty[hidden] {
  display: none !important;
}

#fc-premium-top-tags {
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

#fc-premium-top-tags > span:first-child {
  font-weight: 700;
}

#fc-premium-top-tags .fc-premium-tag-chip[aria-pressed="true"] {
  box-shadow: 0 0 0 2px #0b57d0;
}

#fc-premium-top-tags button {
  background: #fff;
  border: 1px solid #9db7e5;
  border-radius: 3px;
  color: #17324d;
  cursor: pointer;
  font: 700 11px/1 Verdana, Arial, sans-serif;
  padding: 4px 6px;
}

#fc-premium-top-tags button[aria-current="page"] {
  background: #5f8fc7;
  border-color: #3f70a8;
  color: #fff;
  cursor: default;
}

#fc-premium-forum-controls-row {
  margin-bottom: 3px !important;
}

#fc-premium-forum-controls-row td {
  vertical-align: middle;
}

#fc-premium-forum-controls-row .fc-premium-forum-sidebar-toggle-cell,
#fc-premium-forum-controls-row .fc-premium-forum-new-thread-cell {
  padding-right: 6px;
  white-space: nowrap;
  width: 1%;
}

#fc-premium-forum-controls-row .fc-premium-forum-search-cell {
  text-align: left;
  white-space: nowrap;
  width: 100%;
}

#fc-premium-forum-controls-row .fc-premium-forum-pager-cell {
  text-align: right;
  white-space: nowrap;
  width: 1%;
}

#fc-premium-forum-controls-row .fc-premium-thread-header-search-form .cfield {
  max-width: 24vw;
  width: 190px;
}

#fc-premium-forum-loading-status {
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

#fc-premium-forum-loading-status[data-fc-premium-loading="false"] {
  visibility: hidden;
}

#fc-premium-forum-sidebar-toggle-bar {
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

#fc-premium-forum-sidebar-toggle {
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

#fc-premium-forum-sidebar-toggle:hover {
  background: #f2f5f8;
  color: #0b57d0;
}

html.fc-premium-modal-open,
body.fc-premium-modal-open {
  overflow: hidden !important;
  overscroll-behavior: none;
}

#fc-premium-hidden-threads-modal {
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

#fc-premium-hidden-threads-modal[hidden] {
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

#fc-premium-hidden-threads-modal-body {
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

tr[data-fc-premium-tag-hidden] {
  display: none !important;
}

[data-fc-premium-layout-hidden] {
  display: none !important;
}

.fc-premium-post-wrapper[data-fc-premium-filter-hidden] {
  display: none !important;
}

.fc-premium-post-wrapper[data-fc-premium-page-hidden] {
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

[data-fc-premium-selected] {
  border-radius: 6px;
  outline: 2px solid #1a73e8 !important;
  outline-offset: 3px;
  transition: outline-offset 160ms ease;
}

tr[data-fc-premium-selected] > td {
  background: #eef5ff !important;
}

body #posts table[id^="post"] {
  table-layout: auto !important;
}

body #posts .fc-premium-author-cell {
  display: none !important;
}

body #posts table[id^="post"] td {
  padding-bottom: 4px !important;
  padding-top: 4px !important;
}

body .fc-premium-post-wrapper div[id^="edit"] > br,
body .fc-premium-post-wrapper div[id^="edit"] > table.cajasprin {
  display: none !important;
}

body .fc-premium-post-wrapper {
  margin-bottom: 6px;
}

body .fc-premium-post-wrapper[data-fc-premium-reply-indent] {
  margin-left: 18px;
}

#\${POSTS_SELECTOR.slice(1)}[data-fc-premium-graph-view="quoted-by"] .fc-premium-post-wrapper[data-fc-premium-reply-indent] {
  margin-left: 34px;
}

@media (max-width: 700px) {
  .fc-premium-post-wrapper[data-fc-premium-reply-indent] {
    margin-left: 14px;
  }

  #\${POSTS_SELECTOR.slice(1)}[data-fc-premium-graph-view="quoted-by"] .fc-premium-post-wrapper[data-fc-premium-reply-indent] {
    margin-left: 24px;
  }
}

body #fc-premium-thread-summary {
  font-size: 11px;
  margin: 6px auto;
  padding: 6px 8px;
}

body #fc-premium-top-tags,
body #fc-premium-forum-sidebar-toggle-bar {
  margin-bottom: 5px;
  margin-top: 5px;
  padding: 5px 8px;
}

body #fc-premium-thread-controls,
body #fc-premium-thread-progress {
  gap: 4px;
}

body #posts table[id^="post"] {
  font-size: 12px !important;
}

body #posts table[id^="post"] .alt1,
body #posts table[id^="post"] .alt2 {
  padding-left: 6px !important;
  padding-right: 6px !important;
}

body #threadslist td {
  padding-bottom: 2px !important;
  padding-top: 2px !important;
}

body #threadslist,
body #threadslist .mfont,
body #threadslist .smallfont {
  font-size: 12px !important;
}

body .fc-premium-header-author {
  display: inline-block;
}

body table.tborder:has(td.navbar),
body table.tborder:has(.navbar) {
  display: none !important;
}
`;
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
      getVisibleCachedForumThreadsForCurrentForum
    });
    const renderTaggedTitle = forumTagsController.renderTaggedTitle;
    const enhanceThreadTitleTags = forumTagsController.enhanceThreadTitleTags;
    const renderVisibleForumThreadTitleTags2 = forumTagsController.renderVisibleForumThreadTitleTags;
    const clearTagFilter = forumTagsController.clearTagFilter;
    const renderTopTagBar = forumTagsController.renderTopTagBar;
    const forumLayoutController = createForumLayoutController({
      ensureStyle,
      getPostsElement,
      getForumThreadLoadState: () => forumThreadLoadState,
      scheduleForumLiveSearch,
      getHiddenForumThreadRecordsForCurrentForum,
      setForumThreadHiddenState: (threadId, hidden) => setForumThreadHiddenState(threadId, hidden)
    });
    const renderForumControlsRow = forumLayoutController.renderForumControlsRow;
    const renderForumLoadingStatus = forumLayoutController.renderForumLoadingStatus;
    const enhanceForumDisplayPage = forumLayoutController.enhanceForumDisplayPage;
    const renderHiddenThreadsToolbarButton2 = forumLayoutController.renderHiddenThreadsToolbarButton;
    const isHiddenThreadsModalOpen2 = forumLayoutController.isHiddenThreadsModalOpen;
    const closeHiddenThreadsModal2 = forumLayoutController.closeHiddenThreadsModal;
    const renderHiddenThreadsModalBody2 = forumLayoutController.renderHiddenThreadsModalBody;
    function setForumThreadLoadState(state) {
      forumThreadLoadState = {
        ...forumThreadLoadState,
        ...state
      };
      renderForumLoadingStatus();
    }
    function applyForumLiveSearchQuery(query2) {
      const normalizedQuery = normalizeText(query2);
      if (normalizedQuery === activeForumSearchQuery) {
        return;
      }
      activeForumSearchQuery = normalizedQuery;
      activeForumTagPage = 1;
      refreshForumTagUi({ readUrlState: false });
    }
    function scheduleForumLiveSearch(query2) {
      window.clearTimeout(forumLiveSearchTimer);
      forumLiveSearchTimer = window.setTimeout(() => {
        applyForumLiveSearchQuery(query2);
      }, FORUM_LIVE_SEARCH_DEBOUNCE_MS);
    }
    function getCachedForumThreadsForCurrentForum() {
      return forumThreadCacheController.getCachedForumThreadsForCurrentForum();
    }
    function getVisibleCachedForumThreadsForCurrentForum() {
      return forumThreadCacheController.getVisibleCachedForumThreadsForCurrentForum();
    }
    function getHiddenForumThreadRecordsForCurrentForum() {
      return forumThreadCacheController.getHiddenForumThreadRecordsForCurrentForum();
    }
    function getForumThreadRecordsForTag(tag) {
      return forumThreadCacheController.getForumThreadRecordsForTag(tag);
    }
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
    function setForumTagPage(pageNumber) {
      activeForumTagPage = pageNumber;
      if (!activeForumSearchQuery) {
        syncForumTagUrl({ history: "push" });
      }
      refreshForumTagUi({ readUrlState: !activeForumSearchQuery });
      window.scrollTo({ top: 0, behavior: "auto" });
    }
    const forumThreadCacheController = createForumThreadCacheController({
      getActiveForumSearchQuery: () => activeForumSearchQuery,
      setActiveForumSearchQuery: (query2) => {
        activeForumSearchQuery = query2;
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
      setNativeForumThreadRows: (rows, pageSize, signatureKey) => setNativeForumThreadRows(rows, pageSize, signatureKey),
      applyHiddenForumThreadRows: () => applyHiddenForumThreadRows2(),
      refreshForumTagUi: () => refreshForumTagUi(),
      renderTopTagBar: () => renderTopTagBar(),
      updateBrowserHistory,
      refreshNavigation,
      getSelectedNavigationItem,
      getNavigationItems,
      getNavigationLength,
      selectNavigationIndex,
      isHiddenThreadsModalOpen: isHiddenThreadsModalOpen2,
      renderHiddenThreadsModalBody: renderHiddenThreadsModalBody2
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
      renderVisibleForumThreadTitleTags: () => renderVisibleForumThreadTitleTags2()
    });
    const captureNativeForumThreadRows = forumThreadListRenderer.captureNativeForumThreadRows;
    const getForumThreadsPerPage = forumThreadListRenderer.getForumThreadsPerPage;
    const setNativeForumThreadRows = forumThreadListRenderer.setNativeForumThreadRows;
    const applyHiddenForumThreadRows2 = forumThreadListRenderer.applyHiddenForumThreadRows;
    const renderForumThreadList = forumThreadListRenderer.renderForumThreadList;
    function handleForumPageNavigationClick(event) {
      if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }
      const link = event.target instanceof Element ? event.target.closest(".pagenav a[href*='forumdisplay.php']") : null;
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
      loadForumDisplayPageWithJavascript(url);
    }
    function installForumPageNavigation() {
      document.addEventListener("click", handleForumPageNavigationClick, true);
    }
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
      renderHiddenThreadsToolbarButton2();
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
    function initForumPage() {
      if (!isForumDisplayPage()) {
        return;
      }
      enhanceForumDisplayPage();
      installForumHistoryNavigation();
      installForumPageNavigation();
      installForumKeyboardNavigation();
      initializeForumThreadCache();
      refreshNavigation({ reset: true });
      renderShortcutHelpButton2();
    }
    const forumPageKeyboard = createForumPageKeyboardController({
      moveNavigation,
      isOpenSelectedThreadInNewTabShortcut,
      openSelectedForumThreadInNewTab,
      isHiddenThreadsModalOpen: isHiddenThreadsModalOpen2,
      closeHiddenThreadsModal: closeHiddenThreadsModal2,
      activeTagFilterExists: () => Boolean(activeTagFilter),
      clearTagFilter,
      hideSelectedForumThread,
      openSelectedNavigationItem,
      navigateForumPage,
      isThreadPage
    });
    return {
      init: async () => {
        initForumPage();
      },
      handleNavigationKeyDown: forumPageKeyboard.handleNavigationKeyDown,
      refreshNavigation,
      renderTopTagBar,
      renderForumControlsRow
    };
  }

  // src/ui/threadSummaryDom.ts
  function ensureThreadSummary(posts) {
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
  function renderThreadSummaryMenu(options) {
    const summary = options.summary;
    if (!(summary instanceof HTMLElement)) {
      return;
    }
    summary.textContent = "";
    summary.hidden = true;
    const controlsTarget = renderThreadControls({
      summary,
      state: options.state,
      onRefreshCache: options.onRefreshCache
    });
    if (controlsTarget === summary) {
      summary.hidden = !options.state.isLoading;
      renderThreadProgress(summary, options.state);
    }
  }
  function renderThreadControls(options) {
    document.getElementById(THREAD_CONTROLS_ID)?.remove();
    const threadToolsCell = document.getElementById("threadtools");
    const toolbarRow = threadToolsCell?.parentElement;
    if (!options.summary && !(toolbarRow instanceof HTMLTableRowElement)) {
      return null;
    }
    const controls = toolbarRow instanceof HTMLTableRowElement ? document.createElement("td") : document.createElement("div");
    controls.id = THREAD_CONTROLS_ID;
    if (controls instanceof HTMLTableCellElement) {
      controls.className = "vbmenu_control fc-premium-thread-toolbar-controls";
      controls.noWrap = true;
    }
    const cacheButton = document.createElement("button");
    cacheButton.type = "button";
    cacheButton.textContent = "Actualizar cache";
    cacheButton.title = "Borrar la cache de este hilo y volver a cargar paginas";
    cacheButton.addEventListener("click", () => {
      options.onRefreshCache();
    });
    controls.append(cacheButton);
    renderThreadProgress(controls, options.state);
    if (toolbarRow instanceof HTMLTableRowElement && threadToolsCell instanceof HTMLTableCellElement) {
      toolbarRow.insertBefore(controls, threadToolsCell);
      return controls;
    }
    options.summary?.append(controls);
    return options.summary || null;
  }
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
  function installStickySummaryShadow(summary) {
    if (!summary || summary.dataset.fcPremiumStickyInstalled === "true") {
      return;
    }
    summary.dataset.fcPremiumStickyInstalled = "true";
    const updateShadow = () => {
      summary.classList.toggle("fc-premium-summary-stuck", summary.getBoundingClientRect().top <= 0);
    };
    window.addEventListener("scroll", updateShadow, { passive: true });
    window.addEventListener("resize", updateShadow);
    updateShadow();
  }

  // src/domain/threadPosts.ts
  function applyReplyCounts(posts) {
    const repliesByPostId = new Map;
    for (const post of posts) {
      for (const quotedPostId of post.quotedPostIds) {
        if (!repliesByPostId.has(quotedPostId)) {
          repliesByPostId.set(quotedPostId, new Set);
        }
        repliesByPostId.get(quotedPostId).add(post.id);
      }
    }
    for (const post of posts) {
      post.replyingPostIds = Array.from(repliesByPostId.get(post.id) || []);
      post.replyCount = post.replyingPostIds.length;
    }
  }
  function createEmptyThreadGraph() {
    return {
      postById: new Map,
      quotedByPostId: new Map,
      quotingByPostId: new Map,
      neighborsByPostId: new Map,
      chronologicalNextByPostId: new Map
    };
  }
  function sortPosts(posts) {
    return posts.slice().sort((left, right) => {
      if (left.replyCount !== right.replyCount) {
        return right.replyCount - left.replyCount;
      }
      return left.originalIndex - right.originalIndex;
    });
  }
  function sortPostsChronologically(posts) {
    return posts.slice().sort((left, right) => left.originalIndex - right.originalIndex);
  }
  function applyOriginalPosterFlags(posts) {
    const firstPost = sortPostsChronologically(posts)[0];
    const originalPoster = firstPost?.author.toLowerCase();
    if (!originalPoster) {
      return;
    }
    for (const post of posts) {
      post.isOriginalPoster = post.author.toLowerCase() === originalPoster;
    }
  }
  function getPromotedCitedPosts(posts, limit) {
    const firstPost = sortPostsChronologically(posts)[0];
    return sortPosts(posts).filter((post) => post.replyCount > 0).slice(0, limit).filter((post) => post.id !== firstPost?.id);
  }
  function getFeaturedChronologicalPosts(posts, options) {
    const chronologicalPosts = sortPostsChronologically(posts);
    if (!options.shouldPromoteCitedPosts) {
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
      ...chronologicalPosts.filter((post) => post.id !== firstPost.id && !promotedPostIds.has(post.id))
    ];
  }
  function getReplyRankByPostId(posts) {
    const rankByPostId = new Map;
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
  function buildThreadGraph(posts) {
    const graph = createEmptyThreadGraph();
    const chronologicalPosts = sortPostsChronologically(posts);
    for (const post of chronologicalPosts) {
      graph.postById.set(post.id, post);
      ensureGraphSet(graph.quotedByPostId, post.id);
      ensureGraphSet(graph.quotingByPostId, post.id);
      ensureGraphSet(graph.neighborsByPostId, post.id);
    }
    for (let index = 0;index < chronologicalPosts.length; index += 1) {
      const post = chronologicalPosts[index];
      const nextPost = chronologicalPosts[index + 1] || null;
      if (post) {
        graph.chronologicalNextByPostId.set(post.id, nextPost?.id || null);
      }
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
  function getPostsForGraphView(view, graph, posts) {
    const root = graph.postById.get(view.rootPostId);
    if (!root) {
      return [];
    }
    if (view.type === "quoted-sources") {
      return getChronologicalGraphPosts([...root.quotedPostIds, root.id], posts);
    }
    if (view.type === "quoted-by") {
      const replyPosts = getChronologicalGraphPosts(Array.from(graph.quotedByPostId.get(root.id) || []), posts).filter((post) => post.id !== root.id);
      return [root, ...replyPosts];
    }
    return getConversationChainPosts(view, graph);
  }
  function getValidGraphView(view, graph) {
    if (view && graph.postById.has(view.rootPostId)) {
      return view;
    }
    return null;
  }
  function getThreadViewPosts(options) {
    if (options.activeGraphView) {
      return getPostsForGraphView(options.activeGraphView, options.graph, options.posts);
    }
    return getFeaturedChronologicalPosts(options.posts, {
      shouldPromoteCitedPosts: options.shouldPromoteCitedPosts
    });
  }
  function getReplyIndentDepth(options) {
    if (!options.activeGraphView) {
      return 0;
    }
    if (options.activeGraphView.type === "quoted-by") {
      return options.post.id === options.activeGraphView.rootPostId ? 0 : 1;
    }
    if (options.activeGraphView.type === "conversation") {
      return options.index === 0 ? 0 : 1;
    }
    if (options.activeGraphView.type === "quoted-sources") {
      return options.post.id === options.activeGraphView.rootPostId ? 1 : 0;
    }
    return 0;
  }
  function ensureGraphSet(map, key) {
    if (!map.has(key)) {
      map.set(key, new Set);
    }
    return map.get(key);
  }
  function getChronologicalGraphPosts(postIds, posts) {
    const ids = new Set(postIds);
    return sortPostsChronologically(posts).filter((post) => ids.has(post.id));
  }
  function getConversationParentPostId(post, preferredPostId, graph) {
    if (preferredPostId && post.quotedPostIds.includes(preferredPostId) && graph.postById.has(preferredPostId)) {
      return preferredPostId;
    }
    return post.quotedPostIds.find((postId) => graph.postById.has(postId)) || null;
  }
  function getConversationChainPosts(view, graph) {
    const chain = [];
    const seen = new Set;
    let currentPost = graph.postById.get(view.rootPostId) || null;
    let preferredParentPostId = view.relatedPostId;
    while (currentPost && !seen.has(currentPost.id)) {
      chain.push(currentPost);
      seen.add(currentPost.id);
      const parentPostId = getConversationParentPostId(currentPost, preferredParentPostId, graph);
      preferredParentPostId = null;
      currentPost = parentPostId ? graph.postById.get(parentPostId) || null : null;
    }
    return chain.reverse();
  }

  // src/adapters/forocoches/postReplyActions.ts
  function clickPostQuoteAction(wrapper) {
    const link = getPostReplyActionLink(wrapper, "quote");
    if (!link) {
      return false;
    }
    link.click();
    return true;
  }
  function togglePostMultiquote(wrapper, postId) {
    const link = getPostReplyActionLink(wrapper, "multiquote");
    const target = link?.querySelector("img[id^='mq_']");
    const multiquotePostId = target?.id.replace(/^mq_/, "") || postId;
    if (multiquotePostId && typeof window.mq_click === "function") {
      window.mq_click(multiquotePostId);
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
  function openThreadReplyWithoutQuote(threadId) {
    const link = getThreadReplyWithoutQuoteLink();
    if (link) {
      link.click();
      return true;
    }
    if (!threadId) {
      return false;
    }
    location.href = new URL(`newreply.php?do=newreply&t=${threadId}`, location.href).href;
    return true;
  }
  function isQuickReplyLink(link) {
    const image = link.querySelector("img");
    const label = `${link.id} ${image?.alt || ""} ${image?.title || ""} ${image?.getAttribute("src") || ""}`;
    return /quickreply|respuesta rapida|qr_\d+/i.test(label);
  }
  function isQuoteReplyLink(link) {
    const image = link.querySelector("img");
    const label = `${image?.alt || ""} ${image?.title || ""} ${image?.getAttribute("src") || ""}`;
    return /quote\.gif|multiquote|multi-cita|responder con cita/i.test(label);
  }
  function getPostReplyActionLink(wrapper, action) {
    const links = Array.from(wrapper.querySelectorAll(".fc-premium-post-reply-actions a[href*='newreply.php?do=newreply']")).filter((link) => link instanceof HTMLAnchorElement);
    return links.find((link) => action === "quote" ? isSingleQuoteReplyLink(link) : isMultiQuoteReplyLink(link)) || null;
  }
  function isMultiQuoteReplyLink(link) {
    const image = link.querySelector("img");
    const label = `${image?.id || ""} ${image?.alt || ""} ${image?.title || ""} ${image?.getAttribute("src") || ""}`;
    return /mq_\d+|multiquote|multi-cita/i.test(label);
  }
  function isSingleQuoteReplyLink(link) {
    return isQuoteReplyLink(link) && !isMultiQuoteReplyLink(link);
  }
  function isThreadReplyWithoutQuoteLink(link) {
    const image = link.querySelector("img");
    const label = `${image?.alt || ""} ${image?.title || ""} ${image?.getAttribute("src") || ""}`;
    return link.href.includes("newreply.php") && link.href.includes("do=newreply") && link.href.includes("noquote=1") && /reply\.gif|respuesta/i.test(label);
  }
  function getThreadReplyWithoutQuoteLink() {
    return Array.from(document.querySelectorAll("a[href*='newreply.php'][href*='noquote=1']")).filter((link) => link instanceof HTMLAnchorElement).find(isThreadReplyWithoutQuoteLink) || null;
  }

  // src/app/core/threadGraphViewController.ts
  function createThreadGraphViewController(options) {
    function setActiveGraphView(type, rootPostId, relatedPostId = null, viewOptions = {}) {
      const threadGraph = options.getThreadGraph();
      if (!threadGraph.postById.has(rootPostId)) {
        return;
      }
      const activeGraphView = {
        type,
        rootPostId,
        relatedPostId
      };
      options.setActiveGraphViewState(activeGraphView);
      options.setPendingGraphView(null);
      options.setActivePageFilter(null);
      options.syncThreadStateUrl({ history: viewOptions.history || "push" });
      options.renderThreadPosts();
      options.renderThreadSummaryMenu();
      if (viewOptions.scrollToFirstPost || viewOptions.scrollToFirstReply) {
        const viewPosts = getPostsForGraphView(activeGraphView, threadGraph, options.getLoadedThreadPosts());
        const targetPost = viewOptions.scrollToFirstPost ? viewPosts[0] || null : viewPosts.find((post) => post.id !== rootPostId) || null;
        if (targetPost) {
          if (viewOptions.scrollToFirstReply && activeGraphView.type === "quoted-by") {
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
      if (!pendingGraphView || options.getActiveGraphView() || !threadGraph.postById.has(pendingGraphView.rootPostId)) {
        return;
      }
      options.setActiveGraphViewState(pendingGraphView);
      options.setPendingGraphView(null);
      options.setActivePageFilter(null);
    }
    function applyThreadUrlState(url = new URL(location.href)) {
      if (!isThreadPage() || options.getLoadedThreadPosts().length === 0) {
        return;
      }
      const queryState = readThreadQueryState(url);
      const activeGraphView = getValidGraphView(queryState.graphView, options.getThreadGraph());
      options.setActiveGraphViewState(activeGraphView);
      options.setPendingGraphView(null);
      options.setActivePageFilter(activeGraphView ? null : queryState.authorFilters.length > 0 || queryState.searchQuery ? null : queryState.pageFilter || getPageNumber(url));
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
    function installThreadHistoryNavigation() {
      window.addEventListener("popstate", () => applyThreadUrlState());
    }
    function getThreadViewPosts2(posts) {
      return getThreadViewPosts({
        posts,
        activeGraphView: options.getActiveGraphView(),
        graph: options.getThreadGraph(),
        shouldPromoteCitedPosts: !options.getActivePageFilter() && !options.hasActiveThreadPostFilters()
      });
    }
    function getReplyIndentDepth2(post, index) {
      return getReplyIndentDepth({
        post,
        index,
        activeGraphView: options.getActiveGraphView()
      });
    }
    return {
      setActiveGraphView,
      activatePendingGraphView,
      applyThreadUrlState,
      installThreadHistoryNavigation,
      getThreadViewPosts: getThreadViewPosts2,
      getReplyIndentDepth: getReplyIndentDepth2
    };
  }

  // src/app/core/threadPageHeaderController.ts
  function createThreadPageHeaderController() {
    function ensureStyle() {
      const existing = document.getElementById(STYLE_ID);
      const style = existing instanceof HTMLStyleElement ? existing : document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `#fc-premium-thread-summary {
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

#fc-premium-thread-summary[hidden] {
  display: none !important;
}

#fc-premium-thread-summary.fc-premium-summary-stuck {
  box-shadow: 0 4px 12px rgba(23, 50, 77, 0.16);
}

#fc-premium-thread-summary strong {
  color: #0b57d0;
}

#fc-premium-thread-progress {
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

#fc-premium-shortcut-help-container {
  box-sizing: border-box;
  display: flex;
  justify-content: flex-end;
  margin: 4px 8px 0;
  min-height: 23px;
  position: relative;
  z-index: 50;
}

#fc-premium-shortcut-help-button {
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

#fc-premium-shortcut-help-button:hover,
#fc-premium-shortcut-help-button:focus-visible,
#fc-premium-shortcut-help-button[aria-expanded="true"] {
  background: #f7faff;
  border-color: #5f8fc7;
  color: #17324d;
  opacity: 0.95;
  outline: none;
}

#fc-premium-shortcut-help-popover {
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

#fc-premium-shortcut-help-popover[hidden] {
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

#fc-premium-thread-controls {
  display: flex;
  flex: 0 0 auto;
  gap: 5px;
  margin-left: auto;
}

#fc-premium-thread-controls button {
  background: #fff;
  border: 1px solid #b7d1ff;
  border-radius: 4px;
  color: #17324d;
  cursor: pointer;
  font: 700 10px/1 Verdana, Arial, sans-serif;
  padding: 4px 6px;
}

#fc-premium-thread-controls button:disabled {
  color: #80868b;
  cursor: default;
  opacity: 0.72;
}

#fc-premium-thread-controls.fc-premium-thread-toolbar-controls {
  display: table-cell;
  margin-left: 0;
  white-space: nowrap;
}

#fc-premium-thread-controls.fc-premium-thread-toolbar-controls button {
  background: transparent;
  border: 0;
  border-radius: 0;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  padding: 0 3px;
}

#fc-premium-thread-controls.fc-premium-thread-toolbar-controls button:hover {
  text-decoration: underline;
}

#fc-premium-thread-controls.fc-premium-thread-toolbar-controls button:disabled {
  cursor: default;
  opacity: 0.45;
  text-decoration: none;
}

#fc-premium-thread-controls.fc-premium-thread-toolbar-controls #fc-premium-thread-progress {
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
  flex: 1;
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

.fc-premium-thread-header-message-search {
  flex: 1;
}

.fc-premium-thread-header-message-search #fc-premium-thread-search-panel {
  margin: 0;
  width: 100%;
}

.fc-premium-thread-header-message-search #fc-premium-thread-search-panel td {
  padding: 2px 4px;
}

.fc-premium-thread-header-message-search .fc-premium-thread-search-layout {
  gap: 3px 5px;
  grid-template-columns: minmax(120px, 1fr) minmax(100px, 0.85fr) auto auto;
}

.fc-premium-thread-header-message-search #fc-premium-thread-search-status {
  grid-column: 1 / -1;
}

.fc-premium-thread-header-message-search #fc-premium-thread-search-selected-authors {
  margin-top: 3px;
}

#fc-premium-thread-search-panel {
  margin: 0 0 8px;
  width: 100%;
}

#fc-premium-thread-search-panel .fc-premium-thread-search-cell {
  padding: 5px 6px;
}

.fc-premium-thread-search-layout {
  align-items: end;
  display: grid;
  gap: 5px 8px;
  grid-template-columns: minmax(180px, 1fr) minmax(170px, 250px) auto auto minmax(115px, auto);
}

.fc-premium-thread-search-field {
  color: #17324d;
  display: grid;
  font: 700 10px/1.25 Verdana, Arial, sans-serif;
  gap: 2px;
  min-width: 0;
}

.fc-premium-thread-search-field input {
  border: 1px solid #7f9db9;
  box-sizing: border-box;
  font: 11px Verdana, Arial, sans-serif;
  height: 20px;
  min-width: 0;
  padding: 2px 4px;
  width: 100%;
}

.fc-premium-thread-search-button {
  background: #e6e9ed;
  border: 1px solid #7f8c99;
  border-left-color: #f8f8f8;
  border-radius: 2px;
  border-top-color: #f8f8f8;
  box-shadow: inset -1px -1px 0 #bcc3ca;
  color: #1f3550;
  cursor: pointer;
  font: 700 10px/1 Verdana, Arial, sans-serif;
  height: 20px;
  padding: 2px 7px 3px;
  white-space: nowrap;
}

.fc-premium-thread-search-button:hover {
  background: #f2f5f8;
  color: #0b57d0;
}

.fc-premium-thread-search-button:disabled {
  color: #80868b;
  cursor: default;
  opacity: 0.65;
}

#fc-premium-thread-search-selected-authors {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 5px;
}

.fc-premium-thread-author-chip {
  align-items: center;
  background: #f7faff;
  border: 1px solid #9db7e5;
  border-radius: 2px;
  color: #17324d;

  display: inline-flex;
  font: 10px/1 Verdana, Arial, sans-serif;
  gap: 3px;
  padding: 2px 4px;
}

.fc-premium-thread-author-chip button {
  background: transparent;
  border: 0;
  color: #0b57d0;
  cursor: pointer;
  font: 700 11px/1 Verdana, Arial, sans-serif;
  padding: 0 1px;
}

#fc-premium-thread-search-status {
  color: #3c4043;
  font: 10px/1.25 Verdana, Arial, sans-serif;
  min-width: 0;
  text-align: right;
  white-space: nowrap;
}

#fc-premium-thread-search-empty {
  background: #fff;
  border: 1px solid #b7d1ff;
  box-sizing: border-box;
  color: #3c4043;
  font: 11px/1.35 Verdana, Arial, sans-serif;
  margin: 0 0 8px;
  padding: 8px 10px;
  text-align: center;
}

#fc-premium-thread-search-empty[hidden] {
  display: none !important;
}

#fc-premium-top-tags {
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

#fc-premium-top-tags > span:first-child {
  font-weight: 700;
}

#fc-premium-top-tags .fc-premium-tag-chip[aria-pressed="true"] {
  box-shadow: 0 0 0 2px #0b57d0;
}

#fc-premium-top-tags button {
  background: #fff;
  border: 1px solid #9db7e5;
  border-radius: 3px;
  color: #17324d;
  cursor: pointer;
  font: 700 11px/1 Verdana, Arial, sans-serif;
  padding: 4px 6px;
}

#fc-premium-top-tags button[aria-current="page"] {
  background: #5f8fc7;
  border-color: #3f70a8;
  color: #fff;
  cursor: default;
}

#fc-premium-forum-controls-row {
  margin-bottom: 3px !important;
}

#fc-premium-forum-controls-row td {
  vertical-align: middle;
}

#fc-premium-forum-controls-row .fc-premium-forum-sidebar-toggle-cell,
#fc-premium-forum-controls-row .fc-premium-forum-new-thread-cell {
  padding-right: 6px;
  white-space: nowrap;
  width: 1%;
}

#fc-premium-forum-controls-row .fc-premium-forum-search-cell {
  text-align: left;
  white-space: nowrap;
  width: 100%;
}

#fc-premium-forum-controls-row .fc-premium-forum-pager-cell {
  text-align: right;
  white-space: nowrap;
  width: 1%;
}

#fc-premium-forum-controls-row .fc-premium-thread-header-search-form .cfield {
  max-width: 24vw;
  width: 190px;
}

#fc-premium-forum-loading-status {
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

#fc-premium-forum-loading-status[data-fc-premium-loading="false"] {
  visibility: hidden;
}

#fc-premium-forum-sidebar-toggle-bar {
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

#fc-premium-forum-sidebar-toggle {
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

#fc-premium-forum-sidebar-toggle:hover {
  background: #f2f5f8;
  color: #0b57d0;
}

html.fc-premium-modal-open,
body.fc-premium-modal-open {
  overflow: hidden !important;
  overscroll-behavior: none;
}

#fc-premium-hidden-threads-modal {
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

#fc-premium-hidden-threads-modal[hidden] {
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

#fc-premium-hidden-threads-modal-body {
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

tr[data-fc-premium-tag-hidden] {
  display: none !important;
}

[data-fc-premium-layout-hidden] {
  display: none !important;
}

.fc-premium-post-wrapper[data-fc-premium-filter-hidden] {
  display: none !important;
}

.fc-premium-post-wrapper[data-fc-premium-page-hidden] {
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

[data-fc-premium-selected] {
  border-radius: 6px;
  outline: 2px solid #1a73e8 !important;
  outline-offset: 3px;
  transition: outline-offset 160ms ease;
}

tr[data-fc-premium-selected] > td {
  background: #eef5ff !important;
}

body #posts table[id^="post"] {
  table-layout: auto !important;
}

body #posts .fc-premium-author-cell {
  display: none !important;
}

body #posts table[id^="post"] td {
  padding-bottom: 4px !important;
  padding-top: 4px !important;
}

body .fc-premium-post-wrapper div[id^="edit"] > br,
body .fc-premium-post-wrapper div[id^="edit"] > table.cajasprin {
  display: none !important;
}

body .fc-premium-post-wrapper {
  margin-bottom: 6px;
}

body .fc-premium-post-wrapper[data-fc-premium-reply-indent] {
  margin-left: 18px;
}

#\${POSTS_SELECTOR.slice(1)}[data-fc-premium-graph-view="quoted-by"] .fc-premium-post-wrapper[data-fc-premium-reply-indent] {
  margin-left: 34px;
}

@media (max-width: 700px) {
  .fc-premium-post-wrapper[data-fc-premium-reply-indent] {
    margin-left: 14px;
  }

  #\${POSTS_SELECTOR.slice(1)}[data-fc-premium-graph-view="quoted-by"] .fc-premium-post-wrapper[data-fc-premium-reply-indent] {
    margin-left: 24px;
  }
}

body #fc-premium-thread-summary {
  font-size: 11px;
  margin: 6px auto;
  padding: 6px 8px;
}

body #fc-premium-top-tags,
body #fc-premium-forum-sidebar-toggle-bar {
  margin-bottom: 5px;
  margin-top: 5px;
  padding: 5px 8px;
}

body #fc-premium-thread-controls,
body #fc-premium-thread-progress {
  gap: 4px;
}

body #posts table[id^="post"] {
  font-size: 12px !important;
}

body #posts table[id^="post"] .alt1,
body #posts table[id^="post"] .alt2 {
  padding-left: 6px !important;
  padding-right: 6px !important;
}

body #threadslist td {
  padding-bottom: 2px !important;
  padding-top: 2px !important;
}

body #threadslist,
body #threadslist .mfont,
body #threadslist .smallfont {
  font-size: 12px !important;
}

body .fc-premium-header-author {
  display: inline-block;
}

body table.tborder:has(td.navbar),
body table.tborder:has(.navbar) {
  display: none !important;
}
`;
      if (!existing) {
        document.head.appendChild(style);
      }
    }
    function enhanceThreadHeader() {
      const titleTable = getThreadTitleTable();
      if (!(titleTable instanceof HTMLTableElement) || titleTable.dataset.fcPremiumThreadHeaderEnhanced === "true") {
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
      searchSlot.id = THREAD_SEARCH_HEADER_SLOT_ID;
      searchSlot.className = "fc-premium-thread-header-message-search";
      layout.append(searchSlot);
      cell.append(layout);
      hideForumHeaderSearchForm();
      if (searchParentCell instanceof HTMLElement) {
        searchParentCell.setAttribute(FORUM_LAYOUT_HIDDEN_ATTRIBUTE, "true");
      }
      if (breadcrumbOuterTable instanceof HTMLElement) {
        breadcrumbOuterTable.setAttribute(FORUM_LAYOUT_HIDDEN_ATTRIBUTE, "true");
      }
    }
    function prepareThreadPage() {
      ensureStyle();
      hideTopShortcutBarsBefore(getThreadTitleTable());
      hideNativeThreadSearchMenu();
      enhanceThreadHeader();
      hideNativeThreadSearchMenu();
    }
    function renderShortcutHelpButton2() {
      renderShortcutHelpButton({
        items: getShortcutHelpItems(),
        formatKey: formatShortcutHelpKey
      });
    }
    return {
      prepareThreadPage,
      renderShortcutHelpButton: renderShortcutHelpButton2
    };
  }

  // src/app/core/threadPageLoader.ts
  function getUniqueThreadPages(pages) {
    const seenPageNumbers = new Set;
    const uniquePages = [];
    for (const page of pages) {
      if (seenPageNumbers.has(page.pageNumber)) {
        continue;
      }
      seenPageNumbers.add(page.pageNumber);
      uniquePages.push(page);
    }
    return uniquePages;
  }
  function getThreadPagesToRefresh(options) {
    const firstPage = options.allPages.find((page) => page.pageNumber === 1);
    if (!options.cachedThread || !isCompleteThreadCache(options.cachedThread)) {
      return options.allPages;
    }
    const currentLastPageNumber = options.allPages.length;
    const previousLastPageNumber = Math.min(Math.max(options.cachedThread.lastSeenPageNumber, 1), currentLastPageNumber);
    const tailStartPageNumber = currentLastPageNumber > previousLastPageNumber ? previousLastPageNumber : currentLastPageNumber;
    const tailPages = options.allPages.filter((page) => page.pageNumber >= tailStartPageNumber);
    return getUniqueThreadPages([
      ...firstPage ? [firstPage] : [],
      ...tailPages
    ]);
  }
  function getPageOffset(posts, pageNumber) {
    return posts.filter((post) => post.pageNumber < pageNumber).length;
  }
  function replaceThreadPagePosts(posts, pageNumber, pagePosts) {
    return posts.filter((post) => post.pageNumber !== pageNumber).concat(pagePosts).sort((left, right) => {
      if (left.originalIndex !== right.originalIndex) {
        return left.originalIndex - right.originalIndex;
      }
      if (left.pageNumber !== right.pageNumber) {
        return left.pageNumber - right.pageNumber;
      }
      return left.pageIndex - right.pageIndex;
    });
  }
  async function enhanceThreadPage(options) {
    options.prepareThreadPage();
    const summary = options.ensureThreadSummary();
    const queryState = readThreadQueryState();
    const allPages = options.getThreadPages();
    const currentPageNumber = getPageNumber(new URL(location.href));
    const cachedThread = await readCurrentThreadCache();
    const pages = getThreadPagesToRefresh({ allPages, cachedThread });
    const allPosts = [];
    let loadedPosts = cachedThread && isCompleteThreadCache(cachedThread) ? cachedThread.posts.filter((post) => post.pageNumber <= allPages.length) : [];
    options.setThreadPages(allPages);
    options.setLoadedThreadPosts([]);
    options.setLoadedThreadPageNumbers(new Set);
    options.setThreadGraphEmpty();
    options.setActiveGraphView(null);
    options.setPendingGraphView(queryState.graphView);
    options.setActivePageFilter(queryState.graphView ? null : queryState.authorFilters.length > 0 || queryState.searchQuery ? null : queryState.pageFilter || currentPageNumber);
    options.setActiveAuthorFilters(new Set(queryState.authorFilters));
    options.setActiveThreadSearchQuery(queryState.searchQuery);
    const activePageFilter = queryState.graphView ? null : queryState.authorFilters.length > 0 || queryState.searchQuery ? null : queryState.pageFilter || currentPageNumber;
    if (activePageFilter) {
      options.updateThreadPageUrl(activePageFilter, {
        preserveHash: Boolean(options.getPendingInitialHashPostId())
      });
    } else {
      options.syncThreadStateUrl();
    }
    if (!options.getPendingInitialHashPostId()) {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
    options.setThreadLoadState({
      loadedPages: 0,
      targetPages: pages.length,
      totalPages: allPages.length,
      loadedPosts: 0,
      isLoading: pages.length > 0
    });
    if (summary) {
      summary.textContent = "";
    }
    options.renderThreadSummaryMenu(summary);
    options.renderThreadSearchPanel();
    const currentPageDocument = parseHtml(document.documentElement.outerHTML);
    const loadedPageNumbers = new Set(loadedPosts.map((post) => post.pageNumber));
    for (const page of pages) {
      const doc = page.pageNumber === currentPageNumber ? currentPageDocument : await fetchThreadDocument(page.url);
      const pagePosts = collectPosts(doc, page.pageNumber, getPageOffset(loadedPosts, page.pageNumber));
      loadedPosts = replaceThreadPagePosts(loadedPosts, page.pageNumber, pagePosts);
      allPosts.length = 0;
      allPosts.push(...loadedPosts);
      loadedPageNumbers.add(page.pageNumber);
      options.setLoadedThreadPageNumbers(new Set(loadedPageNumbers));
      options.hydrateThreadPosts(allPosts);
      options.setThreadLoadState({
        ...options.getThreadLoadState(),
        loadedPages: loadedPageNumbers.size,
        loadedPosts: allPosts.length,
        isLoading: true
      });
      options.renderThreadPosts();
      options.renderThreadSummaryMenu(summary);
      const lastPage = pages[pages.length - 1];
      if (lastPage && page.pageNumber !== lastPage.pageNumber) {
        await sleep(PAGE_LOAD_DELAY_MS);
      }
    }
    options.setThreadLoadState({
      ...options.getThreadLoadState(),
      loadedPages: loadedPageNumbers.size,
      loadedPosts: allPosts.length,
      isLoading: false
    });
    options.renderThreadPosts();
    options.renderThreadSummaryMenu(summary);
    if (allPages.every((page) => loadedPageNumbers.has(page.pageNumber))) {
      await writeCurrentThreadCache(allPosts, allPages.length, loadedPageNumbers, allPages.length);
    }
  }

  // src/app/core/threadPageKeyboardController.ts
  function createThreadPageKeyboardController(handlers) {
    function hasActiveGraphView() {
      return Boolean(handlers.getActiveGraphView());
    }
    function hasActiveFiltersOrView() {
      return handlers.hasActiveThreadPostFilters() || hasActiveGraphView();
    }
    function handleSelectedPostActionShortcut(event) {
      if (!handlers.getSelectedPostWrapper) {
        return false;
      }
      if (hasKeyboardModifier(event)) {
        return false;
      }
      if (event.key === KEY_NEW_THREAD_REPLY) {
        event.preventDefault();
        return handlers.openThreadReplyWithoutQuote();
      }
      const selected = handlers.getSelectedPostWrapper();
      if (!selected) {
        return false;
      }
      if (event.key === KEY_QUOTE_SELECTED_POST) {
        event.preventDefault();
        return handlers.quoteSelectedPost(selected);
      }
      if (event.key === KEY_MULTIQUOTE_SELECTED_POST) {
        event.preventDefault();
        return handlers.toggleSelectedPostMultiquote(selected);
      }
      return false;
    }
    function handleNavigationKeyDown(event) {
      if (isEditableTarget(event.target)) {
        return false;
      }
      if ((event.key === KEY_NAV_NEXT_POST || event.key === KEY_NAV_PREVIOUS_POST || event.key === KEY_NAV_NEXT_PAGE || event.key === KEY_NAV_PREVIOUS_PAGE) && hasKeyboardModifier(event)) {
        return false;
      }
      if (event.key === KEY_OPEN_SHORTCUT_HELP) {
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
        handlers.moveNavigation(1);
        return true;
      }
      if (event.key === KEY_NAV_PREVIOUS_POST) {
        event.preventDefault();
        handlers.moveNavigation(-1);
        return true;
      }
      if (event.key === KEY_NAV_PREVIOUS_PAGE) {
        event.preventDefault();
        return handlers.navigatePage(-1);
      }
      if (event.key === KEY_NAV_NEXT_PAGE) {
        event.preventDefault();
        return handlers.navigatePage(1);
      }
      if (!hasKeyboardModifier(event) && keyboardShortcutMatches(event, KEY_RETURN_TO_THREAD_LIST)) {
        event.preventDefault();
        return handlers.returnToThreadList();
      }
      if (handleSelectedPostActionShortcut(event)) {
        return true;
      }
      if (event.key === KEY_CLEAR_ACTIVE_VIEW && hasActiveFiltersOrView()) {
        event.preventDefault();
        handlers.clearThreadFilters();
        return true;
      }
      if (event.key === KEY_QUOTE_SELECTED_POST && !hasKeyboardModifier(event)) {
        event.preventDefault();
        const selected = handlers.getSelectedPostWrapper();
        if (!selected) {
          return false;
        }
        return handlers.quoteSelectedPost(selected);
      }
      return false;
    }
    return { handleNavigationKeyDown };
  }

  // src/ui/threadPostFiltersDom.ts
  function applyPageFilterToRenderedPosts(posts, activePageFilter) {
    let total = 0;
    let visible = 0;
    if (!posts) {
      return { total, visible };
    }
    for (const wrapper of getRenderedPostWrappers(posts)) {
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
  function applyThreadPostFiltersToRenderedPosts(options) {
    let total = 0;
    let visible = 0;
    if (!options.posts) {
      return { total, visible };
    }
    for (const wrapper of getRenderedPostWrappers(options.posts)) {
      const authorKey = wrapper.dataset.fcPremiumAuthor || "";
      const postId = getPostIdFromWrapper(wrapper);
      const post = postId ? options.postById.get(postId) : null;
      const matchesAuthor = options.activeAuthorFilters.size === 0 || options.activeAuthorFilters.has(authorKey);
      const matchesText = !options.query || (post ? options.getPostSearchText(post).includes(options.query) : false);
      const matches = matchesAuthor && matchesText;
      total += 1;
      if (matches) {
        visible += 1;
        wrapper.removeAttribute(HIDDEN_POST_FILTER_ATTRIBUTE);
      } else {
        wrapper.setAttribute(HIDDEN_POST_FILTER_ATTRIBUTE, "true");
      }
    }
    return { total, visible };
  }
  function enhanceAuthorFilterButton(wrapper, author, onToggleAuthor) {
    const authorKey = normalizeAuthorName(author);
    if (!authorKey) {
      return;
    }
    wrapper.dataset.fcPremiumAuthor = authorKey;
    const username = wrapper.querySelector(".bigusername");
    if (!(username instanceof HTMLElement)) {
      return;
    }
    const existingButton = username.parentElement?.querySelector(".fc-premium-author-filter-button");
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
      onToggleAuthor(author);
    });
    username.after(button);
  }
  function getRenderedPostWrappers(posts) {
    return Array.from(posts.querySelectorAll(".fc-premium-post-wrapper")).filter((wrapper) => wrapper instanceof HTMLElement);
  }
  function getPostIdFromWrapper(wrapper) {
    const postTable = wrapper.querySelector(POST_TABLE_SELECTOR);
    const postId = postTable?.id.match(/^post(\d+)$/)?.[1];
    return postId || null;
  }

  // src/adapters/forocoches/threadPageNavigation.ts
  function updateOriginalThreadPageMenus(options) {
    for (const table of getOriginalThreadPageNavTables()) {
      const body = table.tBodies[0] || table.createTBody();
      const row = document.createElement("tr");
      const statusCell = document.createElement("td");
      statusCell.className = "vbmenu_control";
      statusCell.style.fontWeight = "normal";
      statusCell.textContent = `Pág ${options.currentPage} de ${options.totalPages}`;
      row.append(statusCell);
      for (const pageNumber of options.visiblePages) {
        row.append(createOriginalThreadPageCell(pageNumber, options.currentPage, options.hrefForPage));
      }
      if (options.currentPage < options.totalPages) {
        row.append(createOriginalThreadPageActionCell(">", options.currentPage + 1, options.hrefForPage));
      }
      if (options.currentPage !== options.totalPages) {
        row.append(createOriginalThreadPageActionCell("Último »", options.totalPages, options.hrefForPage));
      }
      body.textContent = "";
      body.append(row);
    }
  }
  function getOriginalThreadPageLinkNumber(link, currentThreadId) {
    const table = link.closest("table.tborder");
    if (!(table instanceof HTMLTableElement)) {
      return null;
    }
    const status = normalizeText(table.querySelector("td.vbmenu_control")?.textContent);
    if (!/^Pág \d+ de \d+$/.test(status)) {
      return null;
    }
    const url = toUrl(link.getAttribute("href") || link.href);
    if (!url || getThreadId(url) !== currentThreadId) {
      return null;
    }
    return getPageNumber(url);
  }
  function getOriginalThreadPageNavTables() {
    return Array.from(document.querySelectorAll("table.tborder")).filter((table) => {
      if (!(table instanceof HTMLTableElement)) {
        return false;
      }
      const status = normalizeText(table.querySelector("td.vbmenu_control")?.textContent);
      return /^Pág \d+ de \d+$/.test(status);
    });
  }
  function createOriginalThreadPageCell(pageNumber, currentPage, hrefForPage) {
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
    link.href = hrefForPage(pageNumber);
    link.title = `Mostrar pagina ${pageNumber}`;
    link.textContent = String(pageNumber);
    cell.append(link);
    return cell;
  }
  function createOriginalThreadPageActionCell(text, pageNumber, hrefForPage) {
    const cell = document.createElement("td");
    cell.className = "alt1";
    const link = document.createElement("a");
    link.className = "smallfont";
    link.href = hrefForPage(pageNumber);
    link.textContent = text;
    cell.append(link);
    return cell;
  }

  // src/app/core/threadPagePaginationController.ts
  function createThreadPagePaginationController(options) {
    function setPageFilter(pageNumber) {
      if (!isThreadPage()) {
        return;
      }
      options.setActivePageFilter(pageNumber);
      options.clearGraphView();
      options.updateThreadPageUrl(pageNumber, { history: "push" });
      updateOriginalThreadPageMenus2();
      options.renderThreadPosts();
      options.renderThreadSummaryMenu();
      window.scrollTo({ top: 0, behavior: "auto" });
    }
    function navigatePage(direction) {
      if (!isThreadPage() || options.getActiveGraphView()) {
        return false;
      }
      const totalPages = options.getThreadPages().length;
      if (totalPages <= 1) {
        return false;
      }
      const currentPage = options.getActivePageFilter() || getPageNumber(new URL(location.href));
      const nextPage = Math.min(Math.max(currentPage + direction, 1), totalPages);
      if (nextPage === currentPage) {
        return false;
      }
      setPageFilter(nextPage);
      return true;
    }
    function applyPageFilter() {
      return applyPageFilterToRenderedPosts(options.getPostsElement(), options.getActivePageFilter());
    }
    function updateOriginalThreadPageMenus2() {
      const threadPages = options.getThreadPages();
      if (!isThreadPage() || threadPages.length <= 1 || options.getActiveGraphView()) {
        return;
      }
      const totalPages = threadPages.length;
      const currentPage = options.getActivePageFilter() || getPageNumber(new URL(location.href));
      updateOriginalThreadPageMenus({
        totalPages,
        currentPage,
        visiblePages: getVisiblePageNumbers(totalPages, currentPage),
        hrefForPage: (pageNumber) => options.getThreadPageUrl(pageNumber).href
      });
    }
    function handleThreadPageNavigationClick(event) {
      const link = event.target instanceof Element ? event.target.closest("a[href*='showthread.php']") : null;
      if (!(link instanceof HTMLAnchorElement)) {
        return;
      }
      const pageNumber = getOriginalThreadPageLinkNumber(link, getThreadId(new URL(location.href)));
      if (!pageNumber) {
        return;
      }
      event.preventDefault();
      setPageFilter(pageNumber);
    }
    function installThreadPageNavigation() {
      document.addEventListener("click", handleThreadPageNavigationClick, true);
    }
    return {
      setPageFilter,
      navigatePage,
      applyPageFilter,
      updateOriginalThreadPageMenus: updateOriginalThreadPageMenus2,
      installThreadPageNavigation
    };
  }

  // src/ui/components/ThreadSearchPanel.tsx
  function ThreadSearchPanel(props) {
    return renderElement(/* @__PURE__ */ u2("table", {
      id: THREAD_SEARCH_PANEL_ID,
      className: "tborder",
      cellPadding: "4",
      cellSpacing: "1",
      ...{ border: "0" },
      children: /* @__PURE__ */ u2("tbody", {
        children: [
          /* @__PURE__ */ u2("tr", {
            children: /* @__PURE__ */ u2("td", {
              className: "thead",
              children: "Buscar mensajes"
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u2("tr", {
            children: /* @__PURE__ */ u2("td", {
              className: "alt1 fc-premium-thread-search-cell",
              children: [
                /* @__PURE__ */ u2("div", {
                  className: "fc-premium-thread-search-layout",
                  children: [
                    /* @__PURE__ */ u2("label", {
                      className: "fc-premium-thread-search-field",
                      children: [
                        "Texto",
                        /* @__PURE__ */ u2("input", {
                          id: THREAD_SEARCH_TEXT_INPUT_ID,
                          type: "search",
                          className: "bginput",
                          placeholder: "Buscar en mensajes",
                          value: props.searchQuery,
                          onInput: (event) => {
                            const input = event.currentTarget;
                            if (input instanceof HTMLInputElement) {
                              props.onSearchInput(input.value);
                            }
                          }
                        }, undefined, false, undefined, this)
                      ]
                    }, undefined, true, undefined, this),
                    /* @__PURE__ */ u2("label", {
                      className: "fc-premium-thread-search-field",
                      children: [
                        "Usuario",
                        /* @__PURE__ */ u2("input", {
                          id: THREAD_SEARCH_AUTHOR_INPUT_ID,
                          type: "text",
                          className: "bginput",
                          placeholder: "Escribe un usuario",
                          list: THREAD_SEARCH_AUTHOR_DATALIST_ID,
                          autoComplete: "off",
                          onKeyDown: (event) => {
                            if (event.key !== "Enter") {
                              return;
                            }
                            event.preventDefault();
                            props.onAddAuthor();
                          }
                        }, undefined, false, undefined, this)
                      ]
                    }, undefined, true, undefined, this),
                    /* @__PURE__ */ u2("button", {
                      type: "button",
                      className: "fc-premium-thread-search-button",
                      onClick: props.onAddAuthor,
                      children: "Añadir"
                    }, undefined, false, undefined, this),
                    /* @__PURE__ */ u2("button", {
                      type: "button",
                      className: "fc-premium-thread-search-button",
                      onClick: props.onClearFilters,
                      children: "Limpiar"
                    }, undefined, false, undefined, this),
                    /* @__PURE__ */ u2("span", {
                      id: THREAD_SEARCH_STATUS_ID
                    }, undefined, false, undefined, this)
                  ]
                }, undefined, true, undefined, this),
                /* @__PURE__ */ u2("datalist", {
                  id: THREAD_SEARCH_AUTHOR_DATALIST_ID
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u2("div", {
                  id: THREAD_SEARCH_SELECTED_AUTHORS_ID
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u2("div", {
                  id: THREAD_SEARCH_EMPTY_ID
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this)
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    }, undefined, false, undefined, this));
  }

  // src/domain/threadAuthors.ts
  function getThreadOriginalPosterName(posts) {
    return sortPostsChronologically(posts)[0]?.author || "";
  }
  function getThreadAuthorOptions(posts, currentUsername) {
    const optionsByKey = new Map;
    const originalPosterKey = normalizeAuthorName(getThreadOriginalPosterName(posts));
    const currentUserKey = normalizeAuthorName(currentUsername);
    for (const post of posts) {
      const key = normalizeAuthorName(post.author);
      if (!key) {
        continue;
      }
      const option = optionsByKey.get(key) || {
        key,
        name: post.author,
        count: 0,
        isOriginalPoster: key === originalPosterKey,
        isCurrentUser: key === currentUserKey
      };
      option.count += 1;
      option.isOriginalPoster = option.isOriginalPoster || key === originalPosterKey;
      option.isCurrentUser = option.isCurrentUser || key === currentUserKey;
      optionsByKey.set(key, option);
    }
    if (currentUserKey && !optionsByKey.has(currentUserKey)) {
      optionsByKey.set(currentUserKey, {
        key: currentUserKey,
        name: currentUsername,
        count: 0,
        isOriginalPoster: currentUserKey === originalPosterKey,
        isCurrentUser: true
      });
    }
    return Array.from(optionsByKey.values()).sort((left, right) => {
      if (left.isOriginalPoster !== right.isOriginalPoster) {
        return left.isOriginalPoster ? -1 : 1;
      }
      if (left.isCurrentUser !== right.isCurrentUser) {
        return left.isCurrentUser ? -1 : 1;
      }
      return left.name.localeCompare(right.name, "es", {
        sensitivity: "base"
      });
    });
  }
  function getThreadAuthorOptionLabel(option) {
    const markers = [];
    if (option.isOriginalPoster) {
      markers.push("autor");
    }
    if (option.isCurrentUser) {
      markers.push("tú");
    }
    return markers.length > 0 ? `${option.name} (${markers.join(", ")})` : option.name;
  }
  function resolveThreadAuthorInputValue(value, options) {
    const input = normalizeText(value);
    const inputKey = normalizeAuthorName(input);
    if (!inputKey) {
      return null;
    }
    for (const option of options) {
      const labelKey = normalizeAuthorName(getThreadAuthorOptionLabel(option));
      if (option.key === inputKey || normalizeAuthorName(option.name) === inputKey || labelKey === inputKey) {
        return option.key;
      }
    }
    return null;
  }

  // src/ui/threadSearchPanelDom.ts
  function syncThreadSearchTextInput(searchQuery) {
    const textInput = document.getElementById(THREAD_SEARCH_TEXT_INPUT_ID);
    if (textInput instanceof HTMLInputElement && document.activeElement !== textInput) {
      textInput.value = searchQuery;
    }
  }
  function refreshThreadAuthorDatalist(options, activeAuthorFilters) {
    const datalist = document.getElementById(THREAD_SEARCH_AUTHOR_DATALIST_ID);
    if (!(datalist instanceof HTMLDataListElement)) {
      return;
    }
    datalist.textContent = "";
    for (const option of options) {
      if (activeAuthorFilters.has(option.key)) {
        continue;
      }
      const element = document.createElement("option");
      element.value = getThreadAuthorOptionLabel(option);
      element.label = `${option.count} mensajes`;
      datalist.append(element);
    }
  }
  function refreshSelectedThreadAuthors(authorKeys, authorOptions, onRemoveAuthor) {
    const container = document.getElementById(THREAD_SEARCH_SELECTED_AUTHORS_ID);
    if (!(container instanceof HTMLElement)) {
      return;
    }
    container.textContent = "";
    for (const authorKey of authorKeys) {
      const option = authorOptions.find((candidate) => candidate.key === authorKey) || null;
      const chip = document.createElement("span");
      chip.className = "fc-premium-thread-author-chip";
      chip.textContent = option ? getThreadAuthorOptionLabel(option) : authorKey;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "x";
      remove.title = "Quitar usuario";
      remove.addEventListener("click", () => {
        onRemoveAuthor(authorKey);
      });
      chip.append(remove);
      container.append(chip);
    }
  }
  function renderThreadSearchStatus(options) {
    const status = document.getElementById(THREAD_SEARCH_STATUS_ID);
    if (!(status instanceof HTMLElement)) {
      return;
    }
    const total = options.counts?.total ?? options.totalPosts;
    const visible = options.counts?.visible ?? getVisibleThreadSearchPostWrapperCount();
    const loading = options.threadLoadState.isLoading ? ` · cargando ${options.threadLoadState.loadedPages}/${options.threadLoadState.targetPages}` : "";
    status.textContent = options.hasActiveFilters ? `${visible}/${total} mensajes${loading}` : `${total} mensajes${loading}`;
  }
  function renderThreadSearchEmptyState(options) {
    const posts = options.posts;
    if (!posts) {
      return;
    }
    let empty = document.getElementById(THREAD_SEARCH_EMPTY_ID);
    if (!empty) {
      empty = document.createElement("div");
      empty.id = THREAD_SEARCH_EMPTY_ID;
      posts.before(empty);
    }
    empty.textContent = options.isLoading ? "No hay mensajes cargados que coincidan con estos filtros." : "No hay mensajes que coincidan con estos filtros.";
    empty.hidden = !(options.hasActiveFilters && (options.counts?.visible ?? 0) === 0);
  }
  function getVisibleThreadSearchPostWrapperCount() {
    return Array.from(document.querySelectorAll(".fc-premium-post-wrapper")).filter((wrapper) => wrapper instanceof HTMLElement && isVisible(wrapper)).length;
  }

  // src/app/core/threadPostFilterController.ts
  function createThreadPostFilterController(options) {
    const threadPostSearchTextById = new Map;
    function getAuthenticatedUsername() {
      const profileLink = Array.from(document.querySelectorAll("a[href*='member.php?u=']")).find((link) => link instanceof HTMLAnchorElement && normalizeText(link.textContent) === "Tu Perfil");
      const profileUserId = profileLink instanceof HTMLAnchorElement ? toUrl(profileLink.href)?.searchParams.get("u") || "" : "";
      if (profileUserId) {
        const usernameLink = Array.from(document.querySelectorAll("a[href*='member.php?u=']")).find((link) => {
          if (!(link instanceof HTMLAnchorElement)) {
            return false;
          }
          const text = normalizeText(link.textContent);
          return text && text !== "Tu Perfil" && toUrl(link.href)?.searchParams.get("u") === profileUserId;
        });
        if (usernameLink instanceof HTMLAnchorElement) {
          return normalizeText(usernameLink.textContent);
        }
      }
      return normalizeText(document.querySelector("#navbar_username")?.textContent);
    }
    function getThreadAuthorOptions2(posts = options.getLoadedThreadPosts()) {
      return getThreadAuthorOptions(posts, getAuthenticatedUsername());
    }
    function resolveThreadAuthorInputValue2(value) {
      return resolveThreadAuthorInputValue(value, getThreadAuthorOptions2());
    }
    function getThreadPostSearchText(post) {
      const cached = threadPostSearchTextById.get(post.id);
      if (cached !== undefined) {
        return cached;
      }
      const doc = parseHtml(post.html);
      const message = doc.getElementById(`post_message_${post.id}`) || doc.body || null;
      const text = normalizeLayoutText(message?.textContent || "");
      threadPostSearchTextById.set(post.id, text);
      return text;
    }
    function hasActiveThreadPostFilters() {
      return Boolean(options.getActiveThreadSearchQuery()) || options.getActiveAuthorFilters().size > 0;
    }
    function ensureThreadSearchPanel() {
      const existing = document.getElementById(THREAD_SEARCH_PANEL_ID);
      const headerSlot = document.getElementById(THREAD_SEARCH_HEADER_SLOT_ID);
      if (existing instanceof HTMLTableElement && headerSlot instanceof HTMLElement && !headerSlot.contains(existing)) {
        headerSlot.append(existing);
      }
      if (existing instanceof HTMLTableElement) {
        return existing;
      }
      const posts = options.getPostsElement();
      if (!posts) {
        return null;
      }
      const panel = ThreadSearchPanel({
        searchQuery: options.getActiveThreadSearchQuery(),
        onSearchInput: setThreadSearchQuery,
        onAddAuthor: addThreadAuthorFilterFromInput,
        onClearFilters: clearThreadPostFilters
      });
      if (headerSlot instanceof HTMLElement) {
        headerSlot.append(panel);
      } else {
        posts.before(panel);
      }
      return panel;
    }
    function refreshThreadAuthorDatalist2() {
      refreshThreadAuthorDatalist(getThreadAuthorOptions2(), options.getActiveAuthorFilters());
    }
    function refreshSelectedThreadAuthors2() {
      refreshSelectedThreadAuthors(options.getActiveAuthorFilters(), getThreadAuthorOptions2(), removeThreadAuthorFilter);
    }
    function renderThreadSearchStatus2(counts) {
      renderThreadSearchStatus({
        counts,
        totalPosts: options.getLoadedThreadPosts().length,
        threadLoadState: options.getThreadLoadState(),
        hasActiveFilters: hasActiveThreadPostFilters()
      });
    }
    function renderThreadSearchEmptyState2(counts) {
      renderThreadSearchEmptyState({
        posts: options.getPostsElement(),
        counts,
        isLoading: options.getThreadLoadState().isLoading,
        hasActiveFilters: hasActiveThreadPostFilters()
      });
    }
    function renderThreadSearchPanel(counts) {
      const panel = ensureThreadSearchPanel();
      if (!panel) {
        return;
      }
      syncThreadSearchTextInput(options.getActiveThreadSearchQuery());
      refreshThreadAuthorDatalist2();
      refreshSelectedThreadAuthors2();
      renderThreadSearchStatus2(counts);
      renderThreadSearchEmptyState2(counts);
    }
    function setThreadSearchQuery(query2) {
      const hadFilters = hasActiveThreadPostFilters();
      const nextQuery = normalizeText(query2);
      if (options.getActiveThreadSearchQuery() === nextQuery) {
        return;
      }
      options.setActiveThreadSearchQuery(nextQuery);
      updateThreadPostFilters({
        render: hadFilters !== hasActiveThreadPostFilters()
      });
    }
    function addThreadAuthorFilter(authorKey) {
      const activeAuthorFilters = options.getActiveAuthorFilters();
      if (!authorKey || activeAuthorFilters.has(authorKey)) {
        return;
      }
      const hadFilters = hasActiveThreadPostFilters();
      activeAuthorFilters.add(authorKey);
      updateThreadPostFilters({
        render: hadFilters !== hasActiveThreadPostFilters()
      });
    }
    function addThreadAuthorFilterFromInput() {
      const input = document.getElementById(THREAD_SEARCH_AUTHOR_INPUT_ID);
      if (!(input instanceof HTMLInputElement)) {
        return;
      }
      const authorKey = resolveThreadAuthorInputValue2(input.value);
      if (!authorKey) {
        return;
      }
      input.value = "";
      addThreadAuthorFilter(authorKey);
    }
    function removeThreadAuthorFilter(authorKey) {
      if (!options.getActiveAuthorFilters().delete(authorKey)) {
        return;
      }
      updateThreadPostFilters({
        render: !hasActiveThreadPostFilters()
      });
    }
    function clearThreadPostFilters() {
      if (!hasActiveThreadPostFilters()) {
        return;
      }
      options.setActiveThreadSearchQuery("");
      options.clearActiveAuthorFilters();
      updateThreadPostFilters({ render: true });
    }
    function updateThreadPostFilters(optionsOverride = {}) {
      const hadGraphView = options.hasGraphViewOrPendingGraphView();
      if (hasActiveThreadPostFilters()) {
        options.clearGraphViewAndPageFilter();
      } else if (!options.hasPageFilter()) {
        options.setPageFilterToCurrentPage();
      }
      options.syncThreadStateUrl();
      if (hadGraphView || optionsOverride.render) {
        threadPostSearchTextById.clear();
        options.renderThreadPosts();
        options.renderThreadSummaryMenu();
        return;
      }
      const counts = applyThreadPostFilters();
      options.applyPageFilter();
      options.updateOriginalThreadPageMenus();
      renderThreadSearchPanel(counts);
      options.refreshNavigation({ reset: true });
    }
    function clearThreadFilters() {
      if (!hasActiveThreadPostFilters() && !options.hasGraphViewOrPendingGraphView()) {
        return;
      }
      options.setActiveThreadSearchQuery("");
      options.clearActiveAuthorFilters();
      options.setPageFilterToCurrentPage();
      options.clearGraphViewAndPageFilter();
      options.syncThreadStateUrl();
      options.updateOriginalThreadPageMenus();
      options.renderThreadPosts();
      options.renderThreadSummaryMenu();
    }
    function toggleAuthorFilter(author) {
      const authorKey = normalizeAuthorName(author);
      if (!authorKey) {
        return;
      }
      const activeAuthorFilters = options.getActiveAuthorFilters();
      const hadFilters = hasActiveThreadPostFilters();
      if (activeAuthorFilters.has(authorKey)) {
        activeAuthorFilters.delete(authorKey);
      } else {
        activeAuthorFilters.add(authorKey);
      }
      updateThreadPostFilters({
        render: hadFilters !== hasActiveThreadPostFilters()
      });
    }
    function applyThreadPostFilters() {
      const query2 = normalizeLayoutText(options.getActiveThreadSearchQuery());
      const loadedThreadPosts = options.getLoadedThreadPosts();
      const postById = new Map(loadedThreadPosts.map((post) => [post.id, post]));
      return applyThreadPostFiltersToRenderedPosts({
        posts: options.getPostsElement(),
        query: query2,
        activeAuthorFilters: options.getActiveAuthorFilters(),
        postById,
        getPostSearchText: getThreadPostSearchText
      });
    }
    function enhanceAuthorFilterButton2(wrapper, author) {
      enhanceAuthorFilterButton(wrapper, author, toggleAuthorFilter);
    }
    return {
      hasActiveThreadPostFilters,
      renderThreadSearchPanel,
      clearThreadPostFilters,
      clearThreadFilters,
      applyThreadPostFilters,
      enhanceAuthorFilterButton: enhanceAuthorFilterButton2
    };
  }

  // src/ui/postQuoteDom.ts
  function enhanceQuoteLinks(options) {
    for (const link of options.wrapper.querySelectorAll("a[href*='showthread.php?p='][href*='#post']")) {
      if (!(link instanceof HTMLAnchorElement)) {
        continue;
      }
      const quotedPostId = options.getQuotedPostId(link.getAttribute("href") || link.href);
      if (!quotedPostId) {
        continue;
      }
      link.dataset.fcPremiumQuoteTarget = quotedPostId;
      link.title = "Ir al mensaje citado";
      markQuoteBlock({
        link,
        quotedPostId,
        sourcePostId: options.sourcePostId,
        onReadConversation: options.onReadConversation
      });
      link.addEventListener("click", (event) => {
        const target = document.getElementById(`post${quotedPostId}`);
        if (!target) {
          return;
        }
        event.preventDefault();
        options.onOpenQuotedPost(quotedPostId);
      });
    }
  }
  function markQuoteBlock(options) {
    const quoteTable = options.link.closest("table");
    const quoteWrapper = quoteTable?.parentElement;
    if (!(quoteWrapper instanceof HTMLElement)) {
      return;
    }
    if (!(quoteTable instanceof HTMLTableElement)) {
      return;
    }
    quoteWrapper.dataset.fcPremiumQuoteBlock = options.quotedPostId;
    renderQuoteBlockActions({
      quoteWrapper,
      quoteLink: options.link,
      sourcePostId: options.sourcePostId,
      quotedPostId: options.quotedPostId,
      onReadConversation: options.onReadConversation
    });
    const quoteCell = quoteTable.querySelector("td");
    const body = Array.from(quoteCell?.children || []).find((child) => child instanceof HTMLElement && child !== options.link.parentElement && child.textContent.trim().length > 0);
    if (body instanceof HTMLElement) {
      body.dataset.fcPremiumQuoteBody = "true";
    }
  }
  function renderQuoteBlockActions(options) {
    if (!options.sourcePostId) {
      return;
    }
    options.quoteWrapper.querySelector(".fc-premium-quote-actions")?.remove();
    const targetContainer = options.quoteLink.parentElement || options.quoteWrapper;
    const actions = document.createElement("div");
    actions.className = "fc-premium-quote-actions";
    const conversationButton = document.createElement("button");
    conversationButton.type = "button";
    conversationButton.textContent = "Ver conversación";
    conversationButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      options.onReadConversation(options.sourcePostId, options.quotedPostId);
    });
    actions.append(conversationButton);
    targetContainer.append(actions);
  }

  // src/ui/postNativeDom.ts
  function getPostStatusImage(wrapper) {
    const footerRow = getPostFooterRow(wrapper);
    const image = footerRow?.querySelector("img[src*='statusicon/user_']");
    return image instanceof HTMLImageElement ? image : null;
  }
  function getPostReportLink(wrapper) {
    const footerRow = getPostFooterRow(wrapper);
    const link = footerRow?.querySelector("a[href*='report.php?p=']");
    return link instanceof HTMLAnchorElement ? link : null;
  }
  function relocatePostFooterControls(wrapper) {
    const footerRow = getPostFooterRow(wrapper);
    const existingActions = wrapper.querySelector(".fc-premium-post-reply-actions");
    const existingReplyLinks = Array.from(existingActions?.querySelectorAll("a[href*='newreply.php?do=newreply']") || []).filter((link) => link instanceof HTMLAnchorElement);
    existingActions?.remove();
    const footerReplyLinks = Array.from(footerRow?.querySelectorAll("a[href*='newreply.php?do=newreply']") || []).filter((link) => link instanceof HTMLAnchorElement);
    const replyLinks = [...footerReplyLinks, ...existingReplyLinks].filter((link) => !isQuickReplyLink(link) && isQuoteReplyLink(link));
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
  function getPostFooterRow(wrapper) {
    const footerSelector = "a[href*='report.php?p='], a[href*='newreply.php?do=newreply'], img[src*='statusicon/user_']";
    const rows = Array.from(wrapper.querySelectorAll("tr"));
    return rows.find((row) => {
      if (!(row instanceof HTMLTableRowElement)) {
        return false;
      }
      return Array.from(row.querySelectorAll(footerSelector)).some((control) => control instanceof HTMLElement && !isInsidePremiumPostUi(control));
    }) || null;
  }
  function isInsidePremiumPostUi(element) {
    return Boolean(element.closest(".fc-premium-author-hover-card, .fc-premium-post-reply-actions, .fc-premium-quote-actions"));
  }
  function isPreservedHiddenPostMenuNode(node) {
    return node instanceof HTMLElement && (node.classList.contains("vbmenu_popup") || /_menu$/.test(node.id));
  }
  function isSpacerImage(image) {
    const src = image.getAttribute("src") || "";
    return /nada\.gif|clear\.gif|spacer/i.test(src);
  }
  function isEmptyPostSeparatorTable(element) {
    if (!(element instanceof HTMLTableElement) || !element.classList.contains("cajasprin") || normalizeText(element.textContent)) {
      return false;
    }
    if (element.querySelector("a, button, input, select, textarea")) {
      return false;
    }
    return Array.from(element.querySelectorAll("img")).every((image) => image instanceof HTMLImageElement && isSpacerImage(image));
  }
  function isRemovableTrailingPostLayoutNode(node) {
    if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.COMMENT_NODE) {
      return true;
    }
    if (node instanceof HTMLBRElement) {
      return true;
    }
    return node instanceof HTMLElement && isEmptyPostSeparatorTable(node);
  }

  // src/ui/postAuthorDom.ts
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
  function getAuthorHoverLines(authorCell) {
    const lines = [];
    const seen = new Set;
    const addLine = (text) => {
      const line = normalizeText(text).replace(/\s+filtrar$/, "");
      if (!line || seen.has(line)) {
        return;
      }
      seen.add(line);
      lines.push(line);
    };
    for (const block of authorCell.querySelectorAll(".smallfont")) {
      const childDivs = Array.from(block.children).filter((child) => child instanceof HTMLDivElement);
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
  function getAuthorProfileImage(authorCell) {
    const images = Array.from(authorCell.querySelectorAll("img")).filter((image) => {
      if (!(image instanceof HTMLImageElement)) {
        return false;
      }
      const src = image.getAttribute("src") || "";
      return Boolean(src) && !/statusicon|clear\.gif|spacer|button/i.test(src);
    });
    const avatar = images.find((image) => /customavatar|avatar|profilepic|album/i.test(image.getAttribute("src") || "")) || images.find((image) => {
      const width = Number(image.getAttribute("width") || image.width || 0);
      const height = Number(image.getAttribute("height") || image.height || 0);
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
      report.title = reportLink.title || reportImage?.title || reportImage?.alt || "Reportar mensaje";
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

  // src/ui/postHeaderDom.ts
  function enhanceNativePostHeader(wrapper, post) {
    const table = wrapper.querySelector(POST_TABLE_SELECTOR);
    const postCountLink = table?.querySelector(`a[id='postcount${post.id}']`);
    const numberCell = postCountLink?.closest("td");
    const headerRow = postCountLink?.closest("tr");
    const dateCell = Array.from(headerRow?.children || []).find((cell) => cell instanceof HTMLTableCellElement && cell !== numberCell) || null;
    const authorCellElement = table?.querySelector("td[width='175'][rowspan]");
    const authorCell = authorCellElement instanceof HTMLElement ? authorCellElement : null;
    if (authorCell) {
      authorCell.classList.add("fc-premium-author-cell");
    }
    const messageCell = table?.querySelector(`#td_post_${post.id}`);
    if (messageCell instanceof HTMLElement) {
      messageCell.classList.add("fc-premium-message-cell");
    }
    if (dateCell instanceof HTMLTableCellElement && !dateCell.querySelector(".fc-premium-header-author")) {
      dateCell.classList.add("fc-premium-post-date-cell");
      dateCell.append(createHeaderAuthorMeta(post, authorCell, wrapper));
    }
    if (numberCell instanceof HTMLTableCellElement) {
      numberCell.classList.add("fc-premium-post-number-cell");
    }
    return {
      dateCell: dateCell instanceof HTMLTableCellElement ? dateCell : null,
      numberCell: numberCell instanceof HTMLTableCellElement ? numberCell : null
    };
  }

  // src/ui/postCompactLayoutDom.ts
  function updatePostCompactLayout(wrapper, compact) {
    const table = wrapper.querySelector(POST_TABLE_SELECTOR);
    if (!(table instanceof HTMLTableElement)) {
      return;
    }
    const authorCell = table.querySelector(".fc-premium-author-cell");
    const headerRow = table.rows[0] || null;
    for (const row of Array.from(table.rows)) {
      if (row === headerRow) {
        continue;
      }
      const rowHasAuthorCell = Array.from(row.cells).some((cell) => cell.classList.contains("fc-premium-author-cell"));
      const shouldExpandRow = rowHasAuthorCell || row.cells.length === 1;
      for (const cell of Array.from(row.cells)) {
        if (!(cell instanceof HTMLTableCellElement) || cell === authorCell || cell.classList.contains("fc-premium-author-cell")) {
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
  function rememberCellColSpan(cell) {
    if (!cell.dataset.fcPremiumOriginalColspan) {
      cell.dataset.fcPremiumOriginalColspan = String(cell.colSpan || 1);
    }
  }
  function applyCompactColSpan(cell) {
    rememberCellColSpan(cell);
    cell.colSpan = Math.max(cell.colSpan, 2);
  }
  function restoreOriginalColSpan(cell) {
    const original = Number(cell.dataset.fcPremiumOriginalColspan || "1");
    cell.colSpan = Number.isFinite(original) && original > 0 ? original : 1;
  }

  // src/ui/postReplyBadgeDom.ts
  function appendReplyBadge(options) {
    if (options.post.replyCount <= 0 || !options.container) {
      return;
    }
    const post = options.post;
    const wrapper = options.container.closest(".fc-premium-post-wrapper");
    if (wrapper instanceof HTMLElement) {
      wrapper.dataset.fcPremiumReplyCount = String(post.replyCount);
      wrapper.dataset.fcPremiumRank = String(options.rank);
    }
    const badge = document.createElement("span");
    badge.className = "fc-premium-reply-badge";
    badge.textContent = post.replyCount === 1 ? "1 cita" : `${post.replyCount} citas`;
    appendReplyLinks({
      badge,
      post,
      postById: options.postById,
      onJumpToPost: options.onJumpToPost,
      onShowQuotedBy: options.onShowQuotedBy
    });
    options.container.append(badge);
  }
  function appendReplyLinks(options) {
    const maxLinks = 3;
    const visibleReplyIds = options.post.replyingPostIds.slice(0, maxLinks);
    if (visibleReplyIds.length === 0) {
      return;
    }
    const label = document.createElement("span");
    label.className = "fc-premium-original-position";
    label.textContent = "·";
    options.badge.append(label);
    for (const replyingPostId of visibleReplyIds) {
      const reply = options.postById.get(replyingPostId);
      const link = document.createElement("a");
      link.href = new URL(`showthread.php?p=${replyingPostId}#post${replyingPostId}`, location.href).href;
      link.textContent = `#${reply?.postNumber || replyingPostId}`;
      link.addEventListener("click", (event) => {
        if (!document.getElementById(`post${replyingPostId}`)) {
          return;
        }
        event.preventDefault();
        options.onJumpToPost(replyingPostId);
      });
      options.badge.append(link);
      options.badge.append(document.createTextNode(" "));
    }
    if (options.post.replyingPostIds.length > visibleReplyIds.length) {
      const remaining = document.createElement("span");
      remaining.className = "fc-premium-original-position";
      remaining.textContent = ` +${options.post.replyingPostIds.length - visibleReplyIds.length}`;
      options.badge.append(remaining);
    }
    if (options.post.replyingPostIds.length > 1) {
      const quotedByButton = document.createElement("button");
      quotedByButton.type = "button";
      quotedByButton.textContent = "Ver todas";
      quotedByButton.title = "Ver citadores";
      quotedByButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        options.onShowQuotedBy(options.post.id);
      });
      options.badge.append(quotedByButton);
    }
  }

  // src/app/core/threadPostRenderer.ts
  function createThreadPostRenderer(options) {
    let lastRenderedStablePageSignature = null;
    function selectPostById(postId, selectOptions = {}) {
      const table = document.getElementById(`post${postId}`);
      const wrapper = table?.closest(".fc-premium-post-wrapper");
      if (!(wrapper instanceof HTMLElement)) {
        return;
      }
      options.selectNavigationElement(wrapper, selectOptions);
    }
    function enhanceQuoteLinks2(wrapper) {
      enhanceQuoteLinks({
        wrapper,
        sourcePostId: getPostIdFromNavigationElement(wrapper),
        getQuotedPostId,
        onOpenQuotedPost: options.jumpToLoadedPost,
        onReadConversation: (sourcePostId, quotedPostId) => {
          options.setActiveGraphView("conversation", sourcePostId, quotedPostId, {
            scrollToFirstPost: true
          });
        }
      });
    }
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
      enhanceQuoteLinks2(wrapper);
      options.enhanceAuthorFilterButton(wrapper, post.author);
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
        onJumpToPost: options.jumpToLoadedPost,
        onShowQuotedBy: (postId) => {
          options.setActiveGraphView("quoted-by", postId, null, {
            scrollToFirstReply: true
          });
        }
      });
      updatePostCompactLayout(wrapper, options.compactModeEnabled);
      return wrapper;
    }
    function getStablePageRenderSignature(optionsForSignature) {
      const activePageFilter = options.getActivePageFilter();
      if (!activePageFilter || options.getActiveGraphView() || options.hasActiveThreadPostFilters() || optionsForSignature.pendingInitialHashPostId) {
        return null;
      }
      const visiblePageSignature = optionsForSignature.viewPosts.filter((post) => post.pageNumber === activePageFilter).map((post) => [
        post.id,
        post.pageNumber,
        hashString(post.html).toString(36),
        post.isOriginalPoster ? 1 : 0
      ].join(":")).join("|");
      return `${activePageFilter}|${visiblePageSignature}`;
    }
    function renderThreadPosts(posts) {
      const postsElement = options.getPostsElement();
      if (!postsElement) {
        return;
      }
      const pendingInitialHashPostId = options.getPendingInitialHashPostId();
      const selectedPostId = pendingInitialHashPostId || getPostIdFromNavigationElement(options.getSelectedNavigationItem()?.element || undefined);
      postsElement.dataset.fcPremiumGraphView = options.getActiveGraphView()?.type || "";
      const fragment = document.createDocumentFragment();
      const postById = new Map(posts.map((post) => [post.id, post]));
      const rankByPostId = getReplyRankByPostId(posts);
      const viewPosts = options.getThreadViewPosts(posts);
      const stablePageSignature = getStablePageRenderSignature({
        pendingInitialHashPostId,
        viewPosts
      });
      if (stablePageSignature !== null && stablePageSignature === lastRenderedStablePageSignature) {
        options.renderThreadSearchPanel();
        return;
      }
      lastRenderedStablePageSignature = stablePageSignature;
      postsElement.textContent = "";
      for (const [index, post] of viewPosts.entries()) {
        fragment.append(renderPost(post, rankByPostId.get(post.id) || 0, postById, options.getReplyIndentDepth(post, index)));
      }
      postsElement.append(fragment);
      const filterCounts = options.applyThreadPostFilters();
      options.applyPageFilter();
      options.updateOriginalThreadPageMenus();
      options.renderThreadSearchPanel(filterCounts);
      options.refreshNavigation({ reset: true });
      if (selectedPostId) {
        const selectedTable = document.getElementById(`post${selectedPostId}`);
        const selectedWrapper = selectedTable?.closest(".fc-premium-post-wrapper");
        if (selectedWrapper instanceof HTMLElement && isVisible(selectedWrapper)) {
          selectPostById(selectedPostId, {
            scroll: selectedPostId === pendingInitialHashPostId,
            updateUrl: false
          });
          if (selectedPostId === pendingInitialHashPostId) {
            options.clearPendingInitialHashPostId();
          }
        }
      }
    }
    return {
      renderThreadPosts,
      selectPostById
    };
  }

  // src/app/core/threadUrlController.ts
  function createThreadUrlController(options) {
    function writeCurrentThreadStateQueryParams(url) {
      clearThreadStateQueryParams(url);
      const graphView = options.getActiveGraphView() || options.getPendingGraphView();
      if (graphView) {
        url.searchParams.set(THREAD_STATE_QUERY_PARAMS.graphType, graphView.type);
        url.searchParams.set(THREAD_STATE_QUERY_PARAMS.graphRoot, graphView.rootPostId);
        if (graphView.relatedPostId) {
          url.searchParams.set(THREAD_STATE_QUERY_PARAMS.graphRelated, graphView.relatedPostId);
        }
      }
      const searchQuery = options.getActiveThreadSearchQuery();
      if (searchQuery) {
        url.searchParams.set(THREAD_STATE_QUERY_PARAMS.searchQuery, searchQuery);
      }
      for (const author of options.getActiveAuthorFilters()) {
        url.searchParams.append(THREAD_STATE_QUERY_PARAMS.authorFilter, author);
      }
    }
    function updateBrowserHistory(url, historyMode) {
      if (historyMode === "push" && url.href !== location.href) {
        window.history.pushState(window.history.state, "", url.href);
        return;
      }
      window.history.replaceState(window.history.state, "", url.href);
    }
    function syncThreadStateUrl(syncOptions = {}) {
      if (!isThreadPage()) {
        return;
      }
      const url = new URL(location.href);
      writeCurrentThreadStateQueryParams(url);
      updateBrowserHistory(url, syncOptions.history || "replace");
    }
    function resolveCurrentThreadId() {
      return getThreadId(new URL(location.href)) || getThreadIdFromDocument(document) || options.getThreadPages().map((page) => getThreadId(new URL(page.url))).find(Boolean) || null;
    }
    function getThreadPageUrl(pageNumber, urlOptions = {}) {
      const currentUrl = new URL(location.href);
      const threadId = resolveCurrentThreadId() || "";
      const url = new URL(currentUrl.origin + currentUrl.pathname);
      if (threadId) {
        url.searchParams.set("t", threadId);
      }
      if (pageNumber > 1) {
        url.searchParams.set("page", String(pageNumber));
      }
      if (urlOptions.includeState) {
        writeCurrentThreadStateQueryParams(url);
      }
      if (urlOptions.preserveHash) {
        url.hash = location.hash;
      }
      return url;
    }
    function updateThreadPageUrl(pageNumber, updateOptions = {}) {
      const url = getThreadPageUrl(pageNumber, {
        includeState: true,
        preserveHash: updateOptions.preserveHash
      });
      updateBrowserHistory(url, updateOptions.history || "replace");
    }
    function updateSelectedPostUrl(selected) {
      const postId = getPostIdFromNavigationElement(selected.element);
      if (!postId) {
        return;
      }
      const threadId = resolveCurrentThreadId();
      if (!threadId) {
        return;
      }
      const post = options.getLoadedThreadPosts().find((item) => item.id === postId);
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
    function getThreadPagesForTotal(totalPages) {
      const pages = [];
      for (let pageNumber = 1;pageNumber <= totalPages; pageNumber += 1) {
        pages.push({ pageNumber, url: getThreadPageUrl(pageNumber).href });
      }
      return pages;
    }
    return {
      writeCurrentThreadStateQueryParams,
      syncThreadStateUrl,
      updateSelectedPostUrl,
      getThreadPagesForTotal,
      getThreadPageUrl,
      updateThreadPageUrl
    };
  }

  // src/app/core/threadPageController.ts
  function createThreadPageController() {
    const initialThreadQueryState = readThreadQueryState();
    let loadedThreadPosts = [];
    let threadPages = [];
    let loadedThreadPageNumbers = new Set;
    let threadLoadState = {
      loadedPages: 0,
      targetPages: 0,
      totalPages: 0,
      loadedPosts: 0,
      isLoading: false
    };
    let threadGraph = createEmptyThreadGraph();
    let activeGraphView = null;
    let pendingGraphView = initialThreadQueryState.graphView;
    const compactModeEnabled = true;
    let activePageFilter = initialThreadQueryState.pageFilter;
    let activeAuthorFilters = new Set(initialThreadQueryState.authorFilters);
    let activeThreadSearchQuery = initialThreadQueryState.searchQuery;
    let pendingInitialHashPostId = getLocationPostHashId();
    const threadUrlController = createThreadUrlController({
      getThreadPages: () => threadPages,
      getLoadedThreadPosts: () => loadedThreadPosts,
      getActiveGraphView: () => activeGraphView,
      getPendingGraphView: () => pendingGraphView,
      getActiveThreadSearchQuery: () => activeThreadSearchQuery,
      getActiveAuthorFilters: () => activeAuthorFilters
    });
    const syncThreadStateUrl = threadUrlController.syncThreadStateUrl;
    const getThreadPagesForTotal = threadUrlController.getThreadPagesForTotal;
    const getThreadPageUrl = threadUrlController.getThreadPageUrl;
    const updateThreadPageUrl = threadUrlController.updateThreadPageUrl;
    function getPostsElement() {
      const posts = document.querySelector(POSTS_SELECTOR);
      return posts instanceof HTMLElement ? posts : null;
    }
    const threadPageHeaderController = createThreadPageHeaderController();
    const prepareThreadPage = threadPageHeaderController.prepareThreadPage;
    const renderShortcutHelpButton2 = threadPageHeaderController.renderShortcutHelpButton;
    function collectNavigationItems() {
      return isThreadPage() ? getPostNavigationItems(getPostsElement()) : [];
    }
    const navigationController = createNavigationController({
      collectNavigationItems,
      onRenderNavigationStatus: renderNavigationStatus,
      onUpdateSelectedThreadUrl: threadUrlController.updateSelectedPostUrl,
      getPostsElement
    });
    function renderNavigationStatus(selected) {
      document.getElementById(NAVIGATION_STATUS_ID)?.remove();
    }
    const refreshNavigation = navigationController.refreshNavigation;
    const moveNavigation = navigationController.moveNavigation;
    const selectNavigationElement = navigationController.selectNavigationElement;
    const getSelectedNavigationItem = navigationController.getSelectedNavigationItem;
    const getSelectedPostWrapper2 = navigationController.getSelectedPostWrapper;
    function quoteSelectedPost(wrapper) {
      return clickPostQuoteAction(wrapper);
    }
    function toggleSelectedPostMultiquote(wrapper) {
      return togglePostMultiquote(wrapper, getPostIdFromNavigationElement(wrapper));
    }
    function openThreadReplyWithoutQuote2() {
      return openThreadReplyWithoutQuote(getThreadId(new URL(location.href)));
    }
    function returnToThreadList() {
      const link = getThreadForumListLink();
      if (!link) {
        return false;
      }
      location.assign(link.href);
      return true;
    }
    function getThreadPages() {
      const maxPage = getMaxThreadPage(document);
      return getThreadPagesForTotal(maxPage);
    }
    function ensureThreadSummary2() {
      return ensureThreadSummary(getPostsElement());
    }
    function renderThreadSummaryMenu2(summary) {
      renderThreadSummaryMenu({
        summary,
        state: threadLoadState,
        onRefreshCache: async () => {
          await clearCurrentThreadCache();
          location.reload();
        }
      });
    }
    function jumpToLoadedPost(postId) {
      const post = loadedThreadPosts.find((item) => item.id === postId);
      if (post) {
        activePageFilter = post.pageNumber;
        updateThreadPageUrl(post.pageNumber);
        updateOriginalThreadPageMenus2();
        renderThreadPosts(loadedThreadPosts);
        renderThreadSummaryMenu2(document.getElementById(THREAD_SUMMARY_ID));
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
        renderThreadSummaryMenu2(document.getElementById(THREAD_SUMMARY_ID));
      }
    });
    const applyPageFilter = threadPagePaginationController.applyPageFilter;
    const updateOriginalThreadPageMenus2 = threadPagePaginationController.updateOriginalThreadPageMenus;
    const installThreadPageNavigation = threadPagePaginationController.installThreadPageNavigation;
    const threadPageKeyboard = createThreadPageKeyboardController({
      moveNavigation,
      getActiveGraphView: () => activeGraphView,
      hasActiveThreadPostFilters: () => hasActiveThreadPostFilters(),
      openThreadReplyWithoutQuote: openThreadReplyWithoutQuote2,
      quoteSelectedPost: (wrapper) => quoteSelectedPost(wrapper),
      toggleSelectedPostMultiquote: (wrapper) => toggleSelectedPostMultiquote(wrapper),
      getSelectedPostWrapper: getSelectedPostWrapper2,
      clearThreadFilters: () => clearThreadFilters(),
      navigatePage: (direction) => threadPagePaginationController.navigatePage(direction),
      returnToThreadList
    });
    function installKeyboardNavigation() {
      window.addEventListener("keydown", threadPageKeyboard.handleNavigationKeyDown, true);
    }
    const threadPostFilterController = createThreadPostFilterController({
      getPostsElement,
      getLoadedThreadPosts: () => loadedThreadPosts,
      getThreadLoadState: () => threadLoadState,
      getActiveThreadSearchQuery: () => activeThreadSearchQuery,
      setActiveThreadSearchQuery: (query2) => {
        activeThreadSearchQuery = query2;
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
        renderThreadSummaryMenu2(document.getElementById(THREAD_SUMMARY_ID));
      },
      applyPageFilter,
      updateOriginalThreadPageMenus: updateOriginalThreadPageMenus2,
      refreshNavigation
    });
    const hasActiveThreadPostFilters = threadPostFilterController.hasActiveThreadPostFilters;
    const renderThreadSearchPanel = threadPostFilterController.renderThreadSearchPanel;
    const clearThreadPostFilters = threadPostFilterController.clearThreadPostFilters;
    const clearThreadFilters = threadPostFilterController.clearThreadFilters;
    const applyThreadPostFilters = threadPostFilterController.applyThreadPostFilters;
    const enhanceAuthorFilterButton2 = threadPostFilterController.enhanceAuthorFilterButton;
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
      setActiveThreadSearchQuery: (query2) => {
        activeThreadSearchQuery = query2;
      },
      hasActiveThreadPostFilters,
      syncThreadStateUrl,
      updateThreadPageUrl,
      updateOriginalThreadPageMenus: updateOriginalThreadPageMenus2,
      renderThreadPosts: () => renderThreadPosts(loadedThreadPosts),
      renderThreadSummaryMenu: () => {
        renderThreadSummaryMenu2(document.getElementById(THREAD_SUMMARY_ID));
      },
      selectPostById: (postId, options) => selectPostById(postId, options)
    });
    const setActiveGraphView = threadGraphViewController.setActiveGraphView;
    const activatePendingGraphView = threadGraphViewController.activatePendingGraphView;
    const applyThreadUrlState = threadGraphViewController.applyThreadUrlState;
    const installThreadHistoryNavigation = threadGraphViewController.installThreadHistoryNavigation;
    const getThreadViewPosts2 = threadGraphViewController.getThreadViewPosts;
    const getReplyIndentDepth2 = threadGraphViewController.getReplyIndentDepth;
    const threadPostRenderer = createThreadPostRenderer({
      compactModeEnabled,
      getPostsElement,
      getActiveGraphView: () => activeGraphView,
      getActivePageFilter: () => activePageFilter,
      hasActiveThreadPostFilters: () => hasActiveThreadPostFilters(),
      getPendingInitialHashPostId: () => pendingInitialHashPostId,
      clearPendingInitialHashPostId: () => {
        pendingInitialHashPostId = null;
      },
      getSelectedNavigationItem,
      getThreadViewPosts: getThreadViewPosts2,
      getReplyIndentDepth: getReplyIndentDepth2,
      applyThreadPostFilters,
      applyPageFilter,
      updateOriginalThreadPageMenus: updateOriginalThreadPageMenus2,
      renderThreadSearchPanel,
      refreshNavigation,
      selectNavigationElement,
      enhanceAuthorFilterButton: enhanceAuthorFilterButton2,
      setActiveGraphView,
      jumpToLoadedPost
    });
    const renderThreadPosts = threadPostRenderer.renderThreadPosts;
    const selectPostById = threadPostRenderer.selectPostById;
    function hydrateThreadPosts(posts) {
      applyReplyCounts(posts);
      applyOriginalPosterFlags(posts);
      loadedThreadPosts = posts.slice();
      threadGraph = buildThreadGraph(loadedThreadPosts);
      activatePendingGraphView();
    }
    async function enhanceThreadPage2() {
      await enhanceThreadPage({
        prepareThreadPage,
        ensureThreadSummary: ensureThreadSummary2,
        getThreadPages,
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
        setActiveThreadSearchQuery: (query2) => {
          activeThreadSearchQuery = query2;
        },
        setThreadLoadState: (state) => {
          threadLoadState = state;
        },
        getThreadLoadState: () => threadLoadState,
        hydrateThreadPosts,
        renderThreadPosts: () => renderThreadPosts(loadedThreadPosts),
        renderThreadSummaryMenu: renderThreadSummaryMenu2,
        renderThreadSearchPanel: () => renderThreadSearchPanel(),
        updateThreadPageUrl,
        syncThreadStateUrl
      });
    }
    async function initialize() {
      if (!isThreadPage()) {
        await cleanupThreadCache();
        return;
      }
      installKeyboardNavigation();
      prepareThreadPage();
      renderShortcutHelpButton2();
      await enhanceThreadPage2();
      installThreadPageNavigation();
      installThreadHistoryNavigation();
    }
    return {
      init: initialize,
      handleNavigationKeyDown: threadPageKeyboard.handleNavigationKeyDown,
      refreshNavigation,
      updateSummaryMenu: () => {
        renderThreadSummaryMenu2(document.getElementById(THREAD_SUMMARY_ID));
      }
    };
  }

  // src/app/core/runForocochesPremiumCore.ts
  function createDocumentReadyPromise() {
    if (document.readyState === "loading") {
      return new Promise((resolve) => {
        document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
      });
    }
    return Promise.resolve();
  }
  async function runForocochesPremium() {
    const scriptWindow = window;
    if (scriptWindow[INSTANCE_KEY] === SCRIPT_INSTANCE_VERSION) {
      return;
    }
    scriptWindow[INSTANCE_KEY] = SCRIPT_INSTANCE_VERSION;
    await createDocumentReadyPromise();
    const forumController = createForumPageController();
    const threadController = createThreadPageController();
    await Promise.all([
      forumController.init(),
      threadController.init()
    ]);
    if (!isForumDisplayPage() && !isThreadPage()) {
      return;
    }
    if (isForumDisplayPage()) {
      forumController.renderForumControlsRow();
      forumController.refreshNavigation({ reset: true });
    }
    if (isThreadPage()) {
      threadController.refreshNavigation({ reset: true });
      threadController.updateSummaryMenu();
    }
  }
  // src/index.ts
  runForocochesPremium();
})();
