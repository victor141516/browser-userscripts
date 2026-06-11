import { render } from "preact";
import type { VNode } from "preact";

export function renderElement<T extends HTMLElement>(node: VNode): T {
  const host = document.createElement("div");
  render(node, host);

  const element = host.firstElementChild;

  if (!(element instanceof HTMLElement)) {
    throw new Error("Preact component did not render an HTMLElement");
  }

  return element as T;
}

export function renderNode(node: VNode): Node {
  return renderElement(node);
}
