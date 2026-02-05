"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll } from "framer-motion";
import { PraedixaLogo } from "../logo/PraedixaLogo";

const NAV_LINKS = [
  { href: "#solution", label: "Solution" },
  { href: "#how-it-works", label: "Comment ça marche" },
  { href: "#proof", label: "Preuve" },
  { href: "#faq", label: "FAQ" },
] as const;

const PILOT_HREF = "/devenir-pilote";

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  // Track scroll for background effect
  const { scrollY } = useScroll();

  // Add background when scrolling
  useEffect(() => {
    const unsubscribe = scrollY.on("change", (latest) => {
      setHasScrolled(latest > 20);
    });
    return () => unsubscribe();
  }, [scrollY]);

  // Close mobile menu on resize
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
      <motion.nav
        className="fixed left-0 right-0 top-0 z-50"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className={`mx-auto flex max-w-7xl items-center justify-between px-6 py-4 transition-all duration-300 ${
            hasScrolled
              ? "bg-white/80 backdrop-blur-lg shadow-sm border-b border-neutral-200/50 mx-4 mt-2 rounded-2xl"
              : "bg-transparent"
          }`}
        >
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2.5">
            <PraedixaLogo
              variant="industrial"
              size={32}
              color="#0f0f0f"
              strokeWidth={1}
              className="transition-transform duration-200 group-hover:scale-105"
            />
            <span className="font-serif text-lg font-semibold tracking-tight text-charcoal">
              Praedixa
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="relative rounded-lg px-4 py-2 text-sm font-medium text-gray-secondary transition-all duration-200 hover:bg-charcoal/5 hover:text-charcoal"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-4 md:flex">
            <a
              href="#contact"
              className="text-sm font-medium text-gray-secondary transition-colors hover:text-charcoal"
            >
              Contact
            </a>
            <Link
              href={PILOT_HREF}
              className="group relative overflow-hidden rounded-lg bg-charcoal px-5 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-charcoal/90 hover:shadow-lg hover:shadow-charcoal/25"
            >
              <span className="relative z-10">Devenir pilote</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-charcoal/5 transition-colors hover:bg-charcoal/10 md:hidden"
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
                animate={{
                  opacity: isMobileMenuOpen ? 0 : 1,
                }}
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
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-charcoal/20 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Menu Panel */}
            <motion.div
              className="fixed left-4 right-4 top-20 z-50 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl md:hidden"
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <nav className="flex flex-col gap-2">
                {NAV_LINKS.map((link, index) => (
                  <motion.a
                    key={link.href}
                    href={link.href}
                    className="rounded-xl px-4 py-3 text-base font-medium text-gray-secondary transition-colors hover:bg-charcoal/5 hover:text-charcoal"
                    onClick={() => setIsMobileMenuOpen(false)}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    {link.label}
                  </motion.a>
                ))}
                <motion.a
                  href="#contact"
                  className="rounded-xl px-4 py-3 text-base font-medium text-gray-secondary transition-colors hover:bg-charcoal/5 hover:text-charcoal"
                  onClick={() => setIsMobileMenuOpen(false)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: NAV_LINKS.length * 0.05 }}
                >
                  Contact
                </motion.a>
              </nav>

              <div className="mt-6 border-t border-neutral-200 pt-6">
                <Link
                  href={PILOT_HREF}
                  className="flex w-full items-center justify-center rounded-xl bg-charcoal px-6 py-3.5 text-base font-semibold text-white transition-all hover:bg-charcoal/90"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Devenir pilote
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
