import { isSignal, listen, onDispose } from "../signal";

export function toChildArray(
  children: JSX.Children | null | undefined,
): JSX.Node[] {
  if (children == null) {
    return [];
  }

  const flatten = (child: JSX.Children): JSX.Node[] =>
    Array.isArray(child) ? child.flatMap(flatten) : [child];

  return flatten(children);
}

export function jsx<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: JSX.ComponentProps,
): HTMLElementTagNameMap[K];
export function jsx(
  tag: string | JSX.Component,
  props: JSX.ComponentProps,
): JSX.Element;

export function jsx(
  tag: string | JSX.Component,
  props: JSX.ComponentProps,
): JSX.Element {
  const { children, ...attributes } = props;

  if (typeof tag === "function") {
    return tag(props);
  }

  const element = createElement(tag, attributes);
  applyAttributes(element, attributes);

  for (const child of toChildArray(children)) {
    if (child != null && typeof child !== "boolean") {
      element.append(child as never);
    }
  }

  return element;
}

// noinspection JSUnusedGlobalSymbols
export const jsxs = jsx;

function createElement(tag: string, attributes: Record<string, unknown>) {
  if ("xmlns" in attributes) {
    return document.createElementNS(attributes.xmlns as string, tag);
  }
  if (svgTagNames.includes(tag)) {
    return document.createElementNS("http://www.w3.org/2000/svg", tag);
  }
  return document.createElement(tag);
}

function applyAttributes(
  element: Element,
  attributes: Record<string, unknown>,
) {
  for (const attribute of Array.from(element.attributes)) {
    if (!(attribute.nodeName in attributes)) {
      element.removeAttribute(attribute.nodeName);
    }
  }
  for (const [key, value] of Object.entries(attributes)) {
    if (isSignal(value)) {
      applyAttribute(element, key, value.peek());
      listen(value, "change", (event) => {
        applyAttribute(element, key, event.newValue);
      });
    } else {
      applyAttribute(element, key, value);
    }
  }
}

function applyAttribute(element: Element, key: string, value: unknown) {
  if (/^on/.test(key)) {
    if (typeof value === "function") {
      const type = key.substring(2).toLowerCase();
      element.addEventListener(type, value as never);
      onDispose(() => element.removeEventListener(type, value as never));
    }
  } else if (typeof value === "boolean") {
    if (value) {
      element.setAttribute(key, key);
    } else {
      element.removeAttribute(key);
    }
  } else if (value != null) {
    element.setAttribute(key, value as never);
  } else {
    element.removeAttribute(key);
  }
}

export const svgTagNames = [
  "circle",
  "clipPath",
  "color-profile",
  "cursor",
  "defs",
  "desc",
  "discard",
  "ellipse",
  "filter",
  "g",
  "line",
  "linearGradient",
  "mask",
  "mpath",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "radialGradient",
  "rect",
  "solidColor",
  "svg",
  "text",
  "textArea",
  "textPath",
  "title",
];

const fragmentRegister = new WeakMap<DocumentFragment, ChildNode[]>();

interface FragmentProps {
  children: JSX.Children;
}

export const Fragment = Object.assign(
  function Fragment({ children }: FragmentProps) {
    const element = document.createDocumentFragment();

    for (const child of toChildArray(children)) {
      if (child != null && typeof child !== "boolean") {
        element.append(child as never);
      }
    }

    if (element.childNodes.length === 0) {
      element.append(document.createComment("fragment"));
    }

    fragmentRegister.set(element, Array.from(element.childNodes));

    return element;
  },
  {
    replace(fragment: DocumentFragment, next: DocumentFragment) {
      const list = fragmentRegister.get(fragment);
      if (list == null || list.length === 0) {
        throw new Error("Given fragment does not exist or is empty.");
      }

      for (let i = 1; i < list.length; i++) {
        list[i].remove();
      }

      list[0].replaceWith(next);
    },
  },
);
