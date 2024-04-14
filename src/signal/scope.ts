import type { ReadonlySignal, SignalEventMap } from "./signal";

const parents = new WeakMap<Scope, Scope>();
const stack: Scope[] = [];
const queue: Scope[] = [];
let isQueued = false;

function enqueue(scope: Scope) {
  if (!queue.includes(scope)) {
    queue.push(scope);
    if (!isQueued) {
      queueMicrotask(() => {
        isQueued = false;
        tick();
      });
    }
  }
}

function hasParent(scope: Scope, parent: Scope) {
  let current = parents.get(scope);
  while (current != null) {
    if (current === parent) {
      return true;
    }
    current = parents.get(current);
  }
  return false;
}

/**
 * Runs all queued scope updates immediately.
 */
export function tick() {
  const scopes = queue.filter((s1) => !queue.some((s2) => hasParent(s1, s2)));
  queue.splice(0);

  for (const scope of scopes) {
    scope.dispatchEvent(new ScopeDisposeEvent("changing"));
    scope.dispatchEvent(new ScopeChangeEvent());
  }
}

export interface ScopeEventMap {
  change: ScopeChangeEvent;
  dispose: ScopeDisposeEvent;
}

export class ScopeChangeEvent extends Event {
  constructor() {
    super("change");
  }
}

export class ScopeDisposeEvent extends Event {
  constructor(readonly reason: "changing" | "closing") {
    super("dispose");
  }
}

export class Scope extends EventTarget {
  public constructor(parent?: Scope) {
    super();

    const p = parent ?? getCurrentScope();
    if (p) {
      parents.set(this, p);

      // dispose self if parent disposes
      p.addEventListener(
        "dispose",
        () => {
          parents.delete(this);
          this.dispatchEvent(new ScopeDisposeEvent("closing"));
        },
        { once: true },
      );
    }
  }

  /**
   * Registers an object in this scope. Whenever the object raises a change event,
   * this scope updates. Only the first change event is captured and objects have to
   * re-register for every execution.
   * @param object
   */
  register(object: EventTarget) {
    object.addEventListener("change", () => enqueue(this), {
      once: true,
    });
  }

  /**
   * Runs a callback within this scope.
   */
  run<T>(callback: () => T): T {
    try {
      stack.push(this);
      return callback();
    } finally {
      stack.pop();
    }
  }
}

export interface Scope {
  addEventListener<K extends keyof ScopeEventMap>(
    event: K,
    callback: (event: ScopeEventMap[K]) => void,
    options?: AddEventListenerOptions | boolean,
  ): void;

  addEventListener(
    event: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: AddEventListenerOptions | boolean,
  ): void;

  removeEventListener<K extends keyof ScopeEventMap>(
    event: K,
    callback: (event: ScopeEventMap[K]) => void,
    options?: EventListenerOptions | boolean,
  ): void;

  removeEventListener(
    event: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean,
  ): void;
}

export interface ScopeOptions<T> {
  onChange?: (next: T) => void;
  scope?: Scope;
}

/**
 * Runs a callback in a new scope. The callback will re-run if signals in the callback change.
 * @param callback
 * @param options
 */
export function scoped<T>(callback: () => T, options?: ScopeOptions<T>): T {
  const scope = options?.scope ?? new Scope();

  const changeHandler = () => {
    const nextValue = scope.run(callback);
    options?.onChange?.(nextValue);
  };

  const disposeHandler = (event: ScopeDisposeEvent) => {
    if (event.reason === "closing") {
      scope.removeEventListener("change", changeHandler);
      scope.removeEventListener("dispose", disposeHandler);
    }
  };

  scope.addEventListener("change", changeHandler);
  scope.addEventListener("dispose", disposeHandler);

  return scope.run(callback);
}

/**
 * Returns the currently running scope, if any.
 */
export function getCurrentScope(): Scope | undefined {
  return stack[stack.length - 1];
}

/**
 * Registers a dispose function. The function will be called when the current scope is disposed.
 * @param dispose
 */
export function onDispose(dispose: () => void) {
  getCurrentScope()?.addEventListener("dispose", dispose, { once: true });
}

/**
 * Creates an effect that will re-run the callback every time a signal within changes.
 * @param callback
 */
export function effect(callback: () => void | (() => void)) {
  scoped(() => {
    const cleanup = callback();
    if (typeof cleanup === "function") {
      onDispose(cleanup);
    }
  });
}

/**
 * Creates an event handler that will be automatically cleaned up when the current scope disposes.
 * @param target
 * @param type
 * @param listener
 */
export function listen<K extends keyof WindowEventMap>(
  target: Window,
  type: K,
  listener: (event: WindowEventMap[K]) => void,
): void;

/**
 * Creates an event handler that will be automatically cleaned up when the current scope disposes.
 * @param target
 * @param type
 * @param listener
 */
export function listen<K extends keyof HTMLElementEventMap>(
  target: Element,
  type: K,
  listener: (event: HTMLElementEventMap[K]) => void,
): void;

/**
 * Creates an event handler that will be automatically cleaned up when the current scope disposes.
 * @param target
 * @param type
 * @param listener
 */
export function listen<K extends keyof ScopeEventMap>(
  target: Scope,
  type: K,
  listener: (event: ScopeEventMap[K]) => void,
): void;

/**
 * Creates an event handler that will be automatically cleaned up when the current scope disposes.
 * @param target
 * @param type
 * @param listener
 */
export function listen<K extends keyof SignalEventMap, T>(
  target: ReadonlySignal<T>,
  type: K,
  listener: (event: SignalEventMap<T>[K]) => void,
): void;

/**
 * Creates an event handler that will be automatically cleaned up when the current scope disposes.
 * @param target
 * @param type
 * @param listener
 */
export function listen(
  target: EventTarget,
  type: string,
  listener: (event: Event) => void,
): void;

export function listen(
  target: EventTarget,
  type: string,
  listener: (event: Event) => void,
) {
  target.addEventListener(type, listener);
  onDispose(() => target.removeEventListener(type, listener));
}
