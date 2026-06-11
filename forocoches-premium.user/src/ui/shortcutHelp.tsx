import {
  SHORTCUT_HELP_BUTTON_ID,
  SHORTCUT_HELP_CONTAINER_ID,
  SHORTCUT_HELP_POPOVER_ID,
} from "../config/constants";
import { renderElement, renderNode } from "./render";

type ShortcutHelpItem = {
  keys: string[];
  description: string;
};

export function ShortcutHelpContainer(props: {
  items: ShortcutHelpItem[];
  formatKey: (key: string) => string;
  onToggle: () => void;
}): HTMLElement {
  return renderElement<HTMLElement>(
    <div id={SHORTCUT_HELP_CONTAINER_ID}>
      <button
        id={SHORTCUT_HELP_BUTTON_ID}
        type="button"
        aria-label="Mostrar atajos de teclado"
        aria-haspopup="dialog"
        aria-expanded="false"
        onClick={(event: MouseEvent) => {
          event.preventDefault();
          event.stopPropagation();
          props.onToggle();
        }}
      >
        ?
      </button>
      <div
        id={SHORTCUT_HELP_POPOVER_ID}
        hidden
        role="dialog"
        aria-label="Atajos de teclado"
      >
        <div className="fc-premium-shortcut-help-title">
          Atajos de teclado
        </div>
        {props.items.map((item) => (
          <ShortcutHelpRow item={item} formatKey={props.formatKey} />
        ))}
      </div>
    </div>,
  );
}

export function createShortcutHelpRow(
  item: ShortcutHelpItem,
  formatKey: (key: string) => string,
): Node {
  return renderNode(<ShortcutHelpRow item={item} formatKey={formatKey} />);
}

function ShortcutHelpRow(props: {
  item: ShortcutHelpItem;
  formatKey: (key: string) => string;
}) {
  return (
    <div className="fc-premium-shortcut-help-row">
      <span className="fc-premium-shortcut-help-keys">
        {props.item.keys.map((key) => (
          <kbd className="fc-premium-shortcut-help-key">
            {props.formatKey(key)}
          </kbd>
        ))}
      </span>
      <span className="fc-premium-shortcut-help-description">
        {props.item.description}
      </span>
    </div>
  );
}
