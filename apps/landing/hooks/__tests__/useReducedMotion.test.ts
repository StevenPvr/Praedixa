import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

describe("useReducedMotion", () => {
  let listeners: Array<(e: { matches: boolean }) => void>;
  let currentMatches: boolean;

  beforeEach(() => {
    listeners = [];
    currentMatches = false;

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn((query: string) => ({
        matches: currentMatches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(
          (_event: string, cb: (e: { matches: boolean }) => void) => {
            listeners.push(cb);
          },
        ),
        removeEventListener: vi.fn(
          (_event: string, cb: (e: { matches: boolean }) => void) => {
            listeners = listeners.filter((l) => l !== cb);
          },
        ),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return false by default when no preference is set", async () => {
    const { useReducedMotion } = await import("../useReducedMotion");
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it("should return true when prefers-reduced-motion matches", async () => {
    currentMatches = true;
    const { useReducedMotion } = await import("../useReducedMotion");
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it("should respond to change events from the media query", async () => {
    const { useReducedMotion } = await import("../useReducedMotion");
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    // Simulate the user enabling reduced motion
    act(() => {
      for (const listener of listeners) {
        listener({ matches: true });
      }
    });

    expect(result.current).toBe(true);
  });

  it("should clean up the event listener on unmount", async () => {
    const { useReducedMotion } = await import("../useReducedMotion");
    const { unmount } = renderHook(() => useReducedMotion());
    expect(listeners.length).toBeGreaterThan(0);

    unmount();

    // After unmount, the listener should have been removed
    expect(listeners.length).toBe(0);
  });

  it("should query the correct media feature", async () => {
    const { useReducedMotion } = await import("../useReducedMotion");
    renderHook(() => useReducedMotion());
    expect(window.matchMedia).toHaveBeenCalledWith(
      "(prefers-reduced-motion: reduce)",
    );
  });
});
