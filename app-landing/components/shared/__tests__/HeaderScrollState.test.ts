import { describe, expect, it } from "vitest";
import { resolveHeaderScrollState } from "../header-scroll-state";

describe("resolveHeaderScrollState", () => {
  it("keeps the header visible when the page is near the top", () => {
    expect(
      resolveHeaderScrollState({
        currentY: 12,
        previousY: 0,
        hidden: false,
      }),
    ).toEqual({ hidden: false, elevated: false });
  });

  it("keeps the header visible but elevated during the first scroll band", () => {
    expect(
      resolveHeaderScrollState({
        currentY: 56,
        previousY: 24,
        hidden: false,
      }),
    ).toEqual({ hidden: false, elevated: true });
  });

  it("hides the header after a meaningful downward scroll", () => {
    expect(
      resolveHeaderScrollState({
        currentY: 240,
        previousY: 210,
        hidden: false,
      }),
    ).toEqual({ hidden: true, elevated: true });
  });

  it("reveals the header after a meaningful upward scroll", () => {
    expect(
      resolveHeaderScrollState({
        currentY: 260,
        previousY: 312,
        hidden: true,
      }),
    ).toEqual({ hidden: false, elevated: true });
  });

  it("keeps the previous visibility when the scroll delta is only micro jitter", () => {
    expect(
      resolveHeaderScrollState({
        currentY: 188,
        previousY: 182,
        hidden: true,
      }),
    ).toEqual({ hidden: true, elevated: true });
  });
});
