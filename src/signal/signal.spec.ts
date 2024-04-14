import { describe, expect, it, vi } from "vitest";
import { Scope, tick } from "./scope";
import { SignalChangeEvent, compute, createSignal } from "./signal";

describe(createSignal, () => {
  describe("init", () => {
    it("should use undefined as default", () => {
      const data = createSignal();

      expect(data.value).toBeUndefined();
    });

    it("should save the given value", () => {
      const data = createSignal("hello");

      expect(data.value).toBe("hello");
    });
  });

  describe("peek", () => {
    it("should return the value", () => {
      const data = createSignal("boo");

      expect(data.peek()).toBe("boo");
    });

    it("should not emit change event", () => {
      const scope = new Scope();
      const data = createSignal("boo");

      vi.spyOn(scope, "register");

      scope.run(() => data.peek());
      data.value = "baz";

      tick();
      expect(scope.register).not.toHaveBeenCalled();
    });
  });

  describe("set", () => {
    it("should set the value", () => {
      const data = createSignal(7);

      data.value = 13;

      expect(data.value).toBe(13);
    });

    it("should emit change event", () => {
      const fn = vi.fn();
      const data = createSignal<number>(9);
      data.addEventListener("change", fn);

      data.value = 28;

      expect(fn).toHaveBeenCalledWith(expect.any(SignalChangeEvent));
      expect(fn).toHaveBeenCalledWith(
        expect.objectContaining({
          target: data,
          oldValue: 9,
          newValue: 28,
        }),
      );
    });

    it("should use provided equals method", () => {
      const onChange = vi.fn();
      const data = createSignal(6, {
        equals(previous, next) {
          return previous % 2 === next % 2;
        },
      });

      data.addEventListener("change", onChange);
      data.value = 8;

      tick();
      expect(onChange).not.toHaveBeenCalled();
    });
  });
});

describe(compute, () => {
  it("should return a signal", () => {
    const data = compute(() => 1);

    expect(data.value).toBe(1);
  });

  it("should recalculate if signals change", () => {
    const signal = createSignal(1);
    const data = compute(() => signal.value * 2);

    expect(data.value).toBe(2);

    signal.value = 2;

    tick();
    expect(data.value).toBe(4);
  });
});
