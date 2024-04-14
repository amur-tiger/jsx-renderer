import { describe, expect, it, vi } from "vitest";
import { effect, getCurrentScope, onDispose, scoped, tick } from "./scope";

describe(scoped, () => {
  it("should detect change", () => {
    const onChange = vi.fn();
    const data = new EventTarget();

    scoped(
      () => {
        getCurrentScope().register(data);
      },
      { onChange },
    );

    data.dispatchEvent(new Event("change"));

    tick();
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("should re-run on change", () => {
    const fn = vi.fn();
    const data = new EventTarget();

    scoped(() => {
      getCurrentScope().register(data);
      fn();
    });

    data.dispatchEvent(new Event("change"));

    tick();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("should not detect in parent scope", () => {
    const innerFn = vi.fn();
    const outerFn = vi.fn();
    const data = new EventTarget();

    scoped(
      () => {
        scoped(
          () => {
            getCurrentScope().register(data);
          },
          { onChange: innerFn },
        );
      },
      { onChange: outerFn },
    );

    data.dispatchEvent(new Event("change"));

    tick();
    expect(innerFn).toHaveBeenCalledOnce();
    expect(outerFn).not.toHaveBeenCalled();
  });

  it("should not update child scope if parent is also called", () => {
    const innerFn = vi.fn();
    const outerFn = vi.fn();
    const data = new EventTarget();

    scoped(
      () => {
        scoped(
          () => {
            getCurrentScope().register(data);
          },
          { onChange: innerFn },
        );
        getCurrentScope().register(data);
      },
      { onChange: outerFn },
    );

    data.dispatchEvent(new Event("change"));

    tick();
    expect(innerFn).not.toHaveBeenCalled();
    expect(outerFn).toHaveBeenCalledOnce();
  });

  it("should batch changes", () => {
    const onChange = vi.fn();
    const data1 = new EventTarget();
    const data2 = new EventTarget();

    scoped(
      () => {
        getCurrentScope().register(data1);
        getCurrentScope().register(data2);
      },
      { onChange },
    );

    data1.dispatchEvent(new Event("change"));
    data2.dispatchEvent(new Event("change"));

    tick();
    expect(onChange).toHaveBeenCalledOnce();
  });
});

describe(onDispose, () => {
  it("should call dispose handler when re-rendering", () => {
    const fn = vi.fn();
    const data = new EventTarget();

    scoped(() => {
      getCurrentScope().register(data);
      onDispose(fn);
    });

    data.dispatchEvent(new Event("change"));

    tick();
    expect(fn).toHaveBeenCalledOnce();
  });

  it("should call dispose when parent re-renders", () => {
    const dispose = vi.fn();
    const data = new EventTarget();

    scoped(() => {
      scoped(() => {
        onDispose(dispose);
      });
      getCurrentScope().register(data);
    });

    data.dispatchEvent(new Event("change"));

    tick();
    expect(dispose).toHaveBeenCalledOnce();
  });
});

describe(effect, () => {
  it("should run immediately", () => {
    const fn = vi.fn();

    effect(fn);

    expect(fn).toHaveBeenCalledOnce();
  });

  it("should run when the contained signals update", () => {
    const fn = vi.fn();
    const data = new EventTarget();

    effect(() => {
      getCurrentScope().register(data);
      fn();
    });

    data.dispatchEvent(new Event("change"));

    tick();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("should call the cleanup function on dispose", () => {
    const fn = vi.fn();
    const data = new EventTarget();

    effect(() => {
      getCurrentScope().register(data);
      return fn;
    });

    data.dispatchEvent(new Event("change"));

    tick();
    expect(fn).toHaveBeenCalledOnce();
  });
});
