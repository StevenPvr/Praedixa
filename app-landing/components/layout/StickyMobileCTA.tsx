"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkle } from "@phosphor-icons/react/dist/ssr";
import type { Dictionary } from "../../lib/i18n/types";
import type { Locale } from "../../lib/i18n/config";
import { localizedSlugs } from "../../lib/i18n/config";

interface StickyMobileCTAProps {
  dict: Dictionary;
  locale: Locale;
}

export function StickyMobileCTA({ dict, locale }: StickyMobileCTAProps) {
  const [isVisible, setIsVisible] = useState(false);
  const pilotHref = `/${locale}/${localizedSlugs.pilot[locale]}`;

  useEffect(() => {
    const heroEl = document.getElementById("hero");
    if (!heroEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) setIsVisible(!entry.isIntersecting);
      },
      { threshold: 0.18 },
    );

    observer.observe(heroEl);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-20 border-t border-[var(--line)] bg-[color-mix(in_oklch,var(--panel)_92%,transparent)] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl transition-transform duration-300 md:hidden ${
        isVisible ? "translate-y-0" : "translate-y-full"
      }`}
      aria-hidden={!isVisible}
    >
      <Link
        href={pilotHref}
        className="btn-primary w-full"
        tabIndex={isVisible ? 0 : -1}
      >
        <Sparkle size={15} weight="fill" />
        {dict.stickyCta.text}
        <ArrowUpRight size={15} weight="bold" />
      </Link>
    </div>
  );
}
