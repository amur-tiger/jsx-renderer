import { getCurrentScope, scoped } from "./scope";

export interface SignalEventMap<T = unknown> {
  change: SignalChangeEvent<T>;
}

export class SignalChangeEvent<T> extends Event {
  constructor(
    readonly oldValue: T,
    readonly newValue: T,
    readonly isInternal: boolean = false,
  ) {
    super("change");
  }
}

function strictEquals<T>(previous: T, next: T) {
  return previous === next;
}

export interface SignalOptions<T> {
  equals?: (previous: T, next: T) => boolean;
}

export interface ComputeOptions<T> extends SignalOptions<T> {}

export class ReadonlySignal<T> extends EventTarget {
  protected currentValue: T;
  protected readonly equals: (previous: T, next: T) => boolean;

  public constructor(currentValue: T, options?: SignalOptions<T>) {
    super();
    this.currentValue = currentValue;
    this.equals = options?.equals ?? strictEquals;
  }

  /**
   * Creates a readonly signal that updates when the signals in the given callback change.
   * @param callback
   * @param options
   */
  public static fromCompute<T>(
    callback: () => T,
    options?: ComputeOptions<T>,
  ): ReadonlySignal<T> {
    const initial: T = scoped(callback, {
      onChange: (value) => signal.update(value),
    });

    const signal = new ReadonlySignal(initial, options);
    return signal;
  }

  /**
   * Returns the current signal value. Registers this signal in the current scope to react to changes of this signal.
   */
  public get value(): T {
    getCurrentScope()?.register(this);
    return this.currentValue;
  }

  /**
   * Returns the current signal value without registering this signal in the current scope for updating.
   */
  public peek(): T {
    return this.currentValue;
  }

  protected update(value: T) {
    if (this.equals(this.currentValue, value)) {
      return;
    }

    const oldValue = this.currentValue;
    this.currentValue = value;
    this.dispatchEvent(new SignalChangeEvent(oldValue, value));
  }
}

export interface ReadonlySignal<T> {
  addEventListener<K extends keyof SignalEventMap<T>>(
    event: K,
    callback: (event: SignalEventMap<T>[K]) => void,
    options?: AddEventListenerOptions | boolean,
  ): void;

  addEventListener(
    event: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: AddEventListenerOptions | boolean,
  ): void;

  removeEventListener<K extends keyof SignalEventMap<T>>(
    event: K,
    callback: (event: SignalEventMap<T>[K]) => void,
    options?: EventListenerOptions | boolean,
  ): void;

  removeEventListener(
    event: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean,
  ): void;
}

export class Signal<T> extends ReadonlySignal<T> {
  /**
   * Returns the current signal value. Registers this signal in the current scope to react to changes of this signal.
   */
  public get value(): T {
    return super.value;
  }

  /**
   * Updates the signal with a new value. If the value is equal to the old
   * value according to the given equality function, then no update will be triggered.
   * @param value
   */
  public set value(value: T) {
    this.update(value);
  }
}

/**
 * Determines if a variable contains a signal.
 * @param object
 */
export function isSignal(object: unknown): object is ReadonlySignal<unknown> {
  return object != null && object instanceof ReadonlySignal;
}

/**
 * Creates a signal that is initialized with undefined.
 */
export function createSignal<T>(): Signal<T | undefined>;

/**
 * Creates a signal that is initialized with the given value.
 * @param initial
 * @param options
 */
export function createSignal<T>(
  initial: T,
  options?: SignalOptions<T>,
): Signal<T>;

export function createSignal<T>(
  initial?: T,
  options?: SignalOptions<T | undefined>,
): Signal<T | undefined> {
  return new Signal(initial, options);
}

/**
 * Creates a readonly signal that updates when the signals in the given callback change.
 * @param callback
 * @param options
 */
export function compute<T>(
  callback: () => T,
  options?: ComputeOptions<T>,
): ReadonlySignal<T> {
  return ReadonlySignal.fromCompute(callback, options);
}
