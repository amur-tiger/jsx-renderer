import {
  type ComputeOptions,
  createSignal,
  ReadonlySignal,
  Signal,
  type SignalOptions,
} from "./signal";

interface ActionOperations<T> {
  set(value: Partial<T> | ((previous: T) => Partial<T>)): void;

  get(): T;

  compute<R>(
    callback: (state: T) => R,
    opts?: ComputeOptions<R>,
  ): ReadonlySignal<R>;
}

type ActionDefinitions<T> = Record<
  string,
  (ops: ActionOperations<T>, ...args: any[]) => any
>;

type Actions<A> = {
  [K in keyof A]: A[K] extends (ops: any, ...args: infer P) => infer R
    ? (...args: P) => R
    : never;
};

type Store<T, A> = Signal<T> & Actions<A>;

export function createStore<T, A extends ActionDefinitions<T>>(
  initial: T,
  actions?: A,
  options?: SignalOptions<T>,
): Store<T, A> {
  const signal = createSignal(initial, options);

  if (actions == null) {
    return signal as Store<T, A>;
  }

  const ops: ActionOperations<T> = {
    get: () => signal.value,
    set: (val) => {
      const current = signal.peek();
      signal.value = {
        ...current,
        ...(typeof val === "function" ? val(current) : val),
      };
    },
    compute: (callback, opts) =>
      ReadonlySignal.fromCompute(() => callback(signal.value), opts),
  };

  return Object.assign(
    signal,
    Object.fromEntries(
      Object.entries(actions).map(([key, fn]) => [
        key,
        (...args: any[]) => fn(ops, ...args),
      ]),
    ),
  ) as Store<T, A>;
}
