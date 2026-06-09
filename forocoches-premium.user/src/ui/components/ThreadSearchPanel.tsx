import {
  THREAD_SEARCH_AUTHOR_DATALIST_ID,
  THREAD_SEARCH_AUTHOR_INPUT_ID,
  THREAD_SEARCH_EMPTY_ID,
  THREAD_SEARCH_PANEL_ID,
  THREAD_SEARCH_SELECTED_AUTHORS_ID,
  THREAD_SEARCH_STATUS_ID,
  THREAD_SEARCH_TEXT_INPUT_ID,
} from "../../config/constants";
import { createElement } from "../jsx";

interface ThreadSearchPanelProps {
  searchQuery: string;
  onSearchInput: (value: string) => void;
  onAddAuthor: () => void;
  onClearFilters: () => void;
}

export function ThreadSearchPanel(
  props: ThreadSearchPanelProps,
): HTMLTableElement {
  return (
    <table
      id={THREAD_SEARCH_PANEL_ID}
      className="tborder"
      cellPadding="4"
      cellSpacing="1"
      border="0"
    >
      <tbody>
        <tr>
          <td className="thead">Buscar mensajes</td>
        </tr>
        <tr>
          <td className="alt1 fc-premium-thread-search-cell">
            <div className="fc-premium-thread-search-layout">
              <label className="fc-premium-thread-search-field">
                Texto
                <input
                  id={THREAD_SEARCH_TEXT_INPUT_ID}
                  type="search"
                  className="bginput"
                  placeholder="Buscar en mensajes"
                  value={props.searchQuery}
                  onInput={(event: Event) => {
                    const input = event.currentTarget;
                    if (input instanceof HTMLInputElement) {
                      props.onSearchInput(input.value);
                    }
                  }}
                />
              </label>
              <label className="fc-premium-thread-search-field">
                Usuario
                <input
                  id={THREAD_SEARCH_AUTHOR_INPUT_ID}
                  type="text"
                  className="bginput"
                  placeholder="Escribe un usuario"
                  list={THREAD_SEARCH_AUTHOR_DATALIST_ID}
                  autocomplete="off"
                  onKeyDown={(event: KeyboardEvent) => {
                    if (event.key !== "Enter") {
                      return;
                    }

                    event.preventDefault();
                    props.onAddAuthor();
                  }}
                />
              </label>
              <button
                type="button"
                className="fc-premium-thread-search-button"
                onClick={props.onAddAuthor}
              >
                Añadir
              </button>
              <button
                type="button"
                className="fc-premium-thread-search-button"
                onClick={props.onClearFilters}
              >
                Limpiar
              </button>
              <span id={THREAD_SEARCH_STATUS_ID} />
            </div>
            <datalist id={THREAD_SEARCH_AUTHOR_DATALIST_ID} />
            <div id={THREAD_SEARCH_SELECTED_AUTHORS_ID} />
            <div id={THREAD_SEARCH_EMPTY_ID} />
          </td>
        </tr>
      </tbody>
    </table>
  ) as HTMLTableElement;
}
