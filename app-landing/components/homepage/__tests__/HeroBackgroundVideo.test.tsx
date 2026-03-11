import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HeroBackgroundVideo } from "../HeroBackgroundVideo";

function createMediaQueryList(matches: boolean): MediaQueryList {
  return {
    matches,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn().mockReturnValue(true),
  };
}

describe("HeroBackgroundVideo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue(createMediaQueryList(false)),
    });
    Object.defineProperty(window.navigator, "connection", {
      configurable: true,
      value: { saveData: false },
    });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("upgrades from poster to video after hydration without waiting for user interaction", () => {
    const { container } = render(
      <HeroBackgroundVideo
        poster="/hero-video/poster.jpg"
        src="/hero-video/background.mp4"
      />,
    );

    expect(container.querySelector("video")).toBeNull();

    act(() => {
      vi.runAllTimers();
    });

    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute("src", "/hero-video/background.mp4");
    expect(video).toHaveAttribute("muted");
    expect(video).toHaveAttribute("autoplay");
    expect(video).toHaveAttribute("loop");
    expect(video).toHaveAttribute("defaultmuted");
    expect(video).toHaveAttribute("playsinline");
    expect(video).toHaveAttribute("webkit-playsinline");
    expect(video).toHaveAttribute("preload", "metadata");
  });

  it("keeps the poster-only experience when reduced motion is requested", () => {
    vi.mocked(window.matchMedia).mockReturnValue(createMediaQueryList(true));

    const { container } = render(
      <HeroBackgroundVideo
        poster="/hero-video/poster.jpg"
        src="/hero-video/background.mp4"
      />,
    );

    act(() => {
      vi.runAllTimers();
    });

    expect(container.querySelector("video")).toBeNull();
  });

  it("keeps the poster-only experience when save-data is enabled", () => {
    Object.defineProperty(window.navigator, "connection", {
      configurable: true,
      value: { saveData: true },
    });

    const { container } = render(
      <HeroBackgroundVideo
        poster="/hero-video/poster.jpg"
        src="/hero-video/background.mp4"
      />,
    );

    act(() => {
      vi.runAllTimers();
    });

    expect(container.querySelector("video")).toBeNull();
  });

  it("retries playback after an unexpected pause", () => {
    const playSpy = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockResolvedValue(undefined);

    const { container } = render(
      <HeroBackgroundVideo
        poster="/hero-video/poster.jpg"
        src="/hero-video/background.mp4"
      />,
    );

    act(() => {
      vi.runAllTimers();
    });

    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    video?.dispatchEvent(new Event("pause"));
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(playSpy).toHaveBeenCalled();
  });

  it("falls back to the poster when the video asset errors", () => {
    const { container } = render(
      <HeroBackgroundVideo
        poster="/hero-video/poster.jpg"
        src="/hero-video/background.mp4"
      />,
    );

    act(() => {
      vi.runAllTimers();
    });

    const video = container.querySelector("video");
    expect(video).not.toBeNull();

    act(() => {
      video?.dispatchEvent(new Event("error"));
    });

    expect(container.querySelector("video")).toBeNull();
  });
});
