"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { List, X } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import type { Locale } from "../../lib/i18n/config";
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

export function MobileNav({ locale, dict, pilotHref }: MobileNavProps) {
  const [open, setOpen] = useState(false);

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
        className="relative z-50 flex h-10 w-10 items-center justify-center rounded-lg text-ink transition-colors hover:bg-neutral-100 md:hidden"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        {open ? <X size={22} weight="bold" /> : <List size={22} weight="bold" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-40 bg-white/98 backdrop-blur-sm md:hidden"
          >
            <nav className="flex h-full flex-col items-start gap-1 overflow-y-auto px-6 pb-8 pt-20">
              {navAnchors.map((key) => (
                <Link
                  key={key}
                  href={`/${locale}#${anchorIds[key]}`}
                  onClick={close}
                  className="w-full rounded-lg px-3 py-3 text-base font-medium text-ink no-underline transition-colors hover:bg-neutral-50"
                >
                  {dict.nav[key]}
                </Link>
              ))}
              <Link
                href={`/${locale}/contact`}
                onClick={close}
                className="w-full rounded-lg px-3 py-3 text-base font-medium text-ink no-underline transition-colors hover:bg-neutral-50"
              >
                {dict.nav.contact}
              </Link>
              <div className="mt-auto w-full border-t border-border pt-4">
                <Link
                  href={pilotHref}
                  onClick={close}
                  className="btn-primary-gradient flex w-full items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
                >
                  {dict.nav.ctaPrimary}
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
