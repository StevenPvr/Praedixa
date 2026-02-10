import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// ---------------------------------------------------------------------------
// vi.hoisted ensures these are available before vi.mock factories run
// ---------------------------------------------------------------------------

const { mockUseInView, mockUseScroll, mockUseTransform, mockUseReducedMotion } =
  vi.hoisted(() => ({
    mockUseInView: vi.fn(() => false),
    mockUseScroll: vi.fn(() => ({
      scrollYProgress: { get: () => 0, set: vi.fn(), onChange: vi.fn() },
    })),
    mockUseTransform: vi.fn(() => ({
      get: () => 0,
      set: vi.fn(),
      onChange: vi.fn(),
    })),
    mockUseReducedMotion: vi.fn(() => false),
  }));

vi.mock("framer-motion", () => ({
  useInView: mockUseInView,
  useScroll: mockUseScroll,
  useTransform: mockUseTransform,
}));

vi.mock("../useReducedMotion", () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { useScrollReveal } from "../useScrollReveal";

describe("useScrollReveal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseInView.mockReturnValue(false);
    mockUseReducedMotion.mockReturnValue(false);
  });

  it("should return ref, isRevealed, and progress", () => {
    const { result } = renderHook(() => useScrollReveal());
    expect(result.current).toHaveProperty("ref");
    expect(result.current).toHaveProperty("isRevealed");
    expect(result.current).toHaveProperty("progress");
  });

  it("should have isRevealed=false initially when element is not in view", () => {
    mockUseInView.mockReturnValue(false);
    const { result } = renderHook(() => useScrollReveal());
    expect(result.current.isRevealed).toBe(false);
  });

  it("should have isRevealed=true when element is in view", () => {
    mockUseInView.mockReturnValue(true);
    const { result } = renderHook(() => useScrollReveal());
    expect(result.current.isRevealed).toBe(true);
  });

  it("should have isRevealed=true immediately when reduced motion is preferred", () => {
    mockUseReducedMotion.mockReturnValue(true);
    mockUseInView.mockReturnValue(false);
    const { result } = renderHook(() => useScrollReveal());
    expect(result.current.isRevealed).toBe(true);
  });

  it("should pass default options to useInView", () => {
    renderHook(() => useScrollReveal());
    expect(mockUseInView).toHaveBeenCalledWith(
      expect.anything(), // ref
      expect.objectContaining({
        amount: 0.2,
        once: true,
        margin: "-10% 0px -10% 0px",
      }),
    );
  });

  it("should pass custom options to useInView", () => {
    renderHook(() =>
      useScrollReveal({
        threshold: 0.5,
        once: false,
        rootMargin: "0px" as unknown as undefined,
      }),
    );
    expect(mockUseInView).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        amount: 0.5,
        once: false,
        margin: "0px",
      }),
    );
  });

  it("should call useScroll with target ref and offset", () => {
    renderHook(() => useScrollReveal());
    expect(mockUseScroll).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.anything(),
        offset: ["start end", "end start"],
      }),
    );
  });

  it("should call useTransform to map progress", () => {
    renderHook(() => useScrollReveal());
    expect(mockUseTransform).toHaveBeenCalled();
  });
});
