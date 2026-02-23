"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, List, Sparkle, X } from "@phosphor-icons/react/dist/ssr";
import { PraedixaLogo } from "../logo/PraedixaLogo";
import type { Dictionary } from "../../lib/i18n/types";
import type { Locale } from "../../lib/i18n/config";
import { localizedSlugs } from "../../lib/i18n/config";

interface NavbarProps {
  dict: Dictionary;
  locale: Locale;
}

type NavLink = {
  href: string;
  label: string;
  isInternal?: boolean;
};

const menuTransition = {
  type: "spring",
  stiffness: 100,
  damping: 20,
} as const;

export function Navbar({ dict, locale }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const pilotHref = `/${locale}/${localizedSlugs.pilot[locale]}`;

  const navLinks: NavLink[] = useMemo(
    () => [
      { href: "#problem", label: dict.nav.problem },
      { href: "#methode", label: dict.nav.method },
      { href: "#cas-usage", label: dict.nav.useCases },
      { href: "#security", label: dict.nav.security },
      { href: "#faq", label: dict.nav.faq },
      {
        href: `/${locale}/${localizedSlugs.resources[locale]}`,
        label: locale === "fr" ? "Ressources" : "Resources",
        isInternal: true,
      },
      {
        href: `/${locale}/${localizedSlugs.contact[locale]}`,
        label: dict.nav.contact,
        isInternal: true,
      },
    ],
    [dict, locale],
  );

  useEffect(() => {
    const closeMenuOnDesktop = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", closeMenuOnDesktop);
    return () => window.removeEventListener("resize", closeMenuOnDesktop);
  }, []);

  return (
    <>
      <nav
        className="fixed inset-x-0 top-0 z-20 py-3"
        style={{
          filter: "drop-shadow(0 4px 12px oklch(0.16 0.01 250 / 0.06))",
        }}
      >
        <div className="section-shell">
          <div className="panel-glass flex items-center justify-between rounded-2xl px-3 py-2 md:px-4">
            <Link
              href={`/${locale}`}
              className="group flex items-center gap-2.5"
            >
              <PraedixaLogo
                variant="geometric"
                size={28}
                color="var(--ink-soft)"
                strokeWidth={1.1}
                className="transition-transform duration-300 group-hover:scale-105"
              />
              <span className="text-base font-semibold tracking-tight text-[var(--ink)]">
                Praedixa
              </span>
            </Link>

            <div className="hidden items-center gap-1 md:flex">
              {navLinks.map((link) => {
                const classes =
                  "rounded-full px-3 py-1.5 text-sm font-medium text-[var(--ink-soft)] transition hover:bg-[var(--panel-muted)] hover:text-[var(--ink)] active:scale-[0.97]";

                return link.isInternal ? (
                  <Link key={link.href} href={link.href} className={classes}>
                    {link.label}
                  </Link>
                ) : (
                  <a key={link.href} href={link.href} className={classes}>
                    {link.label}
                  </a>
                );
              })}
            </div>

            <div className="hidden md:flex">
              <Link href={pilotHref} className="btn-primary">
                <Sparkle size={15} weight="fill" />
                {dict.nav.ctaPrimary}
                <ArrowUpRight size={15} weight="bold" />
              </Link>
            </div>

            <button
              type="button"
              className="btn-secondary h-10 w-10 rounded-xl p-0 md:hidden"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X size={18} weight="bold" />
              ) : (
                <List size={18} weight="bold" />
              )}
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen ? (
          <>
            <motion.div
              className="fixed inset-0 z-20 bg-[oklch(0.1_0.01_250_/_0.28)] backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              className="fixed inset-x-4 top-20 z-20 rounded-2xl border border-[var(--line-strong)] bg-[var(--panel)] p-4 shadow-[var(--shadow-diffuse)] md:hidden"
              initial={{ opacity: 0, y: -16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.98 }}
              transition={menuTransition}
            >
              <div className="grid gap-1">
                {navLinks.map((link) => {
                  const classes =
                    "rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--ink-soft)] transition hover:bg-[var(--panel-muted)] hover:text-[var(--ink)]";

                  return link.isInternal ? (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={classes}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      key={link.href}
                      href={link.href}
                      className={classes}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {link.label}
                    </a>
                  );
                })}
              </div>
              <Link
                href={pilotHref}
                className="btn-primary mt-3 w-full"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Sparkle size={15} weight="fill" />
                {dict.nav.ctaPrimary}
              </Link>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
