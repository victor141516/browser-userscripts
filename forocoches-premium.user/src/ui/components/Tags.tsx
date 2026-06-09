import { createElement } from "../jsx";
import { hashString } from "../../shared/hash";
import { normalizeTag } from "../../domain/tags";

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
  const canonicalTag = normalizeTag(props.tag);

  return (
    <TagBase
      tag={canonicalTag}
      role="button"
      tabIndex={0}
      title={props.title || `Filtrar por +${props.tag}`}
      aria-pressed={
        typeof props.pressed === "boolean" ? String(props.pressed) : undefined
      }
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
    </TagBase>
  ) as HTMLElement;
}

export function TagLabel(props: {
  tag: string;
  label?: string;
  title?: string;
}): HTMLElement {
  return (
    <TagBase tag={props.tag} title={props.title}>
      {props.label || `+${props.tag}`}
    </TagBase>
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

function TagBase(
  props: {
    tag: string;
    children?: unknown[];
  } & Record<string, unknown>,
): HTMLElement {
  const canonicalTag = normalizeTag(props.tag);
  const colors = getTagColors(canonicalTag);
  const elementProps: Record<string, unknown> = { ...props };
  delete elementProps.tag;
  delete elementProps.children;

  return (
    <span
      {...elementProps}
      className="fc-premium-tag-chip"
      data-fc-premium-tag={canonicalTag}
      style={{
        "--fc-premium-tag-bg": colors.background,
        "--fc-premium-tag-border": colors.border,
        "--fc-premium-tag-color": colors.color,
      }}
    >
      {props.children}
    </span>
  ) as HTMLElement;
}
