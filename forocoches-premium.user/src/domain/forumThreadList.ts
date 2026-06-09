import { hashString } from "../shared/hash";
import type { ForumThreadRecord } from "./types";

export interface ForumThreadListPage {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  records: ForumThreadRecord[];
  rowHtmlList: string[];
}

export function getForumThreadRowsSignature(
  rowHtmlList: string[],
  scope: string,
): string {
  return `${scope}|${rowHtmlList.length}|${rowHtmlList
    .map((html) => hashString(html).toString(36))
    .join(":")}`;
}

export function getForumThreadListPage(
  records: ForumThreadRecord[],
  requestedPage: number,
  pageSize: number,
): ForumThreadListPage {
  const totalPages = getForumThreadListTotalPages(records.length, pageSize);
  const currentPage = clampForumThreadListPage(requestedPage, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageRecords = records.slice(start, start + pageSize);

  return {
    currentPage,
    totalPages,
    pageSize,
    records: pageRecords,
    rowHtmlList: pageRecords.map((record) => record.html),
  };
}

export function getForumThreadListTotalPages(
  totalRecords: number,
  pageSize: number,
): number {
  return Math.max(1, Math.ceil(totalRecords / pageSize));
}

export function clampForumThreadListPage(
  pageNumber: number,
  totalPages: number,
): number {
  return Math.min(Math.max(pageNumber, 1), totalPages);
}
