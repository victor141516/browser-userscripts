import { ThreadSearchPanel } from "../../ui/components/ThreadSearchPanel";
import {
  refreshSelectedThreadAuthors as refreshSelectedThreadAuthorsInDom,
  refreshThreadAuthorDatalist as refreshThreadAuthorDatalistInDom,
  renderThreadSearchEmptyState as renderThreadSearchEmptyStateInDom,
  renderThreadSearchStatus as renderThreadSearchStatusInDom,
  syncThreadSearchTextInput,
  type ThreadSearchCounts,
} from "../../ui/threadSearchPanelDom";
import {
  applyThreadPostFiltersToRenderedPosts,
  enhanceAuthorFilterButton as enhanceAuthorFilterButtonInDom,
} from "../../ui/threadPostFiltersDom";
import {
  THREAD_SEARCH_AUTHOR_INPUT_ID,
  THREAD_SEARCH_PANEL_ID,
} from "../../config/constants";
import type {
  PostRecord,
  ThreadAuthorOption,
  ThreadLoadState,
} from "../../domain/types";
import {
  getThreadAuthorOptions as buildThreadAuthorOptions,
  resolveThreadAuthorInputValue as resolveThreadAuthorInputValueFromOptions,
} from "../../domain/threadAuthors";
import {
  normalizeAuthorName,
  normalizeLayoutText,
  normalizeText,
  toUrl,
} from "../../shared/dom";
import { parseHtml } from "../../adapters/forocoches/threadParser";

export interface ThreadPostFilterControllerOptions {
  getPostsElement: () => HTMLElement | null;
  getLoadedThreadPosts: () => PostRecord[];
  getThreadLoadState: () => ThreadLoadState;
  getActiveThreadSearchQuery: () => string;
  setActiveThreadSearchQuery: (query: string) => void;
  getActiveAuthorFilters: () => Set<string>;
  clearActiveAuthorFilters: () => void;
  setPageFilterToCurrentPage: () => void;
  hasPageFilter: () => boolean;
  hasGraphViewOrPendingGraphView: () => boolean;
  clearGraphViewAndPageFilter: () => void;
  syncThreadStateUrl: () => void;
  renderThreadPosts: () => void;
  renderThreadSummaryMenu: () => void;
  applyPageFilter: () => { total: number; visible: number };
  updateOriginalThreadPageMenus: () => void;
  refreshNavigation: (options?: { reset?: boolean }) => void;
}

export interface ThreadPostFilterController {
  hasActiveThreadPostFilters(): boolean;
  renderThreadSearchPanel(counts?: ThreadSearchCounts): void;
  clearThreadPostFilters(): void;
  clearThreadFilters(): void;
  applyThreadPostFilters(): { total: number; visible: number };
  enhanceAuthorFilterButton(wrapper: HTMLElement, author: string): void;
}

