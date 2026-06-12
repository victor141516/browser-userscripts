import type {
  ActiveGraphView,
} from "../../domain/types";
import {
  isShortcutHelpPopoverOpen,
  closeShortcutHelpPopover,
  setShortcutHelpPopoverOpen,
} from "../../ui/shortcutHelpDom";
import {
  KEY_CLEAR_ACTIVE_VIEW,
  KEY_NAV_NEXT_PAGE,
  KEY_NAV_NEXT_POST,
  KEY_NAV_PREVIOUS_PAGE,
  KEY_NAV_PREVIOUS_POST,
  KEY_MULTIQUOTE_SELECTED_POST,
  KEY_NEW_THREAD_REPLY,
  KEY_OPEN_SHORTCUT_HELP,
  KEY_QUOTE_SELECTED_POST,
  KEY_RETURN_TO_THREAD_LIST,
} from "../../config/constants";
import {
  hasKeyboardModifier,
  isEditableTarget,
  keyboardShortcutMatches,
} from "../../services/keyboard";

export interface ThreadPageKeyboardHandlers {
  moveNavigation: (direction: number) => void;
  getActiveGraphView: () => ActiveGraphView | null;
  hasActiveThreadPostFilters: () => boolean;
  openThreadReplyWithoutQuote: () => boolean;
  quoteSelectedPost: (wrapper: HTMLElement) => boolean;
  toggleSelectedPostMultiquote: (wrapper: HTMLElement) => boolean;
  getSelectedPostWrapper: () => HTMLElement | null;
  clearThreadFilters: () => void;
  navigatePage: (direction: number) => boolean;
  returnToThreadList: () => boolean;
  getSelectedNavigationElement?: () => HTMLElement | null;
}

interface ThreadPageKeyboardController {
  handleNavigationKeyDown: (event: KeyboardEvent) => boolean;
}

export function createThreadPageKeyboardController(
  handlers: ThreadPageKeyboardHandlers,
): ThreadPageKeyboardController {
  function hasActiveGraphView(): boolean {
    return Boolean(handlers.getActiveGraphView());
  }

  function hasActiveFiltersOrView(): boolean {
    return handlers.hasActiveThreadPostFilters() || hasActiveGraphView();
  }

  function handleSelectedPostActionShortcut(event: KeyboardEvent): boolean {
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

  function handleNavigationKeyDown(event: KeyboardEvent): boolean {
    if (isEditableTarget(event.target)) {
      return false;
    }

    if (
      (event.key === KEY_NAV_NEXT_POST ||
        event.key === KEY_NAV_PREVIOUS_POST ||
        event.key === KEY_NAV_NEXT_PAGE ||
        event.key === KEY_NAV_PREVIOUS_PAGE) &&
      hasKeyboardModifier(event)
    ) {
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

    if (
      !hasKeyboardModifier(event) &&
      keyboardShortcutMatches(event, KEY_RETURN_TO_THREAD_LIST)
    ) {
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

    if (
      event.key === KEY_QUOTE_SELECTED_POST &&
      !hasKeyboardModifier(event)
    ) {
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
