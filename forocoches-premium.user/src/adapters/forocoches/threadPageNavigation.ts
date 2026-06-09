import {
  getPageNumber,
  getThreadId,
  normalizeText,
  toUrl,
} from "../../shared/dom";

export function updateOriginalThreadPageMenus(options: {
  totalPages: number;
  currentPage: number;
  visiblePages: number[];
  hrefForPage: (pageNumber: number) => string;
}): void {
  for (const table of getOriginalThreadPageNavTables()) {
    const body = table.tBodies[0] || table.createTBody();
    const row = document.createElement("tr");
    const statusCell = document.createElement("td");
    statusCell.className = "vbmenu_control";
    statusCell.style.fontWeight = "normal";
    statusCell.textContent = `Pág ${options.currentPage} de ${options.totalPages}`;
    row.append(statusCell);

    for (const pageNumber of options.visiblePages) {
      row.append(
        createOriginalThreadPageCell(
          pageNumber,
          options.currentPage,
          options.hrefForPage,
        ),
      );
    }

    if (options.currentPage < options.totalPages) {
      row.append(
        createOriginalThreadPageActionCell(
          ">",
          options.currentPage + 1,
          options.hrefForPage,
        ),
      );
    }

    if (options.currentPage !== options.totalPages) {
      row.append(
        createOriginalThreadPageActionCell(
          "Último »",
          options.totalPages,
          options.hrefForPage,
        ),
      );
    }

    body.textContent = "";
    body.append(row);
  }
}

export function getOriginalThreadPageLinkNumber(
  link: HTMLAnchorElement,
  currentThreadId: string | null,
): number | null {
  const table = link.closest("table.tborder");

  if (!(table instanceof HTMLTableElement)) {
    return null;
  }

  const status = normalizeText(
    table.querySelector("td.vbmenu_control")?.textContent,
  );

  if (!/^Pág \d+ de \d+$/.test(status)) {
    return null;
  }

  const url = toUrl(link.getAttribute("href") || link.href);

  if (!url || getThreadId(url) !== currentThreadId) {
    return null;
  }

  return getPageNumber(url);
}

function getOriginalThreadPageNavTables(): HTMLTableElement[] {
  return Array.from(document.querySelectorAll("table.tborder")).filter(
    (table): table is HTMLTableElement => {
      if (!(table instanceof HTMLTableElement)) {
        return false;
      }

      const status = normalizeText(
        table.querySelector("td.vbmenu_control")?.textContent,
      );

      return /^Pág \d+ de \d+$/.test(status);
    },
  );
}

function createOriginalThreadPageCell(
  pageNumber: number,
  currentPage: number,
  hrefForPage: (pageNumber: number) => string,
): HTMLTableCellElement {
  const cell = document.createElement("td");
  const isCurrent = pageNumber === currentPage;
  cell.className = isCurrent ? "alt2" : "alt1";

  if (isCurrent) {
    const span = document.createElement("span");
    span.className = "mfont";
    span.title = `Pagina ${pageNumber}`;

    const strong = document.createElement("strong");
    strong.textContent = String(pageNumber);
    span.append(strong);
    cell.append(span);
    return cell;
  }

  const link = document.createElement("a");
  link.className = "mfont";
  link.href = hrefForPage(pageNumber);
  link.title = `Mostrar pagina ${pageNumber}`;
  link.textContent = String(pageNumber);
  cell.append(link);
  return cell;
}

function createOriginalThreadPageActionCell(
  text: string,
  pageNumber: number,
  hrefForPage: (pageNumber: number) => string,
): HTMLTableCellElement {
  const cell = document.createElement("td");
  cell.className = "alt1";

  const link = document.createElement("a");
  link.className = "smallfont";
  link.href = hrefForPage(pageNumber);
  link.textContent = text;
  cell.append(link);
  return cell;
}
