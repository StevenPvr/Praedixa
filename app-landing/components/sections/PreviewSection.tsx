"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRightIcon } from "../icons";
import { PreviewEmbeddedDemo } from "../demo/preview-embedded-demo";
import { EVENTS, trackEvent } from "../../lib/analytics/events";
import { sectionReveal, viewportOnce } from "../../lib/animations/variants";
import type { Locale } from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";

interface PreviewSectionProps {
  dict: Dictionary;
  locale: Locale;
}

export function PreviewSection({ dict, locale }: PreviewSectionProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isDemoActive, setIsDemoActive] = useState(false);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        setShouldLoadVideo(true);
        observer.disconnect();
      },
      { rootMargin: "260px 0px", threshold: 0.1 },
    );

    observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const mediaQuery = window.matchMedia("(hover: none), (pointer: coarse)");
    const update = () => setIsTouchDevice(mediaQuery.matches);
    update();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
      return () => mediaQuery.removeEventListener("change", update);
    }

    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, []);

  const handleDemoClick = () => {
    trackEvent(EVENTS.CTA_CLICK_PREVIEW_DEMO, {
      locale,
      source: "preview_screen",
    });
    setIsDemoActive(true);
  };

  const handleBackToVideo = () => {
    setIsDemoActive(false);
  };

  return (
    <section
      id="preview"
      className="section-spacing section-dark relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent opacity-50" />

      <div className="section-shell relative z-10">
        <motion.div
          className="text-center"
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <span className="section-kicker">{dict.preview.kicker}</span>
          <h2 className="section-title mt-4 text-white">
            {dict.preview.heading}
          </h2>
          <p className="section-lead mx-auto mt-4 max-w-2xl text-white/70">
            {dict.preview.subheading}
          </p>
        </motion.div>

        <motion.div
          className="mt-16 select-none md:mt-24"
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <div className="screen-modern-shell mx-auto max-w-6xl transform-gpu [transform:perspective(2200px)] lg:[transform:perspective(2200px)_rotateX(0.6deg)]">
            <div className="screen-modern-chassis">
              <div className="screen-modern-topbar" aria-hidden="true">
                <div className="screen-modern-controls">
                  <span className="screen-modern-dot" />
                  <span className="screen-modern-dot" />
                  <span className="screen-modern-dot" />
                </div>
                <span className="screen-modern-camera" />
              </div>

              <div className="screen-modern-viewport">
                <div
                  ref={panelRef}
                  className={`screen-modern-panel screen-modern-interactive${isTouchDevice ? " screen-modern-touch" : ""}${isDemoActive ? " is-demo-active" : ""}`}
                >
                  {isDemoActive ? <PreviewEmbeddedDemo dict={dict} /> : null}

                  {!isDemoActive ? (
                    shouldLoadVideo ? (
                      <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="metadata"
                        poster="/dashboard-poster.jpg"
                        className="screen-modern-video"
                        aria-label={dict.demo.screenAriaLabel}
                      >
                        <source
                          src="/dashboard-preview-1920.webm"
                          type="video/webm"
                          media="(min-width: 1024px)"
                        />
                        <source
                          src="/dashboard-preview-1280.webm"
                          type="video/webm"
                        />
                        <source
                          src="/dashboard-preview.webm"
                          type="video/webm"
                        />
                        <source
                          src="/dashboard-preview-1920.mp4"
                          type="video/mp4"
                          media="(min-width: 1024px)"
                        />
                        <source
                          src="/dashboard-preview-1280.mp4"
                          type="video/mp4"
                        />
                        <source src="/dashboard-preview.mp4" type="video/mp4" />
                      </video>
                    ) : (
                      <div
                        className="screen-modern-poster"
                        role="img"
                        aria-label={dict.preview.loadingLabel}
                      />
                    )
                  ) : null}

                  {isDemoActive ? (
                    <div className="screen-modern-inline-controls">
                      <button
                        type="button"
                        onClick={handleBackToVideo}
                        className="screen-modern-overlay-cta"
                      >
                        {dict.preview.overlayBackCta}
                        <ArrowRightIcon className="h-3.5 w-3.5 rotate-180" />
                      </button>
                    </div>
                  ) : null}

                  <div className="screen-modern-overlay">
                    <div className="screen-modern-overlay-content">
                      <p className="screen-modern-overlay-eyebrow">
                        {dict.preview.overlayTitle}
                      </p>
                      <p className="screen-modern-overlay-body">
                        {dict.preview.overlayBody}
                      </p>
                      <button
                        type="button"
                        className="screen-modern-overlay-cta"
                        onClick={handleDemoClick}
                      >
                        {dict.preview.overlayCta}
                        <ArrowRightIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="screen-modern-glare" />
                  <div className="screen-modern-vignette" />
                  <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/8" />
                </div>
              </div>

              <div
                className="mt-3 flex items-center justify-center gap-2 opacity-55"
                aria-hidden="true"
              >
                <div className="h-1 w-1 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-slate-700">
                  {dict.preview.liveBadge}
                </span>
              </div>
            </div>

            <div className="screen-modern-stand" aria-hidden="true" />
            <div className="screen-modern-stand-base" aria-hidden="true" />
            <div className="screen-modern-shadow" aria-hidden="true" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
