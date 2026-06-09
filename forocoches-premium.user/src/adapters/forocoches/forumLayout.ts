import {
  FORUM_CONTROLS_ROW_ID,
  FORUM_LAYOUT_HIDDEN_ATTRIBUTE,
  THREAD_TITLE_SELECTOR,
} from "../../config/constants";
import { normalizeLayoutText, normalizeText } from "../../shared/dom";

export function getForumThreadsTable(): HTMLTableElement | null {
  const table = document.getElementById("threadslist");

  if (table instanceof HTMLTableElement) {
    return table;
  }

  const title = document.querySelector(THREAD_TITLE_SELECTOR);
  const owner = title?.closest("table");

  return owner instanceof HTMLTableElement ? owner : null;
}

export function getForumThreadListHeaderTable(): HTMLTableElement | null {
  const threadsTable = getForumThreadsTable();
  let sibling = threadsTable?.previousElementSibling || null;

  while (sibling) {
    if (
      sibling instanceof HTMLTableElement &&
      normalizeText(sibling.querySelector("td.tcat")?.textContent).startsWith(
        "Temas en el Foro",
      )
    ) {
      return sibling;
    }

    sibling = sibling.previousElementSibling;
  }

  for (const table of document.querySelectorAll("table.tborder")) {
    if (
      table instanceof HTMLTableElement &&
      normalizeText(table.querySelector("td.tcat")?.textContent).startsWith(
        "Temas en el Foro",
      )
    ) {
      return table;
    }
  }

  return null;
}

export function removeForumTitleTables(): void {
  const header = getForumThreadListHeaderTable();
  const forumName = getForumNameFromThreadListHeader();

  for (const table of document.querySelectorAll("table.tborder")) {
    if (
      table instanceof HTMLTableElement &&
      (isForumTitleSummaryTable(table, header, forumName) ||
        isForumBreadcrumbTitleTable(table, header, forumName))
    ) {
      table.remove();
    }
  }
}

export function getRelatedForumsPanel(): HTMLTableElement | null {
  for (const table of document.querySelectorAll("table")) {
    if (!(table instanceof HTMLTableElement)) {
      continue;
    }

    const header = normalizeText(
      table.querySelector("tr:first-child td")?.textContent,
    ).toLowerCase();

    if (header === "foros relacionados" || header === "related forums") {
      return table;
    }
  }

  return null;
}

export function getForumSidebarCell(
  panel: HTMLTableElement,
): HTMLTableCellElement | null {
  let current = panel.parentElement;

  while (current) {
    if (current instanceof HTMLTableCellElement) {
      const cells = getDirectTableCells(current.parentElement);
      const hasMainSibling = cells.some(
        (cell) => cell !== current && cellContainsForumThreads(cell),
      );

      if (hasMainSibling) {
        return current;
      }
    }

    current = current.parentElement;
  }

  return null;
}

export function getForumMainCell(
  sidebarCell: HTMLTableCellElement,
): HTMLTableCellElement | null {
  const cells = getDirectTableCells(sidebarCell.parentElement);

  return cells.find(cellContainsForumThreads) || null;
}

export function getForumSidebarSpacerCell(
  sidebarCell: HTMLTableCellElement,
): HTMLTableCellElement | null {
  const mainCell = getForumMainCell(sidebarCell);

  if (!mainCell) {
    return null;
  }

  const cells = getDirectTableCells(sidebarCell.parentElement);
  const sidebarIndex = cells.indexOf(sidebarCell);
  const mainIndex = cells.indexOf(mainCell);

  if (sidebarIndex < 0 || mainIndex < 0 || mainIndex <= sidebarIndex + 1) {
    return null;
  }

  return (
    cells.slice(sidebarIndex + 1, mainIndex).find(isForumSidebarSpacerCell) ||
    null
  );
}

export function setForumLayoutElementHidden(
  element: HTMLElement,
  hidden: boolean,
): void {
  if (hidden) {
    element.setAttribute(FORUM_LAYOUT_HIDDEN_ATTRIBUTE, "true");
  } else {
    element.removeAttribute(FORUM_LAYOUT_HIDDEN_ATTRIBUTE);
  }
}

export function hideElementAndAdjacentSpacers(element: HTMLElement): void {
  setForumLayoutElementHidden(element, true);

  for (const sibling of [
    element.previousElementSibling,
    element.nextElementSibling,
  ]) {
    if (sibling instanceof HTMLElement && isSmallLayoutSpacer(sibling)) {
      setForumLayoutElementHidden(sibling, true);
    }
  }
}

