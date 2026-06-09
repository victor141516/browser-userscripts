import {
  THREAD_SEARCH_AUTHOR_DATALIST_ID,
  THREAD_SEARCH_EMPTY_ID,
  THREAD_SEARCH_SELECTED_AUTHORS_ID,
  THREAD_SEARCH_STATUS_ID,
  THREAD_SEARCH_TEXT_INPUT_ID,
} from "../config/constants";
import { getThreadAuthorOptionLabel } from "../domain/threadAuthors";
import type { ThreadAuthorOption, ThreadLoadState } from "../domain/types";
import { isVisible } from "../shared/dom";

export interface ThreadSearchCounts {
  total: number;
  visible: number;
}

export function syncThreadSearchTextInput(searchQuery: string): void {
  const textInput = document.getElementById(THREAD_SEARCH_TEXT_INPUT_ID);

  if (
    textInput instanceof HTMLInputElement &&
    document.activeElement !== textInput
  ) {
    textInput.value = searchQuery;
  }
}

export function refreshThreadAuthorDatalist(
  options: ThreadAuthorOption[],
  activeAuthorFilters: Set<string>,
): void {
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

export function refreshSelectedThreadAuthors(
  authorKeys: Iterable<string>,
  authorOptions: ThreadAuthorOption[],
  onRemoveAuthor: (authorKey: string) => void,
): void {
  const container = document.getElementById(
    THREAD_SEARCH_SELECTED_AUTHORS_ID,
  );

  if (!(container instanceof HTMLElement)) {
    return;
  }

  container.textContent = "";

  for (const authorKey of authorKeys) {
    const option =
      authorOptions.find((candidate) => candidate.key === authorKey) || null;
    const chip = document.createElement("span");
    chip.className = "fc-premium-thread-author-chip";
    chip.textContent = option
      ? getThreadAuthorOptionLabel(option)
      : authorKey;

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

export function renderThreadSearchStatus(options: {
  counts?: ThreadSearchCounts;
  totalPosts: number;
  threadLoadState: ThreadLoadState;
  hasActiveFilters: boolean;
}): void {
  const status = document.getElementById(THREAD_SEARCH_STATUS_ID);

  if (!(status instanceof HTMLElement)) {
    return;
  }

  const total = options.counts?.total ?? options.totalPosts;
  const visible =
    options.counts?.visible ?? getVisibleThreadSearchPostWrapperCount();
  const loading = options.threadLoadState.isLoading
    ? ` · cargando ${options.threadLoadState.loadedPages}/${options.threadLoadState.targetPages}`
    : "";

  status.textContent = options.hasActiveFilters
    ? `${visible}/${total} mensajes${loading}`
    : `${total} mensajes${loading}`;
}

export function renderThreadSearchEmptyState(options: {
  posts: HTMLElement | null;
  counts?: ThreadSearchCounts;
  isLoading: boolean;
  hasActiveFilters: boolean;
}): void {
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

  empty.textContent = options.isLoading
    ? "No hay mensajes cargados que coincidan con estos filtros."
    : "No hay mensajes que coincidan con estos filtros.";
  empty.hidden = !(
    options.hasActiveFilters && (options.counts?.visible ?? 0) === 0
  );
}

function getVisibleThreadSearchPostWrapperCount(): number {
  return Array.from(
    document.querySelectorAll(".fc-premium-post-wrapper"),
  ).filter((wrapper) => wrapper instanceof HTMLElement && isVisible(wrapper))
    .length;
}
