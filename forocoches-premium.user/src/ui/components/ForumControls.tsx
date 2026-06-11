import {
  FORUM_LOADING_STATUS_ID,
  FORUM_SIDEBAR_TOGGLE_ID,
  HIDDEN_THREADS_BUTTON_ID,
} from "../../config/constants";
import { renderElement } from "../render";

export function ForumSidebarToggleButton(props: {
  hidden: boolean;
  onToggle: () => void;
}): HTMLButtonElement {
  return renderElement<HTMLButtonElement>(
    <button
      id={FORUM_SIDEBAR_TOGGLE_ID}
      type="button"
      title={
        props.hidden ? "Mostrar la columna izquierda" : "Ocultar la columna izquierda"
      }
      aria-expanded={!props.hidden}
      onClick={props.onToggle}
    >
      {props.hidden ? "Mostrar panel izquierdo" : "Ocultar panel izquierdo"}
    </button>,
  );
}

export function HiddenThreadsToolbarCell(props: {
  onOpen: () => void;
}): HTMLTableCellElement {
  return renderElement<HTMLTableCellElement>(
    <td
      id={HIDDEN_THREADS_BUTTON_ID}
      className="vbmenu_control"
      {...({ noWrap: true } as Record<string, unknown>)}
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
    </td>,
  );
}

export function ForumLoadingStatus(): HTMLElement {
  return renderElement<HTMLElement>(
    <span id={FORUM_LOADING_STATUS_ID}>
      <span className="fc-premium-spinner" aria-hidden="true" />
      <span data-fc-premium-loading-text="true" />
    </span>,
  );
}
