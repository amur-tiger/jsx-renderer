import { toChildArray } from "./jsx-runtime";

const fragmentRegister = new WeakMap<DocumentFragment, ChildNode[]>();

export interface FragmentProps {
  children?: JSX.Children;
}

export function Fragment({ children }: FragmentProps) {
  const element = document.createDocumentFragment();

  for (const child of toChildArray(children)) {
    if (child != null && typeof child !== "boolean") {
      element.append(child as never);
    }
  }

  if (element.childNodes.length === 0) {
    element.append(document.createTextNode(""));
  }

  fragmentRegister.set(element, Array.from(element.childNodes));

  return element;
}

export function replaceFragment(
  fragment: DocumentFragment,
  next: DocumentFragment,
) {
  const list = fragmentRegister.get(fragment);
  if (list == null || list.length === 0) {
    throw new Error("Given fragment does not exist or is empty.");
  }

  const parent = list[0].parentNode;
  if (parent == null) {
    throw new Error("Given fragment is not attached to the DOM.");
  }

  const children = Array.from(parent.childNodes).reduce<Node[]>(
    (prev, current) => {
      if (list[0] === current) {
        return [...prev, next];
      }
      if (list.includes(current)) {
        return prev;
      }
      return [...prev, current];
    },
    [],
  );

  parent.replaceChildren(...children);
}
