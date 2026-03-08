import { describe, expect, it } from "vitest";
import { getHeroVideoSource, isSafariUserAgent } from "../hero-video";

describe("hero video source selection", () => {
  const webmSrc = "/hero-video/background.webm";
  const mp4Src = "/hero-video/background.mp4";

  it("detects Safari user agents", () => {
    expect(
      isSafariUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
      ),
    ).toBe(true);
  });

  it("does not treat Chrome on iOS as Safari", () => {
    expect(
      isSafariUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0.6312.52 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(false);
  });

  it("forces MP4 on Safari even when WebM support exists", () => {
    expect(
      getHeroVideoSource({
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
        canPlayWebm: true,
        webmSrc,
        mp4Src,
      }),
    ).toBe(mp4Src);
  });

  it("prefers WebM on non-Safari browsers when supported", () => {
    expect(
      getHeroVideoSource({
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        canPlayWebm: true,
        webmSrc,
        mp4Src,
      }),
    ).toBe(webmSrc);
  });

  it("falls back to MP4 when WebM support is unavailable", () => {
    expect(
      getHeroVideoSource({
        userAgent:
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        canPlayWebm: false,
        webmSrc,
        mp4Src,
      }),
    ).toBe(mp4Src);
  });
});