export function createThreadPostFilterController(
  options: ThreadPostFilterControllerOptions,
): ThreadPostFilterController {
  const threadPostSearchTextById = new Map<string, string>();

  function getAuthenticatedUsername(): string {
    const profileLink = Array.from(
      document.querySelectorAll("a[href*='member.php?u=']"),
    ).find(
      (link) =>
        link instanceof HTMLAnchorElement &&
        normalizeText(link.textContent) === "Tu Perfil",
    );
    const profileUserId =
      profileLink instanceof HTMLAnchorElement
        ? toUrl(profileLink.href)?.searchParams.get("u") || ""
        : "";

    if (profileUserId) {
      const usernameLink = Array.from(
        document.querySelectorAll("a[href*='member.php?u=']"),
      ).find((link) => {
        if (!(link instanceof HTMLAnchorElement)) {
          return false;
        }

        const text = normalizeText(link.textContent);
        return (
          text &&
          text !== "Tu Perfil" &&
          toUrl(link.href)?.searchParams.get("u") === profileUserId
        );
      });

      if (usernameLink instanceof HTMLAnchorElement) {
        return normalizeText(usernameLink.textContent);
      }
    }

    return normalizeText(
      document.querySelector("#navbar_username")?.textContent,
    );
  }

  function getThreadAuthorOptions(
    posts: PostRecord[] = options.getLoadedThreadPosts(),
  ): ThreadAuthorOption[] {
    return buildThreadAuthorOptions(posts, getAuthenticatedUsername());
  }

  function resolveThreadAuthorInputValue(value: string): string | null {
    return resolveThreadAuthorInputValueFromOptions(
      value,
      getThreadAuthorOptions(),
    );
  }

  function getThreadPostSearchText(post: PostRecord): string {
    const cached = threadPostSearchTextById.get(post.id);

    if (cached !== undefined) {
      return cached;
    }

    const doc = parseHtml(post.html);
    const message =
      doc.getElementById(`post_message_${post.id}`) || doc.body || null;
    const text = normalizeLayoutText(message?.textContent || "");
    threadPostSearchTextById.set(post.id, text);
    return text;
  }

  function hasActiveThreadPostFilters(): boolean {
    return Boolean(options.getActiveThreadSearchQuery()) ||
      options.getActiveAuthorFilters().size > 0;
  }

  function ensureThreadSearchPanel(): HTMLTableElement | null {
    const existing = document.getElementById(THREAD_SEARCH_PANEL_ID);

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
      onClearFilters: clearThreadPostFilters,
    });

    posts.before(panel);
    return panel;
  }

  function refreshThreadAuthorDatalist() {
    refreshThreadAuthorDatalistInDom(
      getThreadAuthorOptions(),
      options.getActiveAuthorFilters(),
    );
  }

  function refreshSelectedThreadAuthors() {
    refreshSelectedThreadAuthorsInDom(
      options.getActiveAuthorFilters(),
      getThreadAuthorOptions(),
      removeThreadAuthorFilter,
    );
  }

  function renderThreadSearchStatus(counts?: ThreadSearchCounts) {
    renderThreadSearchStatusInDom({
      counts,
      totalPosts: options.getLoadedThreadPosts().length,
      threadLoadState: options.getThreadLoadState(),
      hasActiveFilters: hasActiveThreadPostFilters(),
    });
  }

  function renderThreadSearchEmptyState(counts?: ThreadSearchCounts) {
    renderThreadSearchEmptyStateInDom({
      posts: options.getPostsElement(),
      counts,
      isLoading: options.getThreadLoadState().isLoading,
      hasActiveFilters: hasActiveThreadPostFilters(),
    });
  }

  function renderThreadSearchPanel(counts?: ThreadSearchCounts): void {
    const panel = ensureThreadSearchPanel();

    if (!panel) {
      return;
    }

    syncThreadSearchTextInput(options.getActiveThreadSearchQuery());
    refreshThreadAuthorDatalist();
    refreshSelectedThreadAuthors();
    renderThreadSearchStatus(counts);
    renderThreadSearchEmptyState(counts);
  }

  function setThreadSearchQuery(query: string) {
    const hadFilters = hasActiveThreadPostFilters();
    const nextQuery = normalizeText(query);

    if (options.getActiveThreadSearchQuery() === nextQuery) {
      return;
    }

    options.setActiveThreadSearchQuery(nextQuery);
    updateThreadPostFilters({
      render: hadFilters !== hasActiveThreadPostFilters(),
    });
  }

  function addThreadAuthorFilter(authorKey: string) {
    const activeAuthorFilters = options.getActiveAuthorFilters();

    if (!authorKey || activeAuthorFilters.has(authorKey)) {
      return;
    }

    const hadFilters = hasActiveThreadPostFilters();
    activeAuthorFilters.add(authorKey);
    updateThreadPostFilters({
      render: hadFilters !== hasActiveThreadPostFilters(),
    });
  }

  function addThreadAuthorFilterFromInput() {
    const input = document.getElementById(THREAD_SEARCH_AUTHOR_INPUT_ID);

    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const authorKey = resolveThreadAuthorInputValue(input.value);

    if (!authorKey) {
      return;
    }

    input.value = "";
    addThreadAuthorFilter(authorKey);
  }

  function removeThreadAuthorFilter(authorKey: string) {
    if (!options.getActiveAuthorFilters().delete(authorKey)) {
      return;
    }

    updateThreadPostFilters({
      render: !hasActiveThreadPostFilters(),
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

  function updateThreadPostFilters(optionsOverride: { render?: boolean } = {}) {
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

  function toggleAuthorFilter(author: string) {
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
      render: hadFilters !== hasActiveThreadPostFilters(),
    });
  }

  function applyThreadPostFilters(): { total: number; visible: number } {
    const query = normalizeLayoutText(options.getActiveThreadSearchQuery());
    const loadedThreadPosts = options.getLoadedThreadPosts();
    const postById = new Map(loadedThreadPosts.map((post) => [post.id, post]));

    return applyThreadPostFiltersToRenderedPosts({
      posts: options.getPostsElement(),
      query,
      activeAuthorFilters: options.getActiveAuthorFilters(),
      postById,
      getPostSearchText: getThreadPostSearchText,
    });
  }

  function enhanceAuthorFilterButton(wrapper: HTMLElement, author: string) {
    enhanceAuthorFilterButtonInDom(wrapper, author, toggleAuthorFilter);
  }

  return {
    hasActiveThreadPostFilters,
    renderThreadSearchPanel,
    clearThreadPostFilters,
    clearThreadFilters,
    applyThreadPostFilters,
    enhanceAuthorFilterButton,
  };
}
