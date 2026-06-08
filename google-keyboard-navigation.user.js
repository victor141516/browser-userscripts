// ==UserScript==
// @name         Google Search keyboard navigation 2
// @namespace    http://tampermonkey.net/
// @version      2026-06-08-1
// @description  bring back the keyboard navigation in Google Search
// @author       victor141516
// @match        https://www.google.com/search?q=*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=google.com
// @grant        none
// @license MIT
// @downloadURL https://update.greasyfork.org/scripts/537552/Google%20Search%20keyboard%20navigation.user.js
// @updateURL https://update.greasyfork.org/scripts/537552/Google%20Search%20keyboard%20navigation.meta.js
// ==/UserScript==

(function () {
  "use strict";

  const MARKER_ID = "google-keyboard-navigation-marker";
  const STYLE_ID = "google-keyboard-navigation-style";
  const SELECTED_ATTRIBUTE = "data-google-keyboard-navigation-selected";

  const SELECTORS = {
    root: ["#rcnt", "#search", "#rso"],
    primaryResults: "#rso",
    ignoredRegions: [
      "#searchform",
      "form[role='search']",
      "[role='navigation']",
      "#rhs",
      "#foot",
      "footer",
      "g-menu",
    ],
    aiOverview: [
      "#m-x-content",
      "[aria-label='AI Overview']",
      "[aria-label='Vista creada con IA']",
      "[aria-label='Resumen creado con IA']",
    ],
    supplementalResultOwner: ["[data-attrid*='VisualDigest']"],
    resultTitle: [
      "h3",
      "[role='heading'][aria-level='3']",
      "[role='heading'][aria-level='2']",
    ],
    semanticResultOwner: ["[data-rpos]", "[data-attrid*='VisualDigest']"],
    relatedQuestion: "[data-q]",
    mediaContent: "img, svg, [aria-hidden='true']",
    listItem: "[role='listitem']",
  };

  const AI_OVERVIEW_HEADING_PATTERNS = [
    /^AI Overview$/i,
    /^Vista creada con IA$/i,
    /^Resumen creado con IA$/i,
    /^Vista general creada con IA$/i,
  ];

  /**
   * @typedef {object} ResultCandidate
   * @property {HTMLAnchorElement} link
   * @property {HTMLElement} titleElement
   * @property {Element} owner
   * @property {string} kind
   */

  /** @type {ResultCandidate[]} */
  let candidates = [];
  let selectedIndex = -1;
  let refreshTimer = 0;
  let knownUrl = location.href;

  /**
   * @param {string | null | undefined} text
   * @returns {string}
   */
  function normalizeText(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }

  /**
   * @param {Element | null} element
   * @returns {element is HTMLElement}
   */
  function isHTMLElement(element) {
    return element instanceof HTMLElement;
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
   * @param {HTMLAnchorElement} link
   * @returns {string}
   */
  function getLinkText(link) {
    return normalizeText(
      [link.innerText, link.getAttribute("aria-label")].filter(Boolean).join(" "),
    );
  }

  /**
   * @param {HTMLAnchorElement} link
   * @returns {boolean}
   */
  function hasUsefulResultUrl(link) {
    try {
      const url = new URL(link.href, location.href);

      if (!["http:", "https:"].includes(url.protocol)) {
        return false;
      }

      if (
        url.hostname === location.hostname &&
        (url.pathname === "/search" || url.pathname.startsWith("/preferences"))
      ) {
        return false;
      }

      return true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * @param {Element} element
   * @returns {boolean}
   */
  function isInsideIgnoredRegion(element) {
    return Boolean(
      element.closest(SELECTORS.ignoredRegions.join(",")) ||
        element.closest(SELECTORS.relatedQuestion),
    );
  }

  /**
   * @returns {Element | null}
   */
  function getPrimaryResultsRoot() {
    return document.querySelector(SELECTORS.primaryResults);
  }

  /**
   * @param {Element} element
   * @returns {boolean}
   */
  function isAiOverviewHeading(element) {
    if (
      !(
        element.getAttribute("role") === "heading" ||
        /^H[1-6]$/.test(element.tagName)
      )
    ) {
      return false;
    }

    const text = normalizeText(element.textContent);

    return AI_OVERVIEW_HEADING_PATTERNS.some((pattern) => pattern.test(text));
  }

  /**
   * @param {Element} element
   * @returns {boolean}
   */
  function isInsideAiOverview(element) {
    if (element.closest(SELECTORS.aiOverview.join(","))) {
      return true;
    }

    for (
      let ancestor = element.parentElement;
      ancestor && ancestor !== document.body;
      ancestor = ancestor.parentElement
    ) {
      if (ancestor.matches(`${SELECTORS.primaryResults}, #search, #center_col`)) {
        return false;
      }

      const heading = Array.from(
        ancestor.querySelectorAll("[role='heading'], h1, h2, h3"),
      ).find(isAiOverviewHeading);

      if (heading) {
        return true;
      }
    }

    return false;
  }

  /**
   * @param {HTMLAnchorElement} link
   * @returns {boolean}
   */
  function isSupplementalResultLink(link) {
    return Boolean(link.closest(SELECTORS.supplementalResultOwner.join(",")));
  }

  /**
   * Prefer ordinary Google results from #rso, but still allow special result
   * blocks such as top video carousels when Google renders them outside #rso.
   *
   * @param {HTMLAnchorElement} link
   * @returns {boolean}
   */
  function isInsideCandidateScope(link) {
    const primaryRoot = getPrimaryResultsRoot();

    if (!primaryRoot) {
      return true;
    }

    return primaryRoot.contains(link) || isSupplementalResultLink(link);
  }

  /**
   * @returns {Element}
   */
  function getResultsRoot() {
    for (const selector of SELECTORS.root) {
      const root = document.querySelector(selector);

      if (root) {
        return root;
      }
    }

    return document.body;
  }

  /**
   * @param {HTMLAnchorElement} link
   * @returns {HTMLElement | null}
   */
  function getResultTitleElement(link) {
    const title = link.querySelector(SELECTORS.resultTitle.join(","));

    if (isHTMLElement(title)) {
      return title;
    }

    return link;
  }

  /**
   * @param {HTMLAnchorElement} link
   * @returns {boolean}
   */
  function isTitleLink(link) {
    return Boolean(link.querySelector(SELECTORS.resultTitle.join(",")));
  }

  /**
   * @param {HTMLAnchorElement} link
   * @returns {boolean}
   */
  function isVisualDigestLink(link) {
    const attr = link.getAttribute("data-attrid") || "";

    return (
      (attr.includes("VisualDigest") ||
        Boolean(link.closest("[data-attrid*='VisualDigest']"))) &&
      getLinkText(link).length >= 24
    );
  }

  /**
   * @param {HTMLAnchorElement} link
   * @returns {boolean}
   */
  function isMediaCardLink(link) {
    const rect = link.getBoundingClientRect();
    const text = getLinkText(link);

    return rect.width >= 110 && rect.height >= 45 && text.length >= 24;
  }

  /**
   * @param {HTMLAnchorElement} link
   * @returns {Element}
   */
  function getResultOwner(link) {
    return (
      link.closest(SELECTORS.semanticResultOwner.join(",")) ||
      link
    );
  }

  /**
   * Google sometimes renders same-site secondary cards as orphan list items
   * after the main result. They are useful on the page, but not top-level results.
   *
   * @param {HTMLAnchorElement} link
   * @returns {boolean}
   */
  function isUnownedListItem(link) {
    return Boolean(
      link.closest(SELECTORS.listItem) &&
        !link.closest(SELECTORS.semanticResultOwner.join(",")),
    );
  }

  /**
   * @param {HTMLAnchorElement} link
   * @returns {number}
   */
  function scoreEquivalentLink(link) {
    const text = normalizeText(link.innerText);
    let score = text.length;

    if (isTitleLink(link)) {
      score += 1000;
    }

    if (text.length >= 24 && !link.querySelector(SELECTORS.mediaContent)) {
      score += 100;
    }

    if (/^\d+:\d+$/.test(text)) {
      score -= 100;
    }

    return score;
  }

  /**
   * Prefer the text/title link over a sibling thumbnail link with the same URL.
   *
   * @param {HTMLAnchorElement} link
   * @param {Element} owner
   * @returns {HTMLAnchorElement}
   */
  function getBestEquivalentLink(link, owner) {
    const equivalents = Array.from(owner.querySelectorAll("a[href]"))
      .filter(
        (candidate) =>
          candidate instanceof HTMLAnchorElement &&
          candidate.href === link.href &&
          isVisible(candidate),
      );

    if (equivalents.length === 0) {
      return link;
    }

    equivalents.sort((a, b) => scoreEquivalentLink(b) - scoreEquivalentLink(a));

    return equivalents[0];
  }

  /**
   * @param {HTMLAnchorElement} link
   * @returns {"" | "title" | "visual" | "media"}
   */
  function getCandidateKind(link) {
    if (isTitleLink(link)) {
      return "title";
    }

    if (isVisualDigestLink(link)) {
      return "visual";
    }

    if (isMediaCardLink(link)) {
      return "media";
    }

    return "";
  }

  /**
   * @param {Element} element
   * @param {Map<Element, number>} elementIds
   * @returns {string}
   */
  function getOwnerKey(element, elementIds) {
    const stableKey =
      element.getAttribute("data-rpos") ||
      element.getAttribute("data-attrid") ||
      "";

    if (stableKey) {
      return stableKey;
    }

    if (!elementIds.has(element)) {
      elementIds.set(element, elementIds.size + 1);
    }

    return String(elementIds.get(element));
  }

  /**
   * @returns {ResultCandidate[]}
   */
  function collectResultCandidates() {
    const root = getResultsRoot();
    const titleOwners = new Set();
    const seenLinkOwners = new Set();
    const seenLinkRows = new Set();
    const elementIds = new Map();
    /** @type {ResultCandidate[]} */
    const results = [];

    for (const rawLink of root.querySelectorAll("a[href]")) {
      if (!(rawLink instanceof HTMLAnchorElement)) {
        continue;
      }

      if (
        !isVisible(rawLink) ||
        isInsideIgnoredRegion(rawLink) ||
        isInsideAiOverview(rawLink) ||
        !isInsideCandidateScope(rawLink) ||
        isUnownedListItem(rawLink) ||
        !hasUsefulResultUrl(rawLink)
      ) {
        continue;
      }

      const kind = getCandidateKind(rawLink);

      if (!kind) {
        continue;
      }

      const owner = getResultOwner(rawLink);

      if (kind === "title") {
        if (titleOwners.has(owner)) {
          continue;
        }

        titleOwners.add(owner);
      }

      const link = getBestEquivalentLink(rawLink, owner);
      const linkRect = link.getBoundingClientRect();
      const ownerKey = getOwnerKey(owner, elementIds);
      const linkOwnerKey = `${link.href}|${ownerKey}`;
      const linkRowKey = `${link.href}|${Math.round(linkRect.top)}`;

      if (seenLinkOwners.has(linkOwnerKey) || seenLinkRows.has(linkRowKey)) {
        continue;
      }

      seenLinkOwners.add(linkOwnerKey);
      seenLinkRows.add(linkRowKey);
      results.push({
        link,
        titleElement: getResultTitleElement(link) || link,
        owner,
        kind,
      });
    }

    return results.sort(
      (a, b) =>
        a.link.getBoundingClientRect().top - b.link.getBoundingClientRect().top,
    );
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${MARKER_ID} {
        border-bottom: 7px solid transparent;
        border-left: 11px solid #1a73e8;
        border-top: 7px solid transparent;
        display: none;
        height: 0;
        left: 0;
        pointer-events: none;
        position: fixed;
        top: 0;
        width: 0;
        z-index: 2147483647;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * @returns {HTMLElement}
   */
  function ensureMarker() {
    ensureStyle();

    const existing = document.getElementById(MARKER_ID);

    if (isHTMLElement(existing)) {
      return existing;
    }

    const marker = document.createElement("div");
    marker.id = MARKER_ID;
    marker.setAttribute("aria-hidden", "true");
    document.body.appendChild(marker);

    return marker;
  }

  function clearSelectedAttributes() {
    for (const element of document.querySelectorAll(`[${SELECTED_ATTRIBUTE}]`)) {
      element.removeAttribute(SELECTED_ATTRIBUTE);
      element.removeAttribute("aria-current");
    }
  }

  function positionMarker() {
    const selected = candidates[selectedIndex];
    const marker = ensureMarker();

    if (!selected || !document.contains(selected.link)) {
      marker.style.display = "none";
      return;
    }

    const rect = selected.titleElement.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      marker.style.display = "none";
      return;
    }

    marker.style.display = "block";
    marker.style.left = `${Math.max(4, rect.left - 20)}px`;
    marker.style.top = `${Math.max(4, rect.top + Math.min(rect.height, 28) / 2 - 7)}px`;
  }

  /**
   * @param {{ scroll?: boolean }} [options]
   */
  function renderSelection(options = {}) {
    clearSelectedAttributes();

    const selected = candidates[selectedIndex];

    if (!selected) {
      ensureMarker().style.display = "none";
      return;
    }

    selected.link.setAttribute(SELECTED_ATTRIBUTE, "true");
    selected.link.setAttribute("aria-current", "true");

    if (options.scroll) {
      scrollSelectedIntoView(selected);
    }

    positionMarker();
    requestAnimationFrame(positionMarker);
  }

  /**
   * @param {ResultCandidate} selected
   */
  function scrollSelectedIntoView(selected) {
    const rect = selected.titleElement.getBoundingClientRect();
    const margin = 80;

    if (rect.top < margin) {
      window.scrollBy({
        behavior: "smooth",
        top: rect.top - margin,
      });
    } else if (rect.bottom > window.innerHeight - margin) {
      window.scrollBy({
        behavior: "smooth",
        top: rect.bottom - (window.innerHeight - margin),
      });
    }
  }

  /**
   * @param {{ reset?: boolean }} [options]
   */
  function refreshCandidates(options = {}) {
    const previous = candidates[selectedIndex];
    candidates = collectResultCandidates();

    if (candidates.length === 0) {
      selectedIndex = -1;
      renderSelection();
      return;
    }

    if (options.reset || !previous) {
      selectedIndex = 0;
    } else {
      const matchingIndex = candidates.findIndex(
        (candidate) =>
          candidate.link === previous.link ||
          candidate.link.href === previous.link.href,
      );

      selectedIndex = matchingIndex >= 0 ? matchingIndex : 0;
    }

    renderSelection();
  }

  /**
   * @param {{ reset?: boolean }} [options]
   */
  function queueRefresh(options = {}) {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => refreshCandidates(options), 100);
  }

  /**
   * @param {number} direction
   */
  function moveSelection(direction) {
    if (candidates.length === 0) {
      refreshCandidates({ reset: true });
    }

    if (candidates.length === 0) {
      return;
    }

    selectedIndex = Math.max(
      0,
      Math.min(candidates.length - 1, selectedIndex + direction),
    );

    renderSelection({ scroll: true });
  }

  function openSelectedResult() {
    const selected = candidates[selectedIndex];

    if (!selected) {
      return;
    }

    selected.link.click();
  }

  /**
   * @param {EventTarget | null} target
   * @returns {boolean}
   */
  function isEditableTarget(target) {
    if (!(target instanceof Element)) {
      return false;
    }

    return Boolean(
      target.closest(
        "input, textarea, select, [contenteditable=''], [contenteditable='true']",
      ),
    );
  }

  /**
   * @param {KeyboardEvent} event
   * @returns {boolean}
   */
  function shouldHandleKey(event) {
    return (
      !event.defaultPrevented &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.isComposing &&
      ["ArrowDown", "ArrowUp", "Enter"].includes(event.key) &&
      !isEditableTarget(event.target)
    );
  }

  /**
   * @param {KeyboardEvent} event
   */
  function handleKeydown(event) {
    if (!shouldHandleKey(event)) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(-1);
      return;
    }

    event.preventDefault();
    openSelectedResult();
  }

  function observeResults() {
    const observer = new MutationObserver(() => {
      const reset = knownUrl !== location.href;
      knownUrl = location.href;
      queueRefresh({ reset });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function init() {
    ensureMarker();
    refreshCandidates({ reset: true });
    observeResults();
    document.addEventListener("keydown", handleKeydown, true);
    window.addEventListener("scroll", positionMarker, { passive: true });
    window.addEventListener("resize", positionMarker);
    window.addEventListener("pageshow", () => queueRefresh({ reset: true }));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
