import { describe, expect, it } from "vitest";
import { Fragment, replaceFragment } from "./fragment";

describe(Fragment, () => {
  it("should return a fragment element", () => {
    const child = document.createTextNode("test");
    const result = Fragment({ children: child });

    expect(result).toBeInstanceOf(DocumentFragment);
    expect(result.childNodes).toHaveLength(1);
    expect(result.firstChild).toBe(child);
  });

  it("should ignore boolean and null", () => {
    const result = Fragment({
      children: [document.createTextNode("test"), null, undefined, true, false],
    });

    expect(result.childNodes).toHaveLength(1);
  });

  it("should insert a position placeholder without children", () => {
    const result = Fragment({});

    expect(result.childNodes).toHaveLength(1);
    expect(result.children).toHaveLength(0);
  });

  describe(replaceFragment, () => {
    it("should replace old items with new items", () => {
      const container = document.createElement("div");
      const fragment = Fragment({ children: document.createTextNode("hello") });
      const replacement = Fragment({ children: document.createElement("p") });
      container.append(fragment);

      replaceFragment(fragment, replacement);

      expect(container.childNodes).toHaveLength(1);
      expect(container.firstChild).toBeInstanceOf(HTMLParagraphElement);
    });
  });
});
