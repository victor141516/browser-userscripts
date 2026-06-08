// ==UserScript==
// @name         Google Search keyboard navigation 2
// @namespace    http://tampermonkey.net/
// @version      2026-06-08-5
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

  const LEGACY_MARKER_ID = "google-keyboard-navigation-marker";
  const INSTANCE_ABORT_KEY = "__googleKeyboardNavigationAbortController";
  const STYLE_ID = "google-keyboard-navigation-style";
  const SELECTED_ATTRIBUTE = "data-google-keyboard-navigation-selected";
  const ANIMATING_RESULT_ATTRIBUTE =
    "data-google-keyboard-navigation-animating-result";
  const SELECTED_RESULT_ATTRIBUTE =
    "data-google-keyboard-navigation-selected-result";
  const SELECTION_ANIMATION_MS = 180;

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

  /**
   * @typedef {object} CandidateMatch
   * @property {HTMLAnchorElement} link
   * @property {Element} owner
   * @property {string} href
   * @property {string} text
   * @property {string} ownerText
   * @property {number} linkTop
   * @property {number} ownerTop
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
   * @param {Element} element
   * @returns {number}
   */
  function getDocumentTop(element) {
    return element.getBoundingClientRect().top + window.scrollY;
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

    if (element.closest(SELECTORS.primaryResults)) {
      return false;
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
   * @returns {boolean}
   */
  function isNestedSitelink(link) {
    return Boolean(link.closest("table, td, th"));
  }

  /**
   * @param {Element} element
   * @returns {HTMLAnchorElement[]}
   */
  function getVisibleTitleLinks(element) {
    /** @type {HTMLAnchorElement[]} */
    const links = [];

    if (element instanceof HTMLAnchorElement) {
      links.push(element);
    }

    links.push(...Array.from(element.querySelectorAll("a[href]")));

    return links.filter(
      (link, index, allLinks) =>
        link instanceof HTMLAnchorElement &&
        allLinks.indexOf(link) === index &&
        isVisible(link) &&
        isTitleLink(link) &&
        hasUsefulResultUrl(link),
    );
  }

  /**
   * Some Google modules, such as video and recipe groups, put several real
   * results under one data-rpos owner. Split those into per-card owners while
   * leaving table-based sitelinks attached to their main result.
   *
   * @param {HTMLAnchorElement} link
   * @param {Element} semanticOwner
   * @returns {Element}
   */
  function getCandidateOwner(link, semanticOwner) {
    if (
      isNestedSitelink(link) ||
      getVisibleTitleLinks(semanticOwner).length <= 1
    ) {
      return semanticOwner;
    }

    let cardOwner = null;

    for (
      let element = link;
      element && element !== semanticOwner;
      element = element.parentElement
    ) {
      if (!isVisible(element)) {
        continue;
      }

      const titleLinks = getVisibleTitleLinks(element);

      if (titleLinks.length === 1 && titleLinks[0] === link) {
        cardOwner = element;
      }
    }

    return cardOwner || semanticOwner;
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
   * @param {ResultCandidate} candidate
   * @returns {CandidateMatch}
   */
  function getCandidateMatch(candidate) {
    return {
      link: candidate.link,
      owner: candidate.owner,
      href: candidate.link.href,
      text: getLinkText(candidate.link),
      ownerText: normalizeText(candidate.owner.textContent).slice(0, 200),
      linkTop: Math.round(getDocumentTop(candidate.link)),
      ownerTop: Math.round(getDocumentTop(candidate.owner)),
    };
  }

  /**
   * @param {ResultCandidate} candidate
   * @param {CandidateMatch} previous
   * @returns {boolean}
   */
  function isSameCandidate(candidate, previous) {
    if (candidate.link === previous.link || candidate.owner === previous.owner) {
      return true;
    }

    if (candidate.link.href !== previous.href) {
      return false;
    }

    const linkTop = Math.round(getDocumentTop(candidate.link));
    const ownerTop = Math.round(getDocumentTop(candidate.owner));
    const text = getLinkText(candidate.link);
    const ownerText = normalizeText(candidate.owner.textContent).slice(0, 200);

    return (
      (text === previous.text && Math.abs(linkTop - previous.linkTop) <= 4) ||
      (ownerText === previous.ownerText &&
        Math.abs(ownerTop - previous.ownerTop) <= 4)
    );
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

      const semanticOwner = getResultOwner(rawLink);
      const owner = getCandidateOwner(rawLink, semanticOwner);

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
      [${ANIMATING_RESULT_ATTRIBUTE}],
      [${SELECTED_RESULT_ATTRIBUTE}] {
        border-radius: 8px !important;
        transform-origin: center center !important;
        transition:
          outline-offset 180ms ease,
          transform 180ms ease !important;
      }

      [${ANIMATING_RESULT_ATTRIBUTE}]:not([${SELECTED_RESULT_ATTRIBUTE}]) {
        transform: scale(1) !important;
      }

      [${SELECTED_RESULT_ATTRIBUTE}] {
        outline: 2px solid #1a73e8 !important;
        outline-offset: 5px !important;
        transform: scale(1.01) !important;
      }
    `;

    document.head.appendChild(style);
  }

  function removeLegacyMarker() {
    document.getElementById(LEGACY_MARKER_ID)?.remove();
  }

  function clearSelectedAttributes() {
    for (const element of document.querySelectorAll(`[${SELECTED_ATTRIBUTE}]`)) {
      element.removeAttribute(SELECTED_ATTRIBUTE);
      element.removeAttribute("aria-current");
    }

    for (
      const element of document.querySelectorAll(`[${SELECTED_RESULT_ATTRIBUTE}]`)
    ) {
      element.removeAttribute(SELECTED_RESULT_ATTRIBUTE);
      element.setAttribute(ANIMATING_RESULT_ATTRIBUTE, "true");

      window.setTimeout(() => {
        if (!element.hasAttribute(SELECTED_RESULT_ATTRIBUTE)) {
          element.removeAttribute(ANIMATING_RESULT_ATTRIBUTE);
        }
      }, SELECTION_ANIMATION_MS);
    }
  }

  /**
   * @param {{ scroll?: boolean }} [options]
   */
  function renderSelection(options = {}) {
    clearSelectedAttributes();

    const selected = candidates[selectedIndex];

    if (!selected) {
      return;
    }

    selected.link.setAttribute(SELECTED_ATTRIBUTE, "true");
    selected.link.setAttribute("aria-current", "true");
    selected.owner.setAttribute(ANIMATING_RESULT_ATTRIBUTE, "true");
    selected.owner.setAttribute(SELECTED_RESULT_ATTRIBUTE, "true");

    if (options.scroll) {
      scrollSelectedIntoView(selected);
    }
  }

  /**
   * @param {ResultCandidate} selected
   * @returns {Element}
   */
  function getSelectionFrameElement(selected) {
    return isVisible(selected.owner) ? selected.owner : selected.titleElement;
  }

  /**
   * @param {ResultCandidate} selected
   */
  function scrollSelectedIntoView(selected) {
    const rect = getSelectionFrameElement(selected).getBoundingClientRect();
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
    const previousMatch = previous ? getCandidateMatch(previous) : null;
    candidates = collectResultCandidates();

    if (candidates.length === 0) {
      selectedIndex = -1;
      renderSelection();
      return;
    }

    if (options.reset || !previous) {
      selectedIndex = 0;
    } else {
      const matchingIndex = previousMatch
        ? candidates.findIndex((candidate) =>
            isSameCandidate(candidate, previousMatch),
          )
        : -1;

      selectedIndex =
        matchingIndex >= 0
          ? matchingIndex
          : candidates.findIndex(
              (candidate) => candidate.link.href === previous.link.href,
            );

      if (selectedIndex < 0) {
        selectedIndex = 0;
      }
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
    refreshCandidates({ reset: candidates.length === 0 });

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
    refreshCandidates({ reset: candidates.length === 0 });

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

    event.preventDefault();
    event.stopImmediatePropagation();

    if (event.key === "ArrowDown") {
      moveSelection(1);
      return;
    }

    if (event.key === "ArrowUp") {
      moveSelection(-1);
      return;
    }

    openSelectedResult();
  }

  /**
   * @param {AbortSignal} signal
   */
  function observeResults(signal) {
    const observer = new MutationObserver(() => {
      const reset = knownUrl !== location.href;
      knownUrl = location.href;
      queueRefresh({ reset });
    });

    signal.addEventListener("abort", () => observer.disconnect(), {
      once: true,
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function init() {
    const existingController = window[INSTANCE_ABORT_KEY];

    if (existingController instanceof AbortController) {
      existingController.abort();
    }

    const controller = new AbortController();
    window[INSTANCE_ABORT_KEY] = controller;

    removeLegacyMarker();
    ensureStyle();
    refreshCandidates({ reset: true });
    observeResults(controller.signal);
    window.addEventListener("keydown", handleKeydown, {
      capture: true,
      signal: controller.signal,
    });
    window.addEventListener("pageshow", () => queueRefresh({ reset: true }), {
      signal: controller.signal,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
