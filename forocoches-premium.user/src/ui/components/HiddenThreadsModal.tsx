import {
  HIDDEN_THREADS_MODAL_BODY_ID,
  HIDDEN_THREADS_MODAL_ID,
} from "../../config/constants";
import type { ForumThreadRecord } from "../../domain/types";
import { createElement } from "../jsx";
import { TagLabel } from "./Tags";

interface HiddenThreadsModalProps {
  records: ForumThreadRecord[];
  onClose: () => void;
  onRestore: (threadId: string) => void;
}

export function HiddenThreadsModal(
  props: HiddenThreadsModalProps,
): HTMLElement {
  return (
    <div
      id={HIDDEN_THREADS_MODAL_ID}
      hidden
      role="dialog"
      aria-modal="true"
      aria-label="Hilos escondidos"
      onClick={(event: MouseEvent) => {
        if (event.target === event.currentTarget) {
          props.onClose();
        }
      }}
    >
      <div className="fc-premium-hidden-threads-dialog">
        <div className="fc-premium-hidden-threads-header">
          <span>Hilos escondidos</span>
          <button type="button" onClick={props.onClose}>
            Cerrar
          </button>
        </div>
        <HiddenThreadsModalBody
          records={props.records}
          onRestore={props.onRestore}
        />
      </div>
    </div>
  ) as HTMLElement;
}

export function HiddenThreadsModalBody(props: {
  records: ForumThreadRecord[];
  onRestore: (threadId: string) => void;
}): HTMLElement {
  return (
    <div id={HIDDEN_THREADS_MODAL_BODY_ID}>
      {props.records.length === 0 ? (
        <div className="fc-premium-hidden-threads-empty">
          No hay hilos escondidos en este foro.
        </div>
      ) : (
        <table className="fc-premium-hidden-threads-table">
          <thead>
            <tr>
              <th>Hilo</th>
              <th>Info</th>
              <th>Oculto</th>
              <th>Accion</th>
            </tr>
          </thead>
          <tbody>
            {props.records.map((record) => (
              <HiddenThreadRow
                record={record}
                onRestore={props.onRestore}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  ) as HTMLElement;
}

function HiddenThreadRow(props: {
  record: ForumThreadRecord;
  onRestore: (threadId: string) => void;
}): HTMLTableRowElement {
  const record = props.record;
  const info = [
    record.author ? `Autor: ${record.author}` : "",
    record.statsText,
    record.lastPostText,
  ].filter(Boolean);

  return (
    <tr>
      <td>
        <a className="fc-premium-hidden-thread-title" href={record.url}>
          {record.title || `Hilo ${record.id}`}
        </a>
        {record.tags.length > 0 ? (
          <div className="fc-premium-hidden-thread-meta">
            {record.tags.slice(0, 5).map((tag) => (
              <TagLabel tag={tag} />
            ))}
            {record.tags.length > 5 ? ` +${record.tags.length - 5}` : ""}
          </div>
        ) : null}
      </td>
      <td>{info.length > 0 ? info.join(" · ") : "-"}</td>
      <td>{formatHiddenThreadDate(record.hiddenAt)}</td>
      <td>
        <button
          type="button"
          className="fc-premium-hidden-thread-restore"
          onClick={() => props.onRestore(record.id)}
        >
          Restaurar
        </button>
      </td>
    </tr>
  ) as HTMLTableRowElement;
}

function formatHiddenThreadDate(timestamp: number): string {
  if (!timestamp) {
    return "Sin fecha";
  }

  try {
    return new Date(timestamp).toLocaleString();
  } catch (_error) {
    return "Sin fecha";
  }
}
