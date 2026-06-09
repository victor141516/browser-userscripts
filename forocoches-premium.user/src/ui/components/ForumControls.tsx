import {
  FORUM_LOADING_STATUS_ID,
  FORUM_SIDEBAR_TOGGLE_ID,
  HIDDEN_THREADS_BUTTON_ID,
} from "../../config/constants";
import { createElement } from "../jsx";

export function ForumSidebarToggleButton(props: {
  hidden: boolean;
  onToggle: () => void;
}): HTMLButtonElement {
  return (
    <button
      id={FORUM_SIDEBAR_TOGGLE_ID}
      type="button"
      title={props.hidden ? "Mostrar la columna izquierda" : "Ocultar la columna izquierda"}
      aria-expanded={String(!props.hidden)}
      onClick={props.onToggle}
    >
      {props.hidden ? "Mostrar panel izquierdo" : "Ocultar panel izquierdo"}
    </button>
  ) as HTMLButtonElement;
}

export function HiddenThreadsToolbarCell(props: {
  onOpen: () => void;
}): HTMLTableCellElement {
  return (
    <td
      id={HIDDEN_THREADS_BUTTON_ID}
      className="vbmenu_control"
      noWrap
      style="cursor: pointer"
    >
      <a
        href="#"
        onClick={(event: MouseEvent) => {
          event.preventDefault();
          props.onOpen();
        }}
      >
        Hilos escondidos
      </a>
    </td>
  ) as HTMLTableCellElement;
}

export function ForumLoadingStatus(): HTMLElement {
  return (
    <span id={FORUM_LOADING_STATUS_ID}>
      <span className="fc-premium-spinner" aria-hidden="true" />
      <span data-fc-premium-loading-text="true" />
    </span>
  ) as HTMLElement;
}
