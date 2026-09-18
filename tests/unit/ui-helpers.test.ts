// @vitest-environment jsdom
/** Vectors for the shared DOM/UX primitives added for the analytics layer. */
import { afterEach, describe, expect, it } from "vitest";
import { onDetached } from "../../src/lib/ui.ts";
import { segmented } from "../../src/components/segmented.ts";

afterEach(() => {
  document.body.replaceChildren();
});

/** MutationObserver callbacks deliver asynchronously — wait for a tick. */
const tick = (): Promise<void> => new Promise((r) => window.setTimeout(r, 0));

describe("onDetached", () => {
  it("fires cleanup exactly once when the element is removed", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    let calls = 0;
    onDetached(el, () => {
      calls += 1;
    });
    el.remove();
    el.remove(); // detached already — must not fire again
    await tick();
    expect(calls).toBe(1);
  });

  it("observes the document, not a specific parent (ancestor removal)", async () => {
    const parent = document.createElement("div");
    const el = document.createElement("div");
    parent.appendChild(el);
    document.body.appendChild(parent);
    let calls = 0;
    onDetached(el, () => {
      calls += 1;
    });
    parent.remove();
    await tick();
    expect(calls).toBe(1);
  });

  it("does not fire while still connected", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    let calls = 0;
    onDetached(el, () => {
      calls += 1;
    });
    document.body.appendChild(document.createElement("hr"));
    expect(calls).toBe(0);
  });

  it("does not fire for an element that was never attached", () => {
    const el = document.createElement("div");
    let calls = 0;
    onDetached(el, () => {
      calls += 1;
    });
    document.body.appendChild(document.createElement("hr"));
    expect(calls).toBe(0);
  });

  it("cancel function prevents the callback (test escape hatch)", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    let calls = 0;
    const cancel = onDetached(el, () => {
      calls += 1;
    });
    cancel();
    el.remove();
    expect(calls).toBe(0);
  });

  it("fires when appended then cleared (router replaceChildren pattern)", async () => {
    const el = document.createElement("div");
    let calls = 0;
    onDetached(el, () => {
      calls += 1;
    });
    // Element never attached: simulate the router appending then clearing.
    document.body.appendChild(el);
    document.body.replaceChildren();
    await tick();
    expect(calls).toBe(1);
  });
});

describe("segmented", () => {
  const opts = [
    { value: "3M", label: "3M" },
    { value: "6M", label: "6M" },
    { value: "All", label: "All" },
  ];

  it("renders a labelled button group with one pressed state", () => {
    const el = segmented("Range", opts, "6M", () => {});
    document.body.appendChild(el);
    expect(el.getAttribute("role")).toBe("group");
    expect(el.getAttribute("aria-label")).toBe("Range");
    const buttons = [...el.querySelectorAll("button")];
    expect(buttons).toHaveLength(3);
    expect(
      buttons.map((b) => b.getAttribute("aria-pressed")),
    ).toEqual(["false", "true", "false"]);
  });

  it("moves the pressed state and reports the new value on click", () => {
    let selected = "";
    const el = segmented("Range", opts, "3M", (v) => {
      selected = v;
    });
    document.body.appendChild(el);
    const buttons = [...el.querySelectorAll("button")];
    buttons[2]?.dispatchEvent(new Event("click", { bubbles: true }));
    expect(selected).toBe("All");
    expect(
      buttons.map((b) => b.getAttribute("aria-pressed")),
    ).toEqual(["false", "false", "true"]);
  });
});
