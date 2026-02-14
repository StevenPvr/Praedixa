"use client";

import { Player } from "@remotion/player";
import { CalibreComposition } from "./CalibreComposition";
import type { Locale } from "../../lib/i18n/config";

interface CalibrePlayerProps {
  locale: Locale;
}

/**
 * Remotion Player wrapper for the watch calibre animation.
 * Plays inline, loops silently, no controls.
 * Dynamic-imported with ssr:false in HeroSection.
 */
export default function CalibrePlayer({ locale }: CalibrePlayerProps) {
  return (
    <Player
      component={CalibreComposition}
      compositionWidth={480}
      compositionHeight={480}
      durationInFrames={30 * 24} // 24 seconds at 30fps, then loops
      fps={30}
      loop
      autoPlay
      inputProps={{ locale }}
      style={{
        width: "100%",
        height: "100%",
        background: "transparent",
      }}
      controls={false}
      showPosterWhenUnplayed={false}
      clickToPlay={false}
    />
  );
}
