import { createElement } from "../jsx";

interface ForumPagerProps {
  currentPage: number;
  totalPages: number;
  visiblePages: number[];
  hrefForPage: (pageNumber: number) => string;
  onPageClick: (pageNumber: number) => void;
}

export function ForumPager(props: ForumPagerProps): HTMLTableElement {
  return (
    <table className="tborder" cellPadding="3" cellSpacing="1" border="0">
      <tbody>
        <tr>
          <td className="vbmenu_control" style="font-weight: normal">
            Pág {props.currentPage} de {props.totalPages}
          </td>
          {props.visiblePages.map((pageNumber) =>
            pageNumber === props.currentPage ? (
              <td className="alt2">
                <span className="mfont" title="Mostrando resultados filtrados">
                  <strong>{pageNumber}</strong>
                </span>
              </td>
            ) : (
              <ForumPagerLinkCell
                pageNumber={pageNumber}
                label={String(pageNumber)}
                href={props.hrefForPage(pageNumber)}
                onPageClick={props.onPageClick}
              />
            ),
          )}
          {props.currentPage < props.totalPages ? (
            <ForumPagerLinkCell
              pageNumber={props.currentPage + 1}
              label=">"
              href={props.hrefForPage(props.currentPage + 1)}
              onPageClick={props.onPageClick}
            />
          ) : null}
          {props.currentPage < props.totalPages ? (
            <ForumPagerLinkCell
              pageNumber={props.totalPages}
              label="Último »"
              href={props.hrefForPage(props.totalPages)}
              onPageClick={props.onPageClick}
            />
          ) : null}
        </tr>
      </tbody>
    </table>
  ) as HTMLTableElement;
}

function ForumPagerLinkCell(props: {
  pageNumber: number;
  label: string;
  href: string;
  onPageClick: (pageNumber: number) => void;
}): HTMLTableCellElement {
  return (
    <td className="alt1">
      <a
        className="mfont"
        href={props.href}
        onClick={(event: MouseEvent) => {
          event.preventDefault();
          props.onPageClick(props.pageNumber);
        }}
      >
        {props.label}
      </a>
    </td>
  ) as HTMLTableCellElement;
}
