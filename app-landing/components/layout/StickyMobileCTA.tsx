"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function StickyMobileCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero");
    if (!hero) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setVisible(!entry.isIntersecting);
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-amber-200/70 bg-[oklch(0.985_0.005_90)] px-4 py-3 shadow-[var(--shadow-soft)] backdrop-blur-md transition-transform duration-300 md:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      aria-hidden={!visible}
    >
      <Link
        href="/devenir-pilote"
        className="flex w-full items-center justify-center rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-charcoal transition hover:bg-amber-400"
        tabIndex={visible ? 0 : -1}
      >
        Qualification pilote en 4-5 min
      </Link>
    </div>
  );
}
