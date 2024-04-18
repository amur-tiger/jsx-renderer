import { scoped } from "../signal";
import { Fragment, replaceFragment } from "./fragment";

export function render(render: () => JSX.Children): JSX.Element {
  let element = scoped(
    () =>
      Fragment({
        children: render(),
      }),
    {
      onChange: (next) => {
        replaceFragment(element, next);
        element = next;
      },
    },
  );

  return element;
}

export { compute } from "../signal/signal";
