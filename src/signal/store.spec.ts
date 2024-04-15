import { describe, expect, it } from "vitest";
import { tick } from "./scope";
import { createStore } from "./store";
import { ReadonlySignal } from "./signal";

describe(createStore, () => {
  it("should save a value", () => {
    const store = createStore({
      counter: 1,
    });

    expect(store.value).toStrictEqual({ counter: 1 });
  });

  it("should apply actions to signal", () => {
    const store = createStore(
      {
        counter: 1,
      },
      {
        zero({ set }) {
          set({ counter: 0 });
        },
      },
    );

    store.zero();

    tick();
    expect(store.value).toStrictEqual({ counter: 0 });
  });

  it("should set with mutation function", () => {
    const store = createStore(
      {
        counter: 1,
      },
      {
        inc({ set }, by: number) {
          set((state) => ({ counter: state.counter + by }));
        },
      },
    );

    store.inc(2);

    tick();
    expect(store.value).toStrictEqual({ counter: 3 });
  });

  it("should return a value", () => {
    const store = createStore(
      {
        counter: 1,
      },
      {
        get({ get }) {
          return get().counter;
        },
      },
    );

    const result = store.get();

    expect(result).toBe(1);
  });

  it("should return a computed value", () => {
    const store = createStore(
      {
        counter: 1,
      },
      {
        get({ compute }) {
          return compute((state) => state.counter);
        },
      },
    );

    const result = store.get();

    expect(result).toBeInstanceOf(ReadonlySignal);
    expect(result.value).toBe(1);
  });

  it("should refresh computed values", () => {
    const store = createStore(
      {
        counter: 1,
      },
      {
        get({ compute }) {
          return compute((state) => state.counter);
        },
      },
    );

    const result = store.get();
    store.value = { counter: 3 };

    tick();
    expect(result.value).toBe(3);
  });

  it("should apply equals function to store", () => {
    const store = createStore(
      {
        counter: 1,
      },
      {},
      {
        equals() {
          return true;
        },
      },
    );

    store.value = { counter: 3 };

    tick();
    expect(store.value).toStrictEqual({ counter: 1 });
  });

  it("should apply equals function to computed values", () => {
    const store = createStore(
      {
        counter: 1,
      },
      {
        get({ compute }) {
          return compute((state) => state.counter, { equals: () => true });
        },
      },
    );

    const result = store.get();
    store.value = { counter: 3 };

    tick();
    expect(result.value).toBe(1);
  });
});
