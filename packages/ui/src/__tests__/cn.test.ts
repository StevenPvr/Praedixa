import { describe, it, expect } from "vitest";
import { cn } from "../utils/cn";

describe("cn", () => {
  it("returns empty string when called with no arguments", () => {
    expect(cn()).toBe("");
  });

  it("returns empty string when called with empty string", () => {
    expect(cn("")).toBe("");
  });

  it("passes through a single class", () => {
    expect(cn("px-4")).toBe("px-4");
  });

  it("merges multiple classes", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("resolves conflicting Tailwind classes (last wins)", () => {
    expect(cn("px-4", "px-8")).toBe("px-8");
  });

  it("resolves conflicting text size classes", () => {
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });

  it("filters falsy values (false, null, undefined, 0)", () => {
    expect(cn("px-4", false, null, undefined, 0, "py-2")).toBe("px-4 py-2");
  });

  it("handles conditional classes via object syntax", () => {
    expect(cn("base", { "text-red-500": true, "text-blue-500": false })).toBe(
      "base text-red-500",
    );
  });

  it("handles array inputs", () => {
    expect(cn(["px-4", "py-2"])).toBe("px-4 py-2");
  });

  it("handles nested array inputs", () => {
    expect(cn(["px-4", ["py-2", "mt-1"]])).toBe("px-4 py-2 mt-1");
  });

  it("merges conflicting classes within array and direct args", () => {
    expect(cn(["px-4"], "px-8")).toBe("px-8");
  });

  it("handles all-falsy inputs", () => {
    expect(cn(false, null, undefined)).toBe("");
  });
});
