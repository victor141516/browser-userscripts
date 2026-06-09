import { POST_TABLE_SELECTOR } from "../config/constants";

export function updatePostCompactLayout(
  wrapper: HTMLElement,
  compact: boolean,
): void {
  const table = wrapper.querySelector(POST_TABLE_SELECTOR);

  if (!(table instanceof HTMLTableElement)) {
    return;
  }

  const authorCell = table.querySelector(".fc-premium-author-cell");
  const headerRow = table.rows[0] || null;

  for (const row of Array.from(table.rows)) {
    if (row === headerRow) {
      continue;
    }

    const rowHasAuthorCell = Array.from(row.cells).some((cell) =>
      cell.classList.contains("fc-premium-author-cell"),
    );
    const shouldExpandRow = rowHasAuthorCell || row.cells.length === 1;

    for (const cell of Array.from(row.cells)) {
      if (
        !(cell instanceof HTMLTableCellElement) ||
        cell === authorCell ||
        cell.classList.contains("fc-premium-author-cell")
      ) {
        continue;
      }

      if (compact && shouldExpandRow) {
        applyCompactColSpan(cell);
      } else {
        restoreOriginalColSpan(cell);
      }
    }
  }
}

export function updateRenderedCompactPostLayouts(compact: boolean): void {
  for (const wrapper of document.querySelectorAll(
    ".fc-premium-post-wrapper",
  )) {
    if (wrapper instanceof HTMLElement) {
      updatePostCompactLayout(wrapper, compact);
    }
  }
}

function rememberCellColSpan(cell: HTMLTableCellElement): void {
  if (!cell.dataset.fcPremiumOriginalColspan) {
    cell.dataset.fcPremiumOriginalColspan = String(cell.colSpan || 1);
  }
}

function applyCompactColSpan(cell: HTMLTableCellElement): void {
  rememberCellColSpan(cell);
  cell.colSpan = Math.max(cell.colSpan, 2);
}

function restoreOriginalColSpan(cell: HTMLTableCellElement): void {
  const original = Number(cell.dataset.fcPremiumOriginalColspan || "1");
  cell.colSpan = Number.isFinite(original) && original > 0 ? original : 1;
}
