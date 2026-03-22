"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface HeroV2ClientProps {
  poster: string;
  videoSrc: string;
}

function canUpgradeHeroVideo() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }

  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  return !nav.connection?.saveData;
}

function startHeroVideo(video: HTMLVideoElement) {
  video.muted = true;
  video.playsInline = true;
  video.loop = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.play().catch(() => {});
}

export function HeroV2Client({ poster, videoSrc }: HeroV2ClientProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);

  const upgradeVideo = useCallback(() => {
    if (canUpgradeHeroVideo()) setReady(true);
  }, []);

  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(upgradeVideo, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(upgradeVideo, 1200);
    return () => clearTimeout(timer);
  }, [upgradeVideo]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !ready) return;
    startHeroVideo(video);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") return startHeroVideo(video);
      video.pause();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [ready]);

  if (!ready) return null;

  return (
    <video
      ref={videoRef}
      poster={poster}
      className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 [&[data-loaded]]:opacity-100"
      onLoadedData={(e) =>
        ((e.target as HTMLVideoElement).dataset["loaded"] = "true")
      }
      aria-hidden="true"
    >
      <source src={videoSrc} type="video/mp4" />
    </video>
  );
}
