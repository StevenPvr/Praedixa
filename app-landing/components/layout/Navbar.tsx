"use client";

import Link from "next/link";
import { useEffect, useState, startTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PraedixaLogo } from "../logo/PraedixaLogo";
import { ArrowRightIcon } from "../icons";
import type { Dictionary } from "../../lib/i18n/types";
import type { Locale } from "../../lib/i18n/config";
import { localizedSlugs } from "../../lib/i18n/config";

interface NavbarProps {
  dict: Dictionary;
  locale: Locale;
}

export function Navbar({ dict, locale }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  const pilotHref = `/${locale}/${localizedSlugs.pilot[locale]}`;

  const navLinks = [
    { href: "#solution", label: dict.nav.method },
    { href: "#security", label: dict.nav.security },
    { href: "#faq", label: dict.nav.faq },
  ];

  useEffect(() => {
    const handleScroll = () => {
      startTransition(() => setHasScrolled(window.scrollY > 12));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsMobileMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <nav className="fixed left-0 right-0 top-0 z-50">
        <div className="section-shell mt-3 transition-all duration-300">
          <div
            className={`flex items-center justify-between rounded-lg border px-4 py-2.5 md:px-5 ${
              hasScrolled
                ? "border-white/20 bg-ink/90 shadow-sm backdrop-blur-xl"
                : "border-white/15 bg-ink/75 backdrop-blur"
            }`}
          >
            {/* Logo */}
            <Link
              href={`/${locale}`}
              className="group flex items-center gap-2.5"
            >
              <PraedixaLogo
                variant="geometric"
                size={28}
                color="oklch(0.98 0 0)"
                strokeWidth={1.1}
                className="transition-transform duration-300 group-hover:scale-105"
              />
              <span className="font-serif text-lg tracking-tight text-white">
                Praedixa
              </span>
            </Link>

            {/* Desktop nav — minimal: 3 trust links */}
            <div className="hidden items-center gap-0.5 md:flex">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded px-3 py-1.5 text-sm font-medium text-white transition hover:text-white"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex">
              <Link href={pilotHref} className="btn-primary text-sm">
                {dict.nav.ctaPrimary}
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded border border-white/30 bg-white/10 md:hidden"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
            >
              <div className="flex h-3.5 w-4 flex-col items-center justify-center gap-[3px]">
                <motion.span
                  className="block h-[1.5px] w-4 bg-white"
                  animate={{
                    rotate: isMobileMenuOpen ? 45 : 0,
                    y: isMobileMenuOpen ? 2.25 : 0,
                  }}
                  transition={{ duration: 0.2 }}
                />
                <motion.span
                  className="block h-[1.5px] w-4 bg-white"
                  animate={{ opacity: isMobileMenuOpen ? 0 : 1 }}
                  transition={{ duration: 0.15 }}
                />
                <motion.span
                  className="block h-[1.5px] w-4 bg-white"
                  animate={{
                    rotate: isMobileMenuOpen ? -45 : 0,
                    y: isMobileMenuOpen ? -2.25 : 0,
                  }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-charcoal/20 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              className="fixed left-3 right-3 top-16 z-50 rounded-lg border border-white/20 bg-ink p-5 shadow-lg md:hidden"
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <nav className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="rounded px-3 py-2.5 text-base font-medium text-white transition hover:bg-white/10 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
              <div className="mt-4 border-t border-white/15 pt-4">
                <Link
                  href={pilotHref}
                  className="btn-primary w-full"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {dict.nav.ctaPrimary}
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
