export type NodeChild = Node | string | number | boolean | null | undefined;

type ElementProps = Record<string, unknown>;

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elementName: string]: ElementProps;
    }
  }
}

export function Fragment(props: { children?: NodeChild[] }): DocumentFragment {
  const fragment = document.createDocumentFragment();

  appendChildren(fragment, props.children || []);
  return fragment;
}

export function createElement(
  tag: string | ((props: ElementProps) => Node),
  props: ElementProps | null,
  ...children: NodeChild[]
): Node {
  if (typeof tag === "function") {
    return tag({ ...(props || {}), children });
  }

  const element = document.createElement(tag);

  for (const [name, value] of Object.entries(props || {})) {
    applyProp(element, name, value);
  }

  appendChildren(element, children);
  return element;
}

function appendChildren(
  parent: Element | DocumentFragment,
  children: NodeChild[],
): void {
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) {
      continue;
    }

    parent.append(
      child instanceof Node ? child : document.createTextNode(String(child)),
    );
  }
}

function applyProp(element: HTMLElement, name: string, value: unknown): void {
  if (value === false || value === null || value === undefined) {
    return;
  }

  if (name === "className") {
    element.className = String(value);
    return;
  }

  if (name === "htmlFor" && element instanceof HTMLLabelElement) {
    element.htmlFor = String(value);
    return;
  }

  if (name === "style") {
    if (typeof value === "string") {
      element.style.cssText = value;
      return;
    }

    if (value && typeof value === "object") {
      for (const [propertyName, propertyValue] of Object.entries(value)) {
        if (propertyValue === null || propertyValue === undefined) {
          continue;
        }

        if (propertyName.startsWith("--")) {
          element.style.setProperty(propertyName, String(propertyValue));
        } else {
          (element.style as unknown as Record<string, string>)[propertyName] =
            String(propertyValue);
        }
      }
      return;
    }
  }

  if (/^on[A-Z]/.test(name) && typeof value === "function") {
    const eventName = name.slice(2).toLowerCase();
    element.addEventListener(eventName, value as EventListener);
    return;
  }

  if (name in element) {
    try {
      (element as unknown as Record<string, unknown>)[name] = value;
      return;
    } catch (_error) {
      // Some legacy DOM properties are readonly; fall through to attributes.
    }
  }

  element.setAttribute(name, value === true ? "" : String(value));
}