export function isForumTopShortcutBar(table: HTMLTableElement): boolean {
  return isForumHomeShortcutBar(table) || isForumUserShortcutBar(table);
}

export function shouldIgnoreTopNavigationTable(
  table: HTMLTableElement,
): boolean {
  return (
    table.id === FORUM_CONTROLS_ROW_ID ||
    Boolean(table.closest(`#${FORUM_CONTROLS_ROW_ID}`))
  );
}

export function setForumMainCellExpanded(
  mainCell: HTMLTableCellElement,
  expanded: boolean,
): void {
  if (mainCell.dataset.fcPremiumOriginalWidth === undefined) {
    mainCell.dataset.fcPremiumOriginalWidth =
      mainCell.getAttribute("width") || "";
  }

  if (expanded) {
    mainCell.setAttribute("width", "100%");
    mainCell.style.width = "100%";
    return;
  }

  if (mainCell.dataset.fcPremiumOriginalWidth) {
    mainCell.setAttribute("width", mainCell.dataset.fcPremiumOriginalWidth);
  }

  mainCell.style.width = "";
}

function getForumNameFromThreadListHeader(): string | null {
  const header = getForumThreadListHeaderTable();
  const label = normalizeText(
    header?.querySelector("td.tcat .normal")?.textContent,
  )
    .replace(/^:\s*/, "")
    .trim();

  return label || null;
}

function isForumTitleSummaryTable(
  table: HTMLTableElement,
  header: HTMLTableElement | null,
  forumName: string | null,
): boolean {
  if (
    header &&
    !(table.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING)
  ) {
    return false;
  }

  const title = normalizeText(table.querySelector("h1")?.textContent);

  if (!title) {
    return false;
  }

  if (forumName && title.toLowerCase() !== forumName.toLowerCase()) {
    return false;
  }

  return Boolean(table.querySelector("img[src*='forocoches_recarga']"));
}

function isForumBreadcrumbTitleTable(
  table: HTMLTableElement,
  header: HTMLTableElement | null,
  forumName: string | null,
): boolean {
  if (
    header &&
    !(table.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING)
  ) {
    return false;
  }

  const title = normalizeText(
    table.querySelector("td.navbar strong")?.textContent,
  );

  if (!title) {
    return false;
  }

  if (forumName && !title.toLowerCase().startsWith(forumName.toLowerCase())) {
    return false;
  }

  return Boolean(table.querySelector("img[src*='navbits_finallink']"));
}

function getDirectTableCells(row: Element | null): HTMLTableCellElement[] {
  if (!(row instanceof HTMLTableRowElement)) {
    return [];
  }

  return Array.from(row.children).filter(
    (child) => child instanceof HTMLTableCellElement,
  );
}

function cellContainsForumThreads(cell: HTMLTableCellElement): boolean {
  return Boolean(
    cell.querySelector("#threadslist") ||
      cell.querySelector(THREAD_TITLE_SELECTOR),
  );
}

function isForumSidebarSpacerCell(cell: HTMLTableCellElement): boolean {
  const width = Number(cell.getAttribute("width") || "0");
  const renderedWidth = cell.getBoundingClientRect().width;

  return (
    normalizeText(cell.textContent).length === 0 &&
    ((Number.isFinite(width) && width > 0 && width <= 8) ||
      (renderedWidth > 0 && renderedWidth <= 8))
  );
}

function isSmallLayoutSpacer(element: Element): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  if (normalizeText(element.textContent)) {
    return false;
  }

  if (element instanceof HTMLBRElement) {
    return true;
  }

  const explicitHeight = Number(
    element.getAttribute("height") || element.style.height.replace("px", ""),
  );
  const renderedHeight = element.getBoundingClientRect().height;

  return (
    ["DIV", "TABLE", "TBODY", "TR"].includes(element.tagName) &&
    ((Number.isFinite(explicitHeight) &&
      explicitHeight > 0 &&
      explicitHeight <= 12) ||
      (renderedHeight > 0 && renderedHeight <= 12))
  );
}

function isForumHomeShortcutBar(table: HTMLTableElement): boolean {
  const text = normalizeLayoutText(table.textContent);

  return text === "inicio foro" || /^inicio foro\b/.test(text);
}

function isForumUserShortcutBar(table: HTMLTableElement): boolean {
  const text = normalizeLayoutText(table.textContent);

  return (
    text.includes("panel control") &&
    text.includes("temas iniciados") &&
    text.includes("temas participados") &&
    text.includes("finalizar sesion")
  );
}
