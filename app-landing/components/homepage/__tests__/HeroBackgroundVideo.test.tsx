import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HeroBackgroundVideo } from "../HeroBackgroundVideo";

describe("HeroBackgroundVideo", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  });

  it("renders native source tags and inline autoplay attributes immediately", () => {
    const { container } = render(
      <HeroBackgroundVideo
        poster="/hero-video/poster.jpg"
        webmSrc="/hero-video/background.webm"
        mp4Src="/hero-video/background.mp4"
      />,
    );

    const video = container.querySelector("video");
    const sources = container.querySelectorAll("source");
    expect(video).not.toBeNull();
    expect(sources).toHaveLength(2);
    expect(sources[0]?.getAttribute("src")).toBe("/hero-video/background.mp4");
    expect(sources[1]?.getAttribute("src")).toBe("/hero-video/background.webm");
    expect(video).toHaveAttribute("muted");
    expect(video).toHaveAttribute("autoplay");
    expect(video).toHaveAttribute("loop");
    expect(video).toHaveAttribute("playsinline");
    expect(video).toHaveAttribute("webkit-playsinline");
  });

  it("retries playback after an unexpected pause", () => {
    vi.useFakeTimers();
    const playSpy = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockResolvedValue(undefined);

    const { container } = render(
      <HeroBackgroundVideo
        poster="/hero-video/poster.jpg"
        webmSrc="/hero-video/background.webm"
        mp4Src="/hero-video/background.mp4"
      />,
    );

    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    video?.dispatchEvent(new Event("pause"));
    vi.advanceTimersByTime(200);
    expect(playSpy).toHaveBeenCalled();
  });
});
