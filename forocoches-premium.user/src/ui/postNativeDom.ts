import { POST_TABLE_SELECTOR } from "../config/constants";
import { normalizeText } from "../shared/dom";
import {
  isQuickReplyLink,
  isQuoteReplyLink,
} from "../adapters/forocoches/postReplyActions";

export function getPostStatusImage(
  wrapper: HTMLElement,
): HTMLImageElement | null {
  const footerRow = getPostFooterRow(wrapper);
  const image = footerRow?.querySelector("img[src*='statusicon/user_']");

  return image instanceof HTMLImageElement ? image : null;
}

export function getPostReportLink(
  wrapper: HTMLElement,
): HTMLAnchorElement | null {
  const footerRow = getPostFooterRow(wrapper);
  const link = footerRow?.querySelector("a[href*='report.php?p=']");

  return link instanceof HTMLAnchorElement ? link : null;
}

export function relocatePostFooterControls(wrapper: HTMLElement): void {
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

export function removeTrailingPostLayoutArtifacts(
  wrapper: HTMLElement,
): void {
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

function getPostFooterRow(wrapper: HTMLElement): HTMLTableRowElement | null {
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

function isInsidePremiumPostUi(element: HTMLElement): boolean {
  return Boolean(
    element.closest(
      ".fc-premium-author-hover-card, .fc-premium-post-reply-actions, .fc-premium-quote-actions",
    ),
  );
}

function isPreservedHiddenPostMenuNode(node: Node): boolean {
  return (
    node instanceof HTMLElement &&
    (node.classList.contains("vbmenu_popup") || /_menu$/.test(node.id))
  );
}

function isSpacerImage(image: HTMLImageElement): boolean {
  const src = image.getAttribute("src") || "";
  return /nada\.gif|clear\.gif|spacer/i.test(src);
}

function isEmptyPostSeparatorTable(element: HTMLElement): boolean {
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

function isRemovableTrailingPostLayoutNode(node: Node): boolean {
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
