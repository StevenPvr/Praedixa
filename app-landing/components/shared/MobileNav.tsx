"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { List, X } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import type { Locale } from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";
import { navAnchors, anchorIds, resolveNavLabel } from "../../lib/nav-config";

interface MobileNavProps {
  locale: Locale;
  dict: Dictionary;
  primaryCtaHref: string;
}

export function MobileNav({ locale, dict, primaryCtaHref }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);

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

  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    if (dialog) {
      const focusable = dialog.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== "Tab") return;

      const container = dialogRef.current;
      if (!container) return;

      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      const active = document.activeElement as HTMLElement | null;

      if (!container.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }

      if (event.shiftKey) {
        if (active === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      toggleRef.current?.focus();
    };
  }, [close, open]);

  const menuLabel =
    locale === "fr"
      ? open
        ? "Fermer le menu"
        : "Ouvrir le menu"
      : open
        ? "Close menu"
        : "Open menu";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        ref={toggleRef}
        className="relative z-50 flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200/90 bg-white text-ink shadow-[0_10px_20px_-16px_rgba(2,6,23,0.8)] transition-all duration-200 hover:border-neutral-300 hover:bg-neutral-50 lg:hidden"
        aria-label={menuLabel}
        aria-expanded={open}
        aria-controls="mobile-nav-dialog"
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
            className="fixed inset-0 z-40 bg-neutral-950/25 backdrop-blur-sm lg:hidden"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                close();
              }
            }}
          >
            <motion.nav
              id="mobile-nav-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-nav-title"
              initial={{ y: -16, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: -10, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              ref={(node) => {
                dialogRef.current = node;
              }}
              className="mx-4 mt-20 flex max-h-[calc(100dvh-6.5rem)] flex-col overflow-y-auto rounded-[1.75rem] border border-white/70 bg-white/96 p-5 shadow-[0_26px_60px_-34px_rgba(2,6,23,0.95)]"
            >
              <h2 id="mobile-nav-title" className="sr-only">
                {locale === "fr" ? "Menu de navigation" : "Navigation menu"}
              </h2>
              <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                Navigation
              </p>
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
                  href={primaryCtaHref}
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
