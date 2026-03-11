"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

interface HeroBackgroundVideoProps {
  className?: string;
  poster: string;
  src: string;
}

const VIDEO_START_DELAY_MS = 320;
const VIDEO_RESUME_DELAY_MS = 140;

type IdleWindow = Window & {
  cancelIdleCallback?: (handle: number) => void;
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ) => number;
};

type NavigatorWithConnection = Navigator & {
  connection?: {
    saveData?: boolean;
  };
};

function configureInlinePlayback(video: HTMLVideoElement) {
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

function shouldSkipVideoUpgrade() {
  if (typeof window === "undefined") {
    return true;
  }

  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return true;
  }

  return Boolean(
    (navigator as NavigatorWithConnection).connection?.saveData,
  );
}

function scheduleVideoUpgrade(activate: () => void) {
  const idleWindow = window as IdleWindow;

  if (typeof idleWindow.requestIdleCallback === "function") {
    const idleHandle = idleWindow.requestIdleCallback(activate, {
      timeout: VIDEO_START_DELAY_MS * 4,
    });

    return () => {
      idleWindow.cancelIdleCallback?.(idleHandle);
    };
  }

  const timeoutId = window.setTimeout(activate, VIDEO_START_DELAY_MS);
  return () => {
    window.clearTimeout(timeoutId);
  };
}

function canResumePlayback(
  video: HTMLVideoElement | null,
): video is HTMLVideoElement {
  return Boolean(
    video &&
      !video.ended &&
      document.visibilityState === "visible" &&
      video.paused,
  );
}

async function resumePlayback(video: HTMLVideoElement | null) {
  if (!canResumePlayback(video)) {
    return;
  }

  configureInlinePlayback(video);
  try {
    await video.play();
  } catch {
    return;
  }
}

export function HeroBackgroundVideo({
  className,
  poster,
  src,
}: HeroBackgroundVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const resumeTimeoutRef = useRef<number | null>(null);
  const [shouldRenderVideo, setShouldRenderVideo] = useState(false);
  const [hasPlaybackError, setHasPlaybackError] = useState(false);
  const [isVideoVisible, setIsVideoVisible] = useState(false);

  useEffect(() => {
    if (shouldSkipVideoUpgrade()) {
      return;
    }

    return scheduleVideoUpgrade(() => {
      setShouldRenderVideo(true);
    });
  }, []);

  useEffect(() => {
    if (!shouldRenderVideo || hasPlaybackError) {
      return;
    }

    const video = videoRef.current;
    if (!video) {
      return;
    }

    const ensurePlayback = () => {
      void resumePlayback(videoRef.current);
    };
    const handleFrameReady = () => {
      setIsVideoVisible(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        ensurePlayback();
      }
    };

    const handlePause = () => {
      const currentVideo = videoRef.current;
      if (!currentVideo || currentVideo.ended) return;
      if (resumeTimeoutRef.current !== null) {
        window.clearTimeout(resumeTimeoutRef.current);
      }
      resumeTimeoutRef.current = window.setTimeout(() => {
        void resumePlayback(videoRef.current);
      }, VIDEO_RESUME_DELAY_MS);
    };

    configureInlinePlayback(video);
    ensurePlayback();

    video.addEventListener("loadeddata", handleFrameReady);
    video.addEventListener("playing", handleFrameReady);
    video.addEventListener("pause", handlePause);
    window.addEventListener("focus", ensurePlayback);
    window.addEventListener("pageshow", ensurePlayback);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (resumeTimeoutRef.current !== null) {
        window.clearTimeout(resumeTimeoutRef.current);
        resumeTimeoutRef.current = null;
      }
      video.removeEventListener("loadeddata", handleFrameReady);
      video.removeEventListener("playing", handleFrameReady);
      video.removeEventListener("pause", handlePause);
      window.removeEventListener("focus", ensurePlayback);
      window.removeEventListener("pageshow", ensurePlayback);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hasPlaybackError, shouldRenderVideo, src]);

  if (!shouldRenderVideo || hasPlaybackError) {
    return null;
  }

  return (
    <video
      ref={videoRef}
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-700 [transition-timing-function:var(--ease-snappy)]",
        isVideoVisible ? "opacity-100" : "opacity-0",
        className,
      )}
      src={src}
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      poster={poster}
      aria-hidden="true"
      disablePictureInPicture
      disableRemotePlayback
      onError={() => setHasPlaybackError(true)}
      onLoadedData={() => setIsVideoVisible(true)}
      onPlaying={() => setIsVideoVisible(true)}
      {...{ "webkit-playsinline": "" }}
    />
  );
}
