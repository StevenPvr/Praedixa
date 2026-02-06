import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMediaQuery, breakpoints } from "../hooks/use-media-query";

describe("useMediaQuery", () => {
  let addEventListenerSpy: ReturnType<typeof vi.fn>;
  let removeEventListenerSpy: ReturnType<typeof vi.fn>;
  let listeners: Map<string, (event: { matches: boolean }) => void>;

  beforeEach(() => {
    listeners = new Map();
    addEventListenerSpy = vi.fn(
      (event: string, cb: (e: { matches: boolean }) => void) => {
        if (event === "change") listeners.set(event, cb);
      },
    );
    removeEventListenerSpy = vi.fn();

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: addEventListenerSpy,
        removeEventListener: removeEventListenerSpy,
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("returns false initially (matches=false)", () => {
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);
  });

  it("returns true when matchMedia initially matches", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: addEventListenerSpy,
        removeEventListener: removeEventListenerSpy,
        dispatchEvent: vi.fn(),
      })),
    });

    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(true);
  });

  it("responds to media change events", () => {
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);

    // Simulate media query change
    const changeHandler = listeners.get("change");
    expect(changeHandler).toBeDefined();

    act(() => {
      changeHandler!({ matches: true });
    });
    expect(result.current).toBe(true);

    act(() => {
      changeHandler!({ matches: false });
    });
    expect(result.current).toBe(false);
  });

  it("adds change event listener on mount", () => {
    renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
  });

  it("removes event listener on unmount", () => {
    const { unmount } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
  });

  it("re-subscribes when query changes", () => {
    const { rerender } = renderHook(
      ({ query }: { query: string }) => useMediaQuery(query),
      { initialProps: { query: "(min-width: 768px)" } },
    );

    // First subscription
    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);

    // Change query
    rerender({ query: "(min-width: 1024px)" });

    // Should have removed old and added new
    expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
    expect(addEventListenerSpy).toHaveBeenCalledTimes(2);
  });
});

describe("breakpoints", () => {
  it("defines standard Tailwind breakpoints", () => {
    expect(breakpoints.sm).toBe("(min-width: 640px)");
    expect(breakpoints.md).toBe("(min-width: 768px)");
    expect(breakpoints.lg).toBe("(min-width: 1024px)");
    expect(breakpoints.xl).toBe("(min-width: 1280px)");
    expect(breakpoints["2xl"]).toBe("(min-width: 1536px)");
  });

  it("has exactly 5 breakpoint keys", () => {
    expect(Object.keys(breakpoints)).toHaveLength(5);
  });
});
