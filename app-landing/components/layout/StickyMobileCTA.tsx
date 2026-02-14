"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "../icons";
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
      { threshold: 0.2 },
    );
    observer.observe(heroEl);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-cream/95 px-4 py-3 backdrop-blur-xl transition-transform duration-300 ease-out-expo md:hidden ${
        isVisible ? "translate-y-0" : "translate-y-full"
      }`}
      aria-hidden={!isVisible}
    >
      <Link
        href={pilotHref}
        className="btn-primary w-full text-sm"
        tabIndex={isVisible ? 0 : -1}
      >
        {dict.stickyCta.text}
        <ArrowRightIcon className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
