import {
  KEY_CLEAR_ACTIVE_VIEW,
  KEY_HIDE_SELECTED_THREAD,
  KEY_MULTIQUOTE_SELECTED_POST,
  KEY_NAV_FIRST_POST,
  KEY_NAV_LAST_POST,
  KEY_NAV_NEXT_POST,
  KEY_NAV_NEXT_PAGE,
  KEY_NAV_PREVIOUS_PAGE,
  KEY_NAV_PREVIOUS_POST,
  KEY_NEW_THREAD_REPLY,
  KEY_OPEN_SELECTED_THREAD_IN_NEW_TAB,
  KEY_OPEN_SELECTED_THREAD_IN_NEW_TAB_MODIFIER,
  KEY_OPEN_SHORTCUT_HELP,
  KEY_QUOTE_SELECTED_POST,
  KEY_RETURN_TO_THREAD_LIST,
} from "../config/constants";
import type { ShortcutHelpItem } from "../domain/types";

export function getShortcutHelpItems(): ShortcutHelpItem[] {
  return [
    {
      keys: [KEY_NAV_PREVIOUS_POST, KEY_NAV_NEXT_POST],
      description: "Seleccionar mensaje anterior/siguiente",
    },
    {
      keys: [KEY_NAV_FIRST_POST, KEY_NAV_LAST_POST],
      description: "Ir al primer/ultimo mensaje",
    },
    {
      keys: [KEY_NAV_PREVIOUS_PAGE, KEY_NAV_NEXT_PAGE],
      description: "Ir a la pagina anterior/siguiente",
    },
    {
      keys: [KEY_RETURN_TO_THREAD_LIST],
      description: "Volver a la lista de hilos",
    },
    {
      keys: [KEY_QUOTE_SELECTED_POST],
      description: "Abrir/citar el seleccionado",
    },
    {
      keys: [
        KEY_OPEN_SELECTED_THREAD_IN_NEW_TAB_MODIFIER,
        KEY_OPEN_SELECTED_THREAD_IN_NEW_TAB,
      ],
      description: "Abrir hilo seleccionado en nueva pestaña",
    },
    {
      keys: [KEY_HIDE_SELECTED_THREAD],
      description: "Esconder hilo seleccionado",
    },
    {
      keys: [KEY_NEW_THREAD_REPLY],
      description: "Responder sin cita",
    },
    {
      keys: [KEY_MULTIQUOTE_SELECTED_POST],
      description: "Alternar multicita",
    },
    {
      keys: [KEY_CLEAR_ACTIVE_VIEW],
      description: "Limpiar filtros o cerrar ayuda",
    },
    {
      keys: [KEY_OPEN_SHORTCUT_HELP],
      description: "Mostrar estos atajos",
    },
  ];
}

export function formatShortcutHelpKey(key: string): string {
  if (key === KEY_NAV_PREVIOUS_POST) {
    return "Arriba";
  }

  if (key === KEY_NAV_NEXT_POST) {
    return "Abajo";
  }

  if (key === KEY_NAV_PREVIOUS_PAGE) {
    return "Izquierda";
  }

  if (key === KEY_NAV_NEXT_PAGE) {
    return "Derecha";
  }

  if (key === KEY_NAV_FIRST_POST) {
    return "Inicio";
  }

  if (key === KEY_NAV_LAST_POST) {
    return "Fin";
  }

  if (key === KEY_CLEAR_ACTIVE_VIEW) {
    return "Esc";
  }

  if (key.length === 1) {
    return key.toUpperCase();
  }

  return key;
}
