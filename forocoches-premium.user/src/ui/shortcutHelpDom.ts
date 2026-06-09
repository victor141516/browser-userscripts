import {
  SHORTCUT_HELP_BUTTON_ID,
  SHORTCUT_HELP_CONTAINER_ID,
  SHORTCUT_HELP_POPOVER_ID,
} from "../config/constants";
import type { ShortcutHelpItem } from "../domain/types";
import { ShortcutHelpContainer } from "./shortcutHelp";

let documentClickInstalled = false;

export function isShortcutHelpPopoverOpen(): boolean {
  const popover = document.getElementById(SHORTCUT_HELP_POPOVER_ID);
  return popover instanceof HTMLElement && !popover.hidden;
}

export function closeShortcutHelpPopover(): void {
  setShortcutHelpPopoverOpen(false);
}

export function setShortcutHelpPopoverOpen(open: boolean): void {
  const button = document.getElementById(SHORTCUT_HELP_BUTTON_ID);
  const popover = document.getElementById(SHORTCUT_HELP_POPOVER_ID);

  if (!(button instanceof HTMLButtonElement) || !popover) {
    return;
  }

  popover.hidden = !open;
  button.setAttribute("aria-expanded", open ? "true" : "false");
}

export function renderShortcutHelpButton(options: {
  items: ShortcutHelpItem[];
  formatKey: (key: string) => string;
}): void {
  if (!document.body) {
    return;
  }

  document.getElementById(SHORTCUT_HELP_CONTAINER_ID)?.remove();
  document.getElementById(SHORTCUT_HELP_BUTTON_ID)?.remove();
  document.getElementById(SHORTCUT_HELP_POPOVER_ID)?.remove();

  const container = ShortcutHelpContainer({
    items: options.items,
    formatKey: options.formatKey,
    onToggle: () => {
      setShortcutHelpPopoverOpen(!isShortcutHelpPopoverOpen());
    },
  });

  installShortcutHelpDocumentClick();
  document.body.prepend(container);
}

function installShortcutHelpDocumentClick(): void {
  if (documentClickInstalled) {
    return;
  }

  documentClickInstalled = true;
  document.addEventListener("click", handleShortcutHelpDocumentClick, true);
}

function handleShortcutHelpDocumentClick(event: MouseEvent): void {
  const target = event.target;

  if (!(target instanceof Node)) {
    return;
  }

  const button = document.getElementById(SHORTCUT_HELP_BUTTON_ID);
  const popover = document.getElementById(SHORTCUT_HELP_POPOVER_ID);

  if (button?.contains(target) || popover?.contains(target)) {
    return;
  }

  closeShortcutHelpPopover();
}
