"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { List, X } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";

interface MobileNavProps {
  locale: Locale;
  dict: Dictionary;
  pilotHref: string;
}

const navAnchors = [
  "problem",
  "method",
  "howItWorks",
  "useCases",
  "security",
  "faq",
] as const;

const anchorIds: Record<(typeof navAnchors)[number], string> = {
  problem: "problem",
  method: "solution",
  howItWorks: "how-it-works",
  useCases: "use-cases",
  security: "security",
  faq: "faq",
};

function resolveNavLabel(
  locale: Locale,
  key: (typeof navAnchors)[number],
  label: string,
): string {
  if (key !== "howItWorks" && key !== "useCases") {
    return label;
  }

  const cleaned = label
    .replace(/\bUI\s*\/\s*front-?end\b/gi, "")
    .replace(/\bfront-?end\b/gi, "")
    .replace(/\bback-?end\b/gi, "")
    .replace(/\s+[|/·]\s+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (cleaned.length > 0) {
    return cleaned;
  }

  if (key === "howItWorks") {
    return locale === "fr" ? "Comment ca marche" : "How it works";
  }
  return locale === "fr" ? "Decisions couvertes" : "Decisions covered";
}

export function MobileNav({ locale, dict, pilotHref }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const servicesHref = getLocalizedPath(locale, "services");

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative z-50 flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200/90 bg-white text-ink shadow-[0_10px_20px_-16px_rgba(2,6,23,0.8)] transition-all duration-200 hover:border-neutral-300 hover:bg-neutral-50 md:hidden"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        {open ? <X size={22} weight="bold" /> : <List size={22} weight="bold" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-40 bg-neutral-950/25 backdrop-blur-sm md:hidden"
          >
            <motion.nav
              initial={{ y: -16, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: -10, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="mx-4 mt-20 flex max-h-[calc(100dvh-6.5rem)] flex-col overflow-y-auto rounded-[1.75rem] border border-white/70 bg-white/96 p-5 shadow-[0_26px_60px_-34px_rgba(2,6,23,0.95)]"
            >
              <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                Navigation
              </p>
              <Link
                href={servicesHref}
                onClick={close}
                className="w-full rounded-xl px-3 py-3 text-base font-medium text-ink no-underline transition-colors duration-200 hover:bg-neutral-100"
              >
                {dict.nav.services}
              </Link>
              {navAnchors.map((key) => (
                <Link
                  key={key}
                  href={`/${locale}#${anchorIds[key]}`}
                  onClick={close}
                  className="w-full rounded-xl px-3 py-3 text-base font-medium text-ink no-underline transition-colors duration-200 hover:bg-neutral-100"
                >
                  {resolveNavLabel(locale, key, dict.nav[key])}
                </Link>
              ))}
              <Link
                href={`/${locale}/contact`}
                onClick={close}
                className="w-full rounded-xl px-3 py-3 text-base font-medium text-ink no-underline transition-colors duration-200 hover:bg-neutral-100"
              >
                {dict.nav.contact}
              </Link>
              <div className="mt-3 w-full border-t border-neutral-200 pt-4">
                <Link
                  href={pilotHref}
                  onClick={close}
                  className="btn-primary-gradient flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-white transition-transform duration-200 active:translate-y-[1px] active:scale-[0.98]"
                >
                  {dict.nav.ctaPrimary}
                </Link>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
