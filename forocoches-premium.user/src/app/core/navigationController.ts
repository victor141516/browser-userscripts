import {
  clearNavigationSelection,
  getPostIdFromNavigationElement,
  getSelectedPostWrapper as getSelectedPostWrapperFromDom,
  markNavigationItemSelected,
  scrollNavigationElementIntoView as scrollNavigationElementIntoViewInDom,
} from "../../ui/navigationDom";
import type { NavigationItem } from "../../domain/types";
import { isThreadPage } from "../../shared/dom";

export interface NavigationControllerOptions {
  collectNavigationItems: () => NavigationItem[];
  onRenderNavigationStatus?: (selected: NavigationItem | null) => void;
  onUpdateSelectedThreadUrl?: (selected: NavigationItem) => void;
  getPostsElement: () => HTMLElement | null;
}

export interface NavigationController {
  refreshNavigation(options?: {
    reset?: boolean;
    scroll?: boolean;
    updateUrl?: boolean;
  }): void;
  getNavigationItems(): NavigationItem[];
  getSelectedNavigationItem(): NavigationItem | null;
  getNavigationLength(): number;
  getSelectedPostWrapper(): HTMLElement | null;
  moveNavigation(direction: number): void;
  selectNavigationIndex(index: number): void;
  selectNavigationElement(
    element: HTMLElement,
    options?: { scroll?: boolean; updateUrl?: boolean },
  ): void;
}

export interface NavigationControllerState {
  navigationItems: NavigationItem[];
  selectedNavigationIndex: number;
}

export function createNavigationController(
  options: NavigationControllerOptions,
  state: NavigationControllerState = {
    navigationItems: [],
    selectedNavigationIndex: -1,
  },
): NavigationController {
  function collectNavigationItems(): NavigationItem[] {
    return options.collectNavigationItems();
  }

  function renderNavigationStatus(selected: NavigationItem | null) {
    options.onRenderNavigationStatus?.(selected);
  }

  function updateSelectedPostUrl(selected: NavigationItem) {
    options.onUpdateSelectedThreadUrl?.(selected);
  }

  function getPostsElement() {
    return options.getPostsElement();
  }

  function renderNavigationSelection(
    renderOptions: { scroll?: boolean; updateUrl?: boolean } = {},
  ) {
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
      scrollNavigationElementIntoViewInDom(selected.element, mode);
    }
  }

  function refreshNavigation(options: {
    reset?: boolean;
    scroll?: boolean;
    updateUrl?: boolean;
  } = {}) {
    const previousElement = state.navigationItems[state.selectedNavigationIndex]?.element;
    state.navigationItems = collectNavigationItems();

    if (state.navigationItems.length === 0) {
      state.selectedNavigationIndex = -1;
      renderNavigationSelection(options);
      return;
    }

    if (options.reset || state.selectedNavigationIndex < 0) {
      state.selectedNavigationIndex = 0;
    } else {
      const preservedIndex = state.navigationItems.findIndex(
        (item) => item.element === previousElement,
      );
      state.selectedNavigationIndex = preservedIndex >= 0 ? preservedIndex : 0;
    }

    renderNavigationSelection(options);
  }

  function moveNavigation(direction: number): void {
    if (state.navigationItems.length === 0) {
      refreshNavigation({ reset: true });
    }

    if (state.navigationItems.length === 0) {
      return;
    }

    state.selectedNavigationIndex = Math.min(
      Math.max(state.selectedNavigationIndex + direction, 0),
      state.navigationItems.length - 1,
    );
    renderNavigationSelection({ scroll: true, updateUrl: true });
  }

  function selectNavigationIndex(index: number): void {
    if (state.navigationItems.length === 0) {
      refreshNavigation({ reset: true });
    }

    if (state.navigationItems.length === 0) {
      return;
    }

    state.selectedNavigationIndex = Math.min(
      Math.max(index, 0),
      state.navigationItems.length - 1,
    );
    renderNavigationSelection({ scroll: true, updateUrl: true });
  }

  function selectNavigationElement(
    element: HTMLElement,
    options: { scroll?: boolean; updateUrl?: boolean } = {},
  ): void {
    const index = state.navigationItems.findIndex((item) => item.element === element);

    if (index < 0) {
      if (options.scroll !== false) {
        const mode = isThreadPage() ? "start" : "nearest";
        scrollNavigationElementIntoViewInDom(element, mode);
      }
      return;
    }

    state.selectedNavigationIndex = index;
    renderNavigationSelection({
      scroll: options.scroll !== false,
      updateUrl: options.updateUrl !== false,
    });
  }

  function getSelectedPostWrapper(): HTMLElement | null {
    if (state.navigationItems.length === 0) {
      refreshNavigation({ reset: true });
    }

    const selected = state.navigationItems[state.selectedNavigationIndex]?.element;

    if (
      selected instanceof HTMLElement &&
      selected.matches(".fc-premium-post-wrapper")
    ) {
      return selected;
    }

    return getSelectedPostWrapperFromDom();
  }

  function getSelectedNavigationItem(): NavigationItem | null {
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
    getSelectedPostWrapper,
    moveNavigation,
    selectNavigationIndex,
    selectNavigationElement,
  };
}
