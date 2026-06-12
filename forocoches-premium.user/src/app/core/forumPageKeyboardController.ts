import {
  KEY_CLEAR_ACTIVE_VIEW,
  KEY_HIDE_SELECTED_THREAD,
  KEY_NAV_NEXT_PAGE,
  KEY_NAV_NEXT_POST,
  KEY_NAV_PREVIOUS_PAGE,
  KEY_NAV_PREVIOUS_POST,
  KEY_OPEN_SHORTCUT_HELP,
  KEY_OPEN_SELECTED_THREAD_IN_NEW_TAB,
  KEY_QUOTE_SELECTED_POST,
} from "../../config/constants";
import {
  closeShortcutHelpPopover,
  isShortcutHelpPopoverOpen,
  setShortcutHelpPopoverOpen,
} from "../../ui/shortcutHelpDom";
import {
  hasKeyboardModifier,
  isEditableTarget,
} from "../../services/keyboard";

export interface ForumPageKeyboardHandlers {
  moveNavigation: (direction: number) => void;
  isOpenSelectedThreadInNewTabShortcut: (event: KeyboardEvent) => boolean;
  openSelectedForumThreadInNewTab: () => boolean;
  isHiddenThreadsModalOpen: () => boolean;
  closeHiddenThreadsModal: () => void;
  activeTagFilterExists: () => boolean;
  clearTagFilter: () => void;
  hideSelectedForumThread: () => void | Promise<boolean>;
  openSelectedNavigationItem: () => void;
  navigateForumPage: (direction: number) => boolean;
  isThreadPage: () => boolean;
}

interface ForumPageKeyboardController {
  handleNavigationKeyDown: (event: KeyboardEvent) => boolean;
}

export function createForumPageKeyboardController(
  handlers: ForumPageKeyboardHandlers,
): ForumPageKeyboardController {
  function handleNavigationKeyDown(event: KeyboardEvent): boolean {
    if (isEditableTarget(event.target)) {
      return false;
    }

    if (
      (event.key === KEY_NAV_NEXT_POST || event.key === KEY_NAV_PREVIOUS_POST) &&
      hasKeyboardModifier(event)
    ) {
      return false;
    }

    if (
      (event.key === KEY_NAV_NEXT_PAGE ||
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
      if (!hasKeyboardModifier(event)) {
        event.preventDefault();
        handlers.moveNavigation(1);
        return true;
      }

      return false;
    }

    if (event.key === KEY_NAV_PREVIOUS_POST) {
      if (!hasKeyboardModifier(event)) {
        event.preventDefault();
        handlers.moveNavigation(-1);
        return true;
      }

      return false;
    }

    if (event.key === KEY_NAV_PREVIOUS_PAGE) {
      event.preventDefault();
      return handlers.navigateForumPage(-1);
    }

    if (event.key === KEY_NAV_NEXT_PAGE) {
      event.preventDefault();
      return handlers.navigateForumPage(1);
    }

    if (
      event.key === KEY_OPEN_SELECTED_THREAD_IN_NEW_TAB &&
      handlers.isOpenSelectedThreadInNewTabShortcut(event)
    ) {
      event.preventDefault();
      handlers.openSelectedForumThreadInNewTab();
      return true;
    }

    if (event.key === KEY_CLEAR_ACTIVE_VIEW) {
      if (handlers.isHiddenThreadsModalOpen()) {
        event.preventDefault();
        handlers.closeHiddenThreadsModal();
        return true;
      }

      if (handlers.activeTagFilterExists()) {
        event.preventDefault();
        handlers.clearTagFilter();
        return true;
      }
    }

    if (event.key === KEY_HIDE_SELECTED_THREAD) {
      event.preventDefault();
      void handlers.hideSelectedForumThread();
      return true;
    }

    if (event.key === KEY_QUOTE_SELECTED_POST && !handlers.isThreadPage()) {
      event.preventDefault();
      handlers.openSelectedNavigationItem();
      return true;
    }

    return false;
  }

  return { handleNavigationKeyDown };
}
