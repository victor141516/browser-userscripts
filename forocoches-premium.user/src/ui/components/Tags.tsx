import type { JSX } from "preact";
import { hashString } from "../../shared/hash";
import { normalizeTag } from "../../domain/tags";
import { renderElement } from "../render";

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
  return renderElement<HTMLElement>(<TagChipView {...props} />);
}

function TagChipView(props: TagChipProps) {
  const canonicalTag = normalizeTag(props.tag);

  return (
    <TagBase
      tag={canonicalTag}
      role="button"
      tabIndex={0}
      title={props.title || `Filtrar por +${props.tag}`}
      aria-pressed={props.pressed}
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
  );
}

export function TagLabel(props: {
  tag: string;
  label?: string;
  title?: string;
}): HTMLElement {
  return renderElement<HTMLElement>(<TagLabelView {...props} />);
}

export function TagLabelView(props: {
  tag: string;
  label?: string;
  title?: string;
}) {
  return (
    <TagBase tag={props.tag} title={props.title}>
      {props.label || `+${props.tag}`}
    </TagBase>
  );
}

export function TopTagBar(props: {
  tags: TopTagSummary[];
  activeTag: string | null;
  onToggle: (tag: string) => void;
}): HTMLElement {
  return renderElement<HTMLElement>(
    <div id="fc-premium-top-tags">
      <span>Top tags:</span>
      {props.tags.map((summary) => (
        <TagChipView
          tag={summary.tag}
          label={`+${summary.tag} (${summary.count})`}
          title={`Filtrar ${summary.count} hilos con +${summary.tag}`}
          pressed={props.activeTag === summary.tag}
          onToggle={props.onToggle}
        />
      ))}
    </div>,
  );
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
    children?: JSX.Element | JSX.Element[] | string | number | null;
  } & JSX.HTMLAttributes<HTMLSpanElement>,
) {
  const { tag, children, ...elementProps } = props;
  const canonicalTag = normalizeTag(tag);
  const colors = getTagColors(canonicalTag);

  return (
    <span
      {...elementProps}
      className="fc-premium-tag-chip"
      data-fc-premium-tag={canonicalTag}
      style={
        {
          "--fc-premium-tag-bg": colors.background,
          "--fc-premium-tag-border": colors.border,
          "--fc-premium-tag-color": colors.color,
        } as JSX.CSSProperties
      }
    >
      {children}
    </span>
  );
}
