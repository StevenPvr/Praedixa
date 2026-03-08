"use client";

import { useEffect, useRef } from "react";
import { cn } from "../../lib/utils";

interface HeroBackgroundVideoProps {
  className?: string;
  poster: string;
  webmSrc?: string;
  mp4Src: string;
}

const WEBM_MIME_TYPE = 'video/webm; codecs="vp9, opus"';
const MP4_MIME_TYPE = 'video/mp4; codecs="avc1.640028"';

function configureInlinePlayback(video: HTMLVideoElement): void {
  video.autoplay = true;
  video.loop = true;
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute("autoplay", "");
  video.setAttribute("defaultmuted", "");
  video.setAttribute("loop", "");
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
}

function resumePlayback(video: HTMLVideoElement | null): void {
  if (
    !video ||
    video.ended ||
    document.visibilityState === "hidden" ||
    !video.paused
  ) {
    return;
  }

  configureInlinePlayback(video);
  void video.play().catch(() => undefined);
}

export function HeroBackgroundVideo({
  className,
  poster,
  webmSrc,
  mp4Src,
}: HeroBackgroundVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const ensurePlayback = () => resumePlayback(videoRef.current);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        ensurePlayback();
      }
    };

    const handlePause = () => {
      const currentVideo = videoRef.current;
      if (!currentVideo || currentVideo.ended) return;
      window.setTimeout(() => {
        resumePlayback(videoRef.current);
      }, 150);
    };

    video.addEventListener("pause", handlePause);
    window.addEventListener("focus", ensurePlayback);
    window.addEventListener("pageshow", ensurePlayback);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("pointerdown", ensurePlayback, {
      once: true,
      passive: true,
    });
    document.addEventListener("touchstart", ensurePlayback, {
      once: true,
      passive: true,
    });
    document.addEventListener("keydown", ensurePlayback, { once: true });

    configureInlinePlayback(video);

    return () => {
      video.removeEventListener("pause", handlePause);
      window.removeEventListener("focus", ensurePlayback);
      window.removeEventListener("pageshow", ensurePlayback);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("pointerdown", ensurePlayback);
      document.removeEventListener("touchstart", ensurePlayback);
      document.removeEventListener("keydown", ensurePlayback);
    };
  }, [mp4Src, webmSrc]);

  return (
    <video
      ref={videoRef}
      className={cn("absolute inset-0 h-full w-full object-cover", className)}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      poster={poster}
      aria-hidden="true"
      disablePictureInPicture
      {...{ "webkit-playsinline": "", defaultmuted: "" }}
    >
      <source src={mp4Src} type={MP4_MIME_TYPE} />
      {webmSrc ? <source src={webmSrc} type={WEBM_MIME_TYPE} /> : null}
    </video>
  );
}
