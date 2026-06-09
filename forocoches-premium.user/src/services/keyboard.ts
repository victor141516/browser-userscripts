export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']"),
  );
}

export function hasKeyboardModifier(event: KeyboardEvent): boolean {
  return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
}

export function keyboardShortcutMatches(
  event: KeyboardEvent,
  key: string,
): boolean {
  if (key.length === 1) {
    return event.key.toLowerCase() === key.toLowerCase();
  }

  return event.key === key;
}

export function isMacKeyboardPlatform(): boolean {
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || "");
}

export function isOpenInNewTabKeyboardShortcut(
  event: KeyboardEvent,
  key: string,
): boolean {
  if (event.key !== key || event.altKey || event.shiftKey) {
    return false;
  }

  return isMacKeyboardPlatform()
    ? event.metaKey && !event.ctrlKey
    : event.ctrlKey && !event.metaKey;
}
