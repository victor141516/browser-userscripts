import { createElement } from "./jsx";

type ShortcutHelpItem = {
  keys: string[];
  description: string;
};

export function createShortcutHelpRow(
  item: ShortcutHelpItem,
  formatKey: (key: string) => string,
): Node {
  return (
    <div className="fc-premium-shortcut-help-row">
      <span className="fc-premium-shortcut-help-keys">
        {item.keys.map((key) => (
          <kbd className="fc-premium-shortcut-help-key">{formatKey(key)}</kbd>
        ))}
      </span>
      <span className="fc-premium-shortcut-help-description">
        {item.description}
      </span>
    </div>
  );
}
