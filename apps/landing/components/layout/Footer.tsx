"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { cn } from "../ui";
import { PraedixaLogo } from "../logo/PraedixaLogo";
import { easingCurves } from "../../lib/animations/config";
import { siteConfig } from "../../lib/config/site";

interface FooterProps {
  className?: string;
}

const NAVIGATION_LINKS = [
  { href: "#solution", label: "La solution" },
  { href: "#how-it-works", label: "Comment ça marche" },
  { href: "#proof", label: "Auditabilité" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact" },
  { href: "/devenir-pilote", label: "Devenir pilote" },
] as const;

const LEGAL_LINKS = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/cgu", label: "CGU" },
] as const;

const TRUST_INDICATORS = [
  {
    icon: (
      <svg
        className="h-4 w-4 text-amber-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
    text: "Hébergement Cloudflare (edge)",
  },
  {
    icon: (
      <svg
        className="h-4 w-4 text-amber-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    ),
    text: "Traitement agrégé équipe/site uniquement",
  },
] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: easingCurves.dramatic,
    },
  },
};

const linkSpring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 17,
};

export function Footer({ className }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const footerRef = useRef(null);
  const isInView = useInView(footerRef, { once: true, margin: "-50px" });

  return (
    <motion.footer
      ref={footerRef}
      className={cn("bg-charcoal", className)}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={containerVariants}
    >
      {/* Decorative gradient line */}
      <div className="h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

      {/* Mini CTA Banner */}
      <motion.div
        className="border-b border-white/10 py-8"
        variants={itemVariants}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <p className="text-center font-serif text-xl text-white md:text-left md:text-2xl">
            Prêt pour votre diagnostic ?
          </p>
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            transition={linkSpring}
          >
            <Link
              href="/devenir-pilote"
              className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-6 py-3 text-sm font-bold text-charcoal transition-colors hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-charcoal"
            >
              Obtenir mon diagnostic
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Main Footer Content */}
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-12">
          {/* Brand Column */}
          <motion.div
            className="col-span-2 md:col-span-1"
            variants={itemVariants}
          >
            <Link
              href="/"
              className="group inline-flex items-center gap-2.5 transition-colors hover:text-amber-400"
            >
              <PraedixaLogo
                variant="industrial"
                size={32}
                color="#ffffff"
                strokeWidth={1}
                className="transition-transform duration-200 group-hover:scale-105"
              />
              <span className="font-serif text-2xl font-bold text-white">
                Praedixa
              </span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              Sécurisez la couverture terrain.
              <br />
              Réduisez le coût des trous.
              <br />
              Décidez en confiance.
            </p>
          </motion.div>

          {/* Navigation Column */}
          <motion.div variants={itemVariants}>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-amber-400">
              Navigation
            </h3>
            <nav className="flex flex-col gap-3">
              {NAVIGATION_LINKS.map((link) => (
                <motion.div
                  key={link.href}
                  whileHover={{ x: 2 }}
                  transition={linkSpring}
                >
                  <Link
                    href={link.href}
                    className="text-sm text-white/70 transition-colors hover:text-amber-400"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </nav>
          </motion.div>

          {/* Legal Column */}
          <motion.div variants={itemVariants}>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-amber-400">
              Légal
            </h3>
            <nav className="flex flex-col gap-3">
              {LEGAL_LINKS.map((link) => (
                <motion.div
                  key={link.href}
                  whileHover={{ x: 2 }}
                  transition={linkSpring}
                >
                  <Link
                    href={link.href}
                    className="text-sm text-white/70 transition-colors hover:text-amber-400"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </nav>
          </motion.div>

          {/* Contact Column */}
          <motion.div variants={itemVariants}>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-amber-400">
              Contact
            </h3>
            <motion.div whileHover={{ x: 2 }} transition={linkSpring}>
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-amber-400"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                {siteConfig.contact.email}
              </a>
            </motion.div>
          </motion.div>
        </div>

        {/* Trust Indicators */}
        <motion.div
          className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-white/10 pt-8"
          variants={itemVariants}
        >
          {TRUST_INDICATORS.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              {item.icon}
              <span className="text-xs text-white/50">{item.text}</span>
            </div>
          ))}
        </motion.div>

        {/* Copyright Bar */}
        <motion.div
          className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-8 md:flex-row"
          variants={itemVariants}
        >
          <p className="text-xs text-white/40">
            © {currentYear} Praedixa. Tous droits réservés.
          </p>
          <p className="text-xs text-white/40">
            Conçu avec <span className="text-red-400">♥</span> en France
          </p>
        </motion.div>
      </div>
    </motion.footer>
  );
}
