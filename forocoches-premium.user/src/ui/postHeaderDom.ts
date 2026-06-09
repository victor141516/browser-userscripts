import { POST_TABLE_SELECTOR } from "../config/constants";
import type { PostRecord } from "../domain/types";
import { createHeaderAuthorMeta } from "./postAuthorDom";

export interface PostHeaderSlots {
  dateCell: HTMLTableCellElement | null;
  numberCell: HTMLTableCellElement | null;
}

export function enhanceNativePostHeader(
  wrapper: HTMLElement,
  post: PostRecord,
): PostHeaderSlots {
  const table = wrapper.querySelector(POST_TABLE_SELECTOR);
  const postCountLink = table?.querySelector(`a[id='postcount${post.id}']`);
  const numberCell = postCountLink?.closest("td");
  const headerRow = postCountLink?.closest("tr");
  const dateCell =
    Array.from(headerRow?.children || []).find(
      (cell) => cell instanceof HTMLTableCellElement && cell !== numberCell,
    ) || null;
  const authorCellElement = table?.querySelector("td[width='175'][rowspan]");
  const authorCell =
    authorCellElement instanceof HTMLElement ? authorCellElement : null;

  if (authorCell) {
    authorCell.classList.add("fc-premium-author-cell");
  }

  const messageCell = table?.querySelector(`#td_post_${post.id}`);

  if (messageCell instanceof HTMLElement) {
    messageCell.classList.add("fc-premium-message-cell");
  }

  if (
    dateCell instanceof HTMLTableCellElement &&
    !dateCell.querySelector(".fc-premium-header-author")
  ) {
    dateCell.classList.add("fc-premium-post-date-cell");
    dateCell.append(createHeaderAuthorMeta(post, authorCell, wrapper));
  }

  if (numberCell instanceof HTMLTableCellElement) {
    numberCell.classList.add("fc-premium-post-number-cell");
  }

  return {
    dateCell: dateCell instanceof HTMLTableCellElement ? dateCell : null,
    numberCell:
      numberCell instanceof HTMLTableCellElement ? numberCell : null,
  };
}
