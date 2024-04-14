import { scoped } from "../signal";
import { Fragment } from "./jsx-runtime";

export function render(render: () => JSX.Children): JSX.Element {
  let element = scoped(
    () =>
      Fragment({
        children: render(),
      }),
    {
      onChange: (next) => {
        Fragment.replace(element, next);
        element = next;
      },
    },
  );

  return element;
}

export { compute } from "../signal/signal";
