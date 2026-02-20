"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import type { Locale } from "../../lib/i18n/config";

interface LocaleSwitcherProps {
  locale: Locale;
}

export function LocaleSwitcher({ locale }: LocaleSwitcherProps) {
  const activeLabel = locale === "fr" ? "FR" : "EN";

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/fr"
        className={`text-xs transition ${
          locale === "fr"
            ? "font-semibold text-white"
            : "text-white hover:text-white"
        }`}
      >
        FR
      </Link>
      <span className="text-xs text-white">|</span>
      <Link
        href="/en"
        className={`text-xs transition ${
          locale === "en"
            ? "font-semibold text-white"
            : "text-white hover:text-white"
        }`}
      >
        EN
      </Link>
      <span className="relative ml-1 inline-flex h-3 w-6 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={activeLabel}
            className="inline-block text-[10px] font-semibold tracking-wide text-white/80"
            initial={{ y: "100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "-100%" }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {activeLabel}
          </motion.span>
        </AnimatePresence>
      </span>
    </div>
  );
}
