import { applyPageFilterToRenderedPosts } from "../../ui/threadPostFiltersDom";
import { getVisiblePageNumbers } from "../../domain/pagination";
import type { ActiveGraphView, ThreadPage } from "../../domain/types";
import {
  getOriginalThreadPageLinkNumber,
  updateOriginalThreadPageMenus as updateOriginalThreadPageMenusInDom,
} from "../../adapters/forocoches/threadPageNavigation";
import { getPageNumber, getThreadId, isThreadPage } from "../../shared/dom";

export interface ThreadPagePaginationControllerOptions {
  getPostsElement: () => HTMLElement | null;
  getThreadPages: () => ThreadPage[];
  getActivePageFilter: () => number | null;
  setActivePageFilter: (pageNumber: number | null) => void;
  getActiveGraphView: () => ActiveGraphView | null;
  clearGraphView: () => void;
  getThreadPageUrl: (pageNumber: number) => URL;
  updateThreadPageUrl: (
    pageNumber: number,
    options?: { history?: "push" | "replace"; preserveHash?: boolean },
  ) => void;
  renderThreadPosts: () => void;
  renderThreadSummaryMenu: () => void;
}

export interface ThreadPagePaginationController {
  setPageFilter(pageNumber: number): void;
  navigatePage(direction: number): boolean;
  applyPageFilter(): { total: number; visible: number };
  updateOriginalThreadPageMenus(): void;
  installThreadPageNavigation(): void;
}

export function createThreadPagePaginationController(
  options: ThreadPagePaginationControllerOptions,
): ThreadPagePaginationController {
  function setPageFilter(pageNumber: number) {
    if (!isThreadPage()) {
      return;
    }

    options.setActivePageFilter(pageNumber);
    options.clearGraphView();
    options.updateThreadPageUrl(pageNumber, { history: "push" });
    updateOriginalThreadPageMenus();
    options.renderThreadPosts();
    options.renderThreadSummaryMenu();
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function navigatePage(direction: number): boolean {
    if (!isThreadPage() || options.getActiveGraphView()) {
      return false;
    }

    const totalPages = options.getThreadPages().length;

    if (totalPages <= 1) {
      return false;
    }

    const currentPage =
      options.getActivePageFilter() || getPageNumber(new URL(location.href));
    const nextPage = Math.min(Math.max(currentPage + direction, 1), totalPages);

    if (nextPage === currentPage) {
      return false;
    }

    setPageFilter(nextPage);
    return true;
  }

  function applyPageFilter(): { total: number; visible: number } {
    return applyPageFilterToRenderedPosts(
      options.getPostsElement(),
      options.getActivePageFilter(),
    );
  }

  function updateOriginalThreadPageMenus() {
    const threadPages = options.getThreadPages();

    if (!isThreadPage() || threadPages.length <= 1 || options.getActiveGraphView()) {
      return;
    }

    const totalPages = threadPages.length;
    const currentPage =
      options.getActivePageFilter() || getPageNumber(new URL(location.href));
    updateOriginalThreadPageMenusInDom({
      totalPages,
      currentPage,
      visiblePages: getVisiblePageNumbers(totalPages, currentPage),
      hrefForPage: (pageNumber) => options.getThreadPageUrl(pageNumber).href,
    });
  }

  function handleThreadPageNavigationClick(event: MouseEvent) {
    const link =
      event.target instanceof Element
        ? event.target.closest("a[href*='showthread.php']")
        : null;

    if (!(link instanceof HTMLAnchorElement)) {
      return;
    }

    const pageNumber = getOriginalThreadPageLinkNumber(
      link,
      getThreadId(new URL(location.href)),
    );

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
    updateOriginalThreadPageMenus,
    installThreadPageNavigation,
  };
}
