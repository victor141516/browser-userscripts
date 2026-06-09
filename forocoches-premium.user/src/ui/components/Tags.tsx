import { createElement } from "../jsx";
import { hashString } from "../../shared/hash";

export interface TopTagSummary {
  tag: string;
  count: number;
  firstIndex: number;
}

interface TagChipProps {
  tag: string;
  label?: string;
  title?: string;
  pressed?: boolean;
  onToggle: (tag: string) => void;
}

export function TagChip(props: TagChipProps): HTMLElement {
  const canonicalTag = props.tag.toLowerCase();
  const colors = getTagColors(canonicalTag);

  return (
    <span
      className="fc-premium-tag-chip"
      data-fc-premium-tag={canonicalTag}
      role="button"
      tabIndex={0}
      title={props.title || `Filtrar por +${props.tag}`}
      aria-pressed={
        typeof props.pressed === "boolean" ? String(props.pressed) : undefined
      }
      style={{
        "--fc-premium-tag-bg": colors.background,
        "--fc-premium-tag-border": colors.border,
        "--fc-premium-tag-color": colors.color,
      }}
      onClick={(event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        props.onToggle(canonicalTag);
      }}
      onKeyDown={(event: KeyboardEvent) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        props.onToggle(canonicalTag);
      }}
    >
      {props.label || `+${props.tag}`}
    </span>
  ) as HTMLElement;
}

export function TopTagBar(props: {
  tags: TopTagSummary[];
  activeTag: string | null;
  onToggle: (tag: string) => void;
}): HTMLElement {
  return (
    <div id="fc-premium-top-tags">
      <span>Top tags:</span>
      {props.tags.map((summary) => (
        <TagChip
          tag={summary.tag}
          label={`+${summary.tag} (${summary.count})`}
          title={`Filtrar ${summary.count} hilos con +${summary.tag}`}
          pressed={props.activeTag === summary.tag}
          onToggle={props.onToggle}
        />
      ))}
    </div>
  ) as HTMLElement;
}

function getTagColors(tag: string): {
  background: string;
  border: string;
  color: string;
} {
  const hue = hashString(tag.toLowerCase()) % 360;

  return {
    background: `hsl(${hue}, 82%, 92%)`,
    border: `hsl(${hue}, 58%, 60%)`,
    color: `hsl(${hue}, 70%, 24%)`,
  };
}
