import { FORUM_LAYOUT_HIDDEN_ATTRIBUTE } from "../../config/constants";
import { hideElementAndAdjacentSpacers } from "./forumLayout";

type ForumHeaderSearchFormParts = {
  form: HTMLFormElement;
  controlsCell: HTMLTableCellElement;
  oldContainer: Element | null;
};

export function getThreadTitleTable(): HTMLTableElement | null {
  const table = document.querySelector("table[id^='fcthread']");
  return table instanceof HTMLTableElement ? table : null;
}

export function getThreadBreadcrumbOuterTable(): HTMLTableElement | null {
  const titleTable = getThreadTitleTable();

  const table = Array.from(document.querySelectorAll("table.tborder")).find(
    (table) => {
      if (!(table instanceof HTMLTableElement)) {
        return false;
      }

      if (
        titleTable &&
        !(
          table.compareDocumentPosition(titleTable) &
          Node.DOCUMENT_POSITION_FOLLOWING
        )
      ) {
        return false;
      }

      return Boolean(
        table.querySelector(".navbar") &&
          table.querySelector("img[src*='navbits_finallink']"),
      );
    },
  );

  return table instanceof HTMLTableElement ? table : null;
}

export function getThreadBreadcrumbContentTable(): HTMLTableElement | null {
  const outerTable = getThreadBreadcrumbOuterTable();
  const contentTable = outerTable?.rows[0]?.cells[0]?.querySelector("table");

  return contentTable instanceof HTMLTableElement ? contentTable : null;
}

export function getNavbarSearchLink(): HTMLAnchorElement | null {
  const link = document.getElementById("navbar_search");
  return link instanceof HTMLAnchorElement ? link : null;
}

export function moveForumHeaderSearchForm(searchSlot: HTMLElement): boolean {
  const parts = getForumHeaderSearchFormParts();

  if (!parts) {
    return false;
  }

  if (searchSlot.contains(parts.form)) {
    return true;
  }

  parts.form.classList.add("fc-premium-thread-header-search-form");

  for (const child of Array.from(parts.controlsCell.childNodes)) {
    if (child !== parts.form) {
      parts.form.append(child);
    }
  }

  searchSlot.append(parts.form);

  if (parts.oldContainer instanceof HTMLElement) {
    hideElementAndAdjacentSpacers(parts.oldContainer);
  }

  return true;
}

export function hideForumHeaderSearchForm(): void {
  const parts = getForumHeaderSearchFormParts();

  if (parts?.oldContainer instanceof HTMLElement) {
    hideElementAndAdjacentSpacers(parts.oldContainer);
  }
}

export function hideNativeThreadSearchMenu(): void {
  for (const id of ["threadsearch", "threadsearch_menu"]) {
    const element = document.getElementById(id);

    if (element instanceof HTMLElement) {
      element.setAttribute(FORUM_LAYOUT_HIDDEN_ATTRIBUTE, "true");
    }
  }
}

function getForumHeaderSearchFormParts(): ForumHeaderSearchFormParts | null {
  const form = document.querySelector(
    "form[name='busca'][action*='forocoches_search']",
  );

  if (!(form instanceof HTMLFormElement)) {
    return null;
  }

  const nextCell = form.nextElementSibling;

  if (
    nextCell instanceof HTMLTableCellElement &&
    nextCell.querySelector("input[name='query']")
  ) {
    return {
      form,
      controlsCell: nextCell,
      oldContainer:
        nextCell.closest("table.cajasprin") ||
        nextCell.closest("table")?.parentElement?.closest("tr") ||
        nextCell.closest("table"),
    };
  }

  const queryInput = Array.from(
    document.querySelectorAll("input[name='query']"),
  )
    .filter((input) => input instanceof HTMLInputElement)
    .find((input) => input.classList.contains("cfield"));
  const controlsCell = queryInput?.closest("td");

  if (!(controlsCell instanceof HTMLTableCellElement)) {
    return null;
  }

  return {
    form,
    controlsCell,
    oldContainer:
      controlsCell.closest("table.cajasprin") ||
      controlsCell.closest("table")?.parentElement?.closest("tr") ||
      controlsCell.closest("table"),
  };
}
