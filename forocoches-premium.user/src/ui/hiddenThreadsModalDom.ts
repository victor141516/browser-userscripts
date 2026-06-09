import {
  HIDDEN_THREADS_BUTTON_ID,
  HIDDEN_THREADS_MODAL_BODY_ID,
  HIDDEN_THREADS_MODAL_ID,
  MODAL_OPEN_CLASS,
} from "../config/constants";
import type { ForumThreadRecord } from "../domain/types";
import { HiddenThreadsToolbarCell } from "./components/ForumControls";
import {
  HiddenThreadsModal,
  HiddenThreadsModalBody,
} from "./components/HiddenThreadsModal";

export function renderHiddenThreadsToolbarButton(options: {
  toolbarRow: HTMLTableRowElement | null;
  toolsCell: HTMLElement | null;
  onOpen: () => void;
}): void {
  if (
    !options.toolbarRow ||
    !(options.toolsCell instanceof HTMLTableCellElement)
  ) {
    return;
  }

  const existing = document.getElementById(HIDDEN_THREADS_BUTTON_ID);
  const cell = HiddenThreadsToolbarCell({
    onOpen: options.onOpen,
  });

  if (existing instanceof HTMLTableCellElement) {
    existing.replaceWith(cell);
  }

  if (
    cell.parentElement !== options.toolbarRow ||
    cell.nextElementSibling !== options.toolsCell
  ) {
    options.toolbarRow.insertBefore(cell, options.toolsCell);
  }
}

export function ensureHiddenThreadsModal(options: {
  records: ForumThreadRecord[];
  onClose: () => void;
  onRestore: (threadId: string) => void;
}): HTMLElement {
  let modal = document.getElementById(HIDDEN_THREADS_MODAL_ID);

  if (modal instanceof HTMLElement) {
    return modal;
  }

  modal = HiddenThreadsModal({
    records: options.records,
    onClose: options.onClose,
    onRestore: options.onRestore,
  });

  document.body.append(modal);
  return modal;
}

export function isHiddenThreadsModalOpen(): boolean {
  const modal = document.getElementById(HIDDEN_THREADS_MODAL_ID);
  return modal instanceof HTMLElement && !modal.hidden;
}

export function closeHiddenThreadsModal(): void {
  const modal = document.getElementById(HIDDEN_THREADS_MODAL_ID);

  if (modal instanceof HTMLElement) {
    modal.hidden = true;
  }

  document.documentElement.classList.remove(MODAL_OPEN_CLASS);
  document.body?.classList.remove(MODAL_OPEN_CLASS);
}

export function renderHiddenThreadsModalBody(options: {
  modal: HTMLElement;
  records: ForumThreadRecord[];
  onRestore: (threadId: string) => void;
}): void {
  const body = options.modal.querySelector(`#${HIDDEN_THREADS_MODAL_BODY_ID}`);

  if (!(body instanceof HTMLElement)) {
    return;
  }

  body.replaceWith(
    HiddenThreadsModalBody({
      records: options.records,
      onRestore: options.onRestore,
    }),
  );
}

export function openHiddenThreadsModal(options: {
  modal: HTMLElement;
  records: ForumThreadRecord[];
  onRestore: (threadId: string) => void;
}): void {
  renderHiddenThreadsModalBody({
    modal: options.modal,
    records: options.records,
    onRestore: options.onRestore,
  });

  options.modal.hidden = false;
  document.documentElement.classList.add(MODAL_OPEN_CLASS);
  document.body.classList.add(MODAL_OPEN_CLASS);
  options.modal.querySelector("button")?.focus({ preventScroll: true });
}
