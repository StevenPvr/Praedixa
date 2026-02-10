"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Sticky CTA bar at the bottom of the viewport on mobile.
 * Appears when the hero CTA scrolls out of view (IntersectionObserver).
 * Touch target >= 44px, full-width button.
 */
export function StickyMobileCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero");
    /* v8 ignore next -- hero element absent in isolated component test */
    if (!hero) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setVisible(!entry.isIntersecting);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-amber-200/50 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm transition-transform duration-300 md:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      aria-hidden={!visible}
    >
      <Link
        href="/devenir-pilote"
        className="flex w-full items-center justify-center rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-charcoal transition-colors hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
        tabIndex={visible ? 0 : -1}
      >
        Obtenir mon diagnostic
      </Link>
    </div>
  );
}
