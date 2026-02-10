import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAnimatedNumber } from "../use-animated-number";

vi.mock("@/lib/animations/config", () => ({
  DURATION: { number: 0.4 },
}));

describe("useAnimatedNumber", () => {
  let rafCallbacks: ((time: number) => void)[];
  let rafIdCounter: number;
  let originalRaf: typeof requestAnimationFrame;
  let originalCaf: typeof cancelAnimationFrame;

  beforeEach(() => {
    rafCallbacks = [];
    rafIdCounter = 0;
    originalRaf = globalThis.requestAnimationFrame;
    originalCaf = globalThis.cancelAnimationFrame;

    globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return ++rafIdCounter;
    }) as unknown as typeof requestAnimationFrame;

    globalThis.cancelAnimationFrame = vi.fn();

    // Default: prefers-reduced-motion is off
    vi.spyOn(window, "matchMedia").mockImplementation(() => ({
      matches: false,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    globalThis.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = originalCaf;
    vi.restoreAllMocks();
  });

  function flushRaf(time: number) {
    const cbs = [...rafCallbacks];
    rafCallbacks = [];
    cbs.forEach((cb) => cb(time));
  }

  describe("animation", () => {
    it("starts at 0", () => {
      const { result } = renderHook(() => useAnimatedNumber(100));
      expect(result.current).toBe(0);
    });

    it("animates toward the target over time", () => {
      vi.spyOn(performance, "now").mockReturnValue(0);

      const { result } = renderHook(() => useAnimatedNumber(100, 400));

      // First rAF call registers the step function
      // Simulate halfway through animation
      vi.spyOn(performance, "now").mockReturnValue(200);
      act(() => flushRaf(200));
      expect(result.current).toBe(50);
    });

    it("reaches the target at the end of the animation", () => {
      vi.spyOn(performance, "now").mockReturnValue(0);

      const { result } = renderHook(() => useAnimatedNumber(200, 400));

      // Complete the animation
      vi.spyOn(performance, "now").mockReturnValue(400);
      act(() => flushRaf(400));
      expect(result.current).toBe(200);
    });

    it("does not overshoot the target", () => {
      vi.spyOn(performance, "now").mockReturnValue(0);

      const { result } = renderHook(() => useAnimatedNumber(100, 400));

      // Time past the animation duration
      vi.spyOn(performance, "now").mockReturnValue(600);
      act(() => flushRaf(600));
      expect(result.current).toBe(100);
    });

    it("requests another animation frame when progress < 1", () => {
      vi.spyOn(performance, "now").mockReturnValue(0);

      renderHook(() => useAnimatedNumber(100, 400));

      // Simulate partial progress
      vi.spyOn(performance, "now").mockReturnValue(100);
      act(() => flushRaf(100));

      // Should have requested another frame
      expect(globalThis.requestAnimationFrame).toHaveBeenCalledTimes(2);
    });

    it("does not request another frame when progress = 1", () => {
      vi.spyOn(performance, "now").mockReturnValue(0);

      renderHook(() => useAnimatedNumber(100, 400));

      // Initial rAF call count
      const initialCallCount = (
        globalThis.requestAnimationFrame as ReturnType<typeof vi.fn>
      ).mock.calls.length;

      // Complete animation
      vi.spyOn(performance, "now").mockReturnValue(400);
      act(() => flushRaf(400));

      // Should NOT have requested another frame (only +0, no more)
      expect(
        (globalThis.requestAnimationFrame as ReturnType<typeof vi.fn>).mock
          .calls.length,
      ).toBe(initialCallCount);
    });
  });

  describe("prefers-reduced-motion", () => {
    it("returns target immediately when prefers-reduced-motion is active", () => {
      vi.spyOn(window, "matchMedia").mockImplementation(() => ({
        matches: true,
        media: "",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { result } = renderHook(() => useAnimatedNumber(42));
      expect(result.current).toBe(42);
    });

    it("does not call requestAnimationFrame when reduced motion is enabled", () => {
      vi.spyOn(window, "matchMedia").mockImplementation(() => ({
        matches: true,
        media: "",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      renderHook(() => useAnimatedNumber(42));
      expect(globalThis.requestAnimationFrame).not.toHaveBeenCalled();
    });
  });

  describe("cleanup", () => {
    it("cancels animation frame on unmount", () => {
      vi.spyOn(performance, "now").mockReturnValue(0);

      const { unmount } = renderHook(() => useAnimatedNumber(100, 400));
      unmount();

      expect(globalThis.cancelAnimationFrame).toHaveBeenCalled();
    });
  });

  describe("custom duration", () => {
    it("uses default duration from config when not specified", () => {
      vi.spyOn(performance, "now").mockReturnValue(0);

      const { result } = renderHook(() => useAnimatedNumber(100));

      // At 200ms (half of default 400ms)
      vi.spyOn(performance, "now").mockReturnValue(200);
      act(() => flushRaf(200));
      expect(result.current).toBe(50);
    });

    it("uses custom duration when specified", () => {
      vi.spyOn(performance, "now").mockReturnValue(0);

      const { result } = renderHook(() => useAnimatedNumber(100, 1000));

      // At 500ms (half of 1000ms)
      vi.spyOn(performance, "now").mockReturnValue(500);
      act(() => flushRaf(500));
      expect(result.current).toBe(50);
    });
  });
});
