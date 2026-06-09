import {
  HIDDEN_THREAD_ATTRIBUTE,
  THREAD_TITLE_SELECTOR,
} from "../../config/constants";
import { getThreadId } from "../../shared/dom";
import { getForumThreadsTable } from "./forumLayout";

type RenderTaggedThreadTitle = (title: HTMLAnchorElement) => void;

export interface RenderForumThreadRowsOptions {
  headerRowHtml: string[];
  rowHtmlList: string[];
  signature: string;
  currentSignature: string | null;
  renderTaggedTitle: RenderTaggedThreadTitle;
}

export interface RestoreForumThreadRowsOptions {
  headerRowHtml: string[];
  nativeRowHtml: string[];
  nativeSignature: string;
  currentSignature: string | null;
  renderTaggedTitle: RenderTaggedThreadTitle;
}

export function renderVisibleForumThreadTitleTags(
  root: HTMLElement | Document,
  renderTaggedTitle: RenderTaggedThreadTitle,
): void {
  for (const title of root.querySelectorAll(THREAD_TITLE_SELECTOR)) {
    if (title instanceof HTMLAnchorElement) {
      renderTaggedTitle(title);
    }
  }
}

export function renderForumThreadRowsFromHtml(
  options: RenderForumThreadRowsOptions,
): boolean {
  const table = getForumThreadsTable();

  if (!table || options.signature === options.currentSignature) {
    return false;
  }

  const template = document.createElement("template");
  template.innerHTML = [
    ...options.headerRowHtml,
    ...options.rowHtmlList,
  ].join("");

  for (const body of Array.from(table.tBodies)) {
    body.remove();
  }

  const body = table.createTBody();
  body.append(template.content);
  renderVisibleForumThreadTitleTags(body, options.renderTaggedTitle);
  return true;
}

export function restoreForumThreadRowsFromHtml(
  options: RestoreForumThreadRowsOptions,
): boolean {
  if (options.nativeRowHtml.length > 0) {
    return renderForumThreadRowsFromHtml({
      headerRowHtml: options.headerRowHtml,
      rowHtmlList: options.nativeRowHtml,
      signature: options.nativeSignature,
      currentSignature: options.currentSignature,
      renderTaggedTitle: options.renderTaggedTitle,
    });
  }

  return false;
}

export function applyHiddenForumThreadRows(hiddenThreadIds: Set<string>): void {
  const table = getForumThreadsTable();

  if (!table) {
    return;
  }

  for (const row of Array.from(table.rows)) {
    const title = row.querySelector(THREAD_TITLE_SELECTOR);

    if (!(title instanceof HTMLAnchorElement)) {
      row.removeAttribute(HIDDEN_THREAD_ATTRIBUTE);
      continue;
    }

    const threadId = getThreadId(new URL(title.href));

    if (threadId && hiddenThreadIds.has(threadId)) {
      row.setAttribute(HIDDEN_THREAD_ATTRIBUTE, "true");
    } else {
      row.removeAttribute(HIDDEN_THREAD_ATTRIBUTE);
    }
  }
}
