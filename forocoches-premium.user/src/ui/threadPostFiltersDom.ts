import {
  HIDDEN_POST_FILTER_ATTRIBUTE,
  HIDDEN_POST_PAGE_ATTRIBUTE,
  POST_TABLE_SELECTOR,
} from "../config/constants";
import type { PostRecord } from "../domain/types";
import { normalizeAuthorName } from "../shared/dom";
import type { ThreadSearchCounts } from "./threadSearchPanelDom";

export function applyPageFilterToRenderedPosts(
  posts: HTMLElement | null,
  activePageFilter: number | null,
): ThreadSearchCounts {
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

export function applyThreadPostFiltersToRenderedPosts(options: {
  posts: HTMLElement | null;
  query: string;
  activeAuthorFilters: Set<string>;
  postById: Map<string, PostRecord>;
  getPostSearchText: (post: PostRecord) => string;
}): ThreadSearchCounts {
  let total = 0;
  let visible = 0;

  if (!options.posts) {
    return { total, visible };
  }

  for (const wrapper of getRenderedPostWrappers(options.posts)) {
    const authorKey = wrapper.dataset.fcPremiumAuthor || "";
    const postId = getPostIdFromWrapper(wrapper);
    const post = postId ? options.postById.get(postId) : null;
    const matchesAuthor =
      options.activeAuthorFilters.size === 0 ||
      options.activeAuthorFilters.has(authorKey);
    const matchesText =
      !options.query ||
      (post ? options.getPostSearchText(post).includes(options.query) : false);
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

export function enhanceAuthorFilterButton(
  wrapper: HTMLElement,
  author: string,
  onToggleAuthor: (author: string) => void,
): void {
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
    onToggleAuthor(author);
  });
  username.after(button);
}

function getRenderedPostWrappers(posts: HTMLElement): HTMLElement[] {
  return Array.from(posts.querySelectorAll(".fc-premium-post-wrapper")).filter(
    (wrapper): wrapper is HTMLElement => wrapper instanceof HTMLElement,
  );
}

function getPostIdFromWrapper(wrapper: HTMLElement): string | null {
  const postTable = wrapper.querySelector(POST_TABLE_SELECTOR);
  const postId = postTable?.id.match(/^post(\d+)$/)?.[1];

  return postId || null;
}
