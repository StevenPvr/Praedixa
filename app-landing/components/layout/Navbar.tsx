"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PraedixaLogo } from "../logo/PraedixaLogo";

const NAV_LINKS = [
  { href: "#problem", label: "Enjeux" },
  { href: "#solution", label: "Méthode" },
  { href: "#pipeline", label: "Cas d'usage" },
  { href: "#deliverables", label: "Framework ROI" },
  { href: "#faq", label: "FAQ" },
] as const;

const PILOT_HREF = "/devenir-pilote";

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setHasScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <nav className="fixed left-0 right-0 top-0 z-50">
        <div
          className={`section-shell mt-4 transition-all duration-300 ${
            hasScrolled ? "translate-y-0" : "translate-y-0"
          }`}
        >
          <div
            className={`flex items-center justify-between rounded-2xl border px-4 py-3 md:px-6 ${
              hasScrolled
                ? "border-neutral-300/80 bg-white/92 shadow-[var(--shadow-soft)] backdrop-blur-xl"
                : "border-neutral-300/60 bg-white/80 backdrop-blur"
            }`}
          >
            <Link href="/" className="group flex items-center gap-2.5">
              <PraedixaLogo
                variant="geometric"
                size={30}
                color="oklch(0.2 0.01 65)"
                strokeWidth={1.2}
                className="transition-transform duration-300 group-hover:scale-105"
              />
              <span className="font-serif text-xl tracking-tight text-charcoal">
                Praedixa
              </span>
            </Link>

            <div className="hidden items-center gap-1 md:flex">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-charcoal/75 transition hover:bg-charcoal/5 hover:text-charcoal"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="hidden md:flex">
              <Link href={PILOT_HREF} className="gold-cta text-xs sm:text-sm">
                Qualification pilote
              </Link>
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-charcoal/10 bg-white md:hidden"
              aria-label={isMobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={isMobileMenuOpen}
            >
              <div className="flex h-4 w-5 flex-col items-center justify-center gap-1">
                <motion.span
                  className="block h-0.5 w-5 bg-charcoal"
                  animate={{
                    rotate: isMobileMenuOpen ? 45 : 0,
                    y: isMobileMenuOpen ? 3 : 0,
                  }}
                  transition={{ duration: 0.2 }}
                />
                <motion.span
                  className="block h-0.5 w-5 bg-charcoal"
                  animate={{ opacity: isMobileMenuOpen ? 0 : 1 }}
                  transition={{ duration: 0.2 }}
                />
                <motion.span
                  className="block h-0.5 w-5 bg-charcoal"
                  animate={{
                    rotate: isMobileMenuOpen ? -45 : 0,
                    y: isMobileMenuOpen ? -3 : 0,
                  }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-charcoal/25 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              className="fixed left-4 right-4 top-20 z-50 rounded-3xl border border-neutral-300 bg-[oklch(0.99_0.001_95)] p-6 shadow-[var(--shadow-premium)] md:hidden"
              initial={{ opacity: 0, y: -14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <nav className="flex flex-col gap-2">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="rounded-xl px-3 py-3 text-base font-medium text-charcoal/80 transition hover:bg-charcoal/5 hover:text-charcoal"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
              <div className="mt-5 border-t border-neutral-200 pt-5">
                <Link
                  href={PILOT_HREF}
                  className="gold-cta w-full"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Demander une qualification pilote
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
