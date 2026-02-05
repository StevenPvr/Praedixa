"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { cn } from "../ui";
import { siteConfig } from "../../lib/config/site";
import { easingCurves } from "../../lib/animations/config";

interface ContactSectionProps {
  className?: string;
}

const TRUST_ITEMS = [
  "Sans engagement",
  "Retour rapide",
  "Pas besoin de données pour échanger",
] as const;

const headerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: easingCurves.dramatic,
    },
  },
};

const ctaVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: easingCurves.dramatic,
      delay: 0.2,
    },
  },
};

const trustVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.5,
    },
  },
};

const trustItemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: easingCurves.dramatic,
    },
  },
};

export function ContactSection({ className }: ContactSectionProps) {
  const [copied, setCopied] = useState(false);
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(siteConfig.contact.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = siteConfig.contact.email;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section
      ref={sectionRef}
      id="contact"
      className={cn("bg-cream py-24 md:py-32", className)}
    >
      <div className="mx-auto max-w-3xl px-6 text-center">
        {/* Section Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={headerVariants}
        >
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-600">
            Passez à l&apos;action
          </p>
          <h2 className="font-serif text-3xl text-charcoal sm:text-4xl md:text-5xl">
            Obtenez votre diagnostic
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-secondary">
            En <span className="font-semibold text-amber-600">48h</span>, on
            vous dit où vous allez être sous-couverts (capacité vs charge) et
            combien ça coûte.{" "}
            <span className="font-semibold text-amber-600">
              Premier diagnostic offert
            </span>{" "}
            pour les entreprises pilotes.
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          className="mt-10 flex flex-col items-center gap-4"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={ctaVariants}
        >
          {/* Primary CTA - Devenir pilote */}
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Link
              href="/devenir-pilote"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-500 px-10 py-5 text-lg font-bold text-charcoal shadow-lg transition-all duration-200 hover:bg-amber-400 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Devenir entreprise pilote
            </Link>
          </motion.div>

          {/* Secondary CTA - Copy Email */}
          <motion.button
            onClick={handleCopyEmail}
            className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-medium text-gray-secondary transition-all hover:border-amber-300 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            {copied ? (
              <>
                <svg
                  className="h-4 w-4 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-green-600">Email copié !</span>
              </>
            ) : (
              <>
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
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <span>Copier l'email</span>
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={trustVariants}
        >
          {TRUST_ITEMS.map((item, index) => (
            <motion.div
              key={index}
              className="flex items-center gap-2"
              variants={trustItemVariants}
            >
              <svg
                className="h-4 w-4 text-amber-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-sm text-gray-muted">{item}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
