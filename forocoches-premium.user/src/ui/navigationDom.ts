import {
  POST_TABLE_SELECTOR,
  SELECTED_ATTRIBUTE,
  THREAD_TITLE_SELECTOR,
} from "../config/constants";
import type { NavigationItem } from "../domain/types";
import { isVisible } from "../shared/dom";

const THREAD_NAVIGATION_TOP_OFFSET_RATIO = 0.15;

export function getThreadTitleNavigationItems(): NavigationItem[] {
  const items: NavigationItem[] = [];

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

export function getPostNavigationItems(posts: HTMLElement | null): NavigationItem[] {
  if (!posts) {
    return [];
  }

  const items: NavigationItem[] = [];

  for (const wrapper of posts.querySelectorAll(".fc-premium-post-wrapper")) {
    if (!(wrapper instanceof HTMLElement) || !isVisible(wrapper)) {
      continue;
    }

    const postId = getPostIdFromNavigationElement(wrapper);
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

export function clearNavigationSelection(): void {
  for (const selected of document.querySelectorAll(
    `[${SELECTED_ATTRIBUTE}]`,
  )) {
    selected.removeAttribute(SELECTED_ATTRIBUTE);
  }
}

export function markNavigationItemSelected(item: NavigationItem): void {
  item.element.setAttribute(SELECTED_ATTRIBUTE, "true");
}

export function scrollNavigationElementIntoView(
  element: HTMLElement,
  block: ScrollLogicalPosition,
): void {
  if (block === "start") {
    scrollElementToViewportOffset(element, THREAD_NAVIGATION_TOP_OFFSET_RATIO);
    return;
  }

  element.scrollIntoView({
    behavior: "smooth",
    block,
  });
}

function scrollElementToViewportOffset(
  element: HTMLElement,
  offsetRatio: number,
): void {
  const targetTop =
    element.getBoundingClientRect().top +
    window.scrollY -
    window.innerHeight * offsetRatio;

  window.scrollTo({
    top: Math.max(0, targetTop),
    behavior: "smooth",
  });
}

export function getPostIdFromNavigationElement(
  element: HTMLElement | undefined,
): string | null {
  if (!(element instanceof HTMLElement)) {
    return null;
  }

  const postTable = element.querySelector(POST_TABLE_SELECTOR);
  const postId = postTable?.id.match(/^post(\d+)$/)?.[1];

  return postId || null;
}

export function getSelectedPostWrapper(): HTMLElement | null {
  const marked = document.querySelector(
    `.fc-premium-post-wrapper[${SELECTED_ATTRIBUTE}]`,
  );

  return marked instanceof HTMLElement ? marked : null;
}

function getThreadNavigationOwner(link: HTMLAnchorElement): HTMLElement {
  const row = link.closest("tr");

  if (row instanceof HTMLElement) {
    return row;
  }

  return link;
}
