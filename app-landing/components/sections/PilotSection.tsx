"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@praedixa/ui";
import {
  staggerContainer,
  staggerItem,
  viewportOnce,
} from "../../lib/animations/variants";
import {
  pilotColumns,
  pilotUrgencyText,
  pilotCtaText,
  pilotCtaHref,
  pilotMetaText,
} from "../../lib/content/pilot-benefits";
import { ArrowRightIcon, CheckIcon } from "../icons";

interface PilotSectionProps {
  className?: string;
}

export function PilotSection({ className }: PilotSectionProps) {
  return (
    <motion.section
      id="pilot"
      className={cn("bg-charcoal py-24 text-white md:py-28", className)}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
    >
      <div className="section-shell">
        <motion.div className="max-w-4xl" variants={staggerItem}>
          <p className="section-kicker text-amber-300">Cohorte pilote</p>
          <h2 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">
            Prenez l'avantage avant standardisation du marché.
          </h2>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-white/75">
            Cohorte fondatrice conçue pour les équipes qui veulent installer un
            standard de pilotage couverture exigeant avant leurs concurrents.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {pilotColumns.map((column) => (
            <motion.article
              key={column.id}
              className={cn(
                "rounded-3xl border p-6",
                column.id === "avantages"
                  ? "border-amber-400/35 bg-amber-500/12"
                  : "border-white/12 bg-white/[0.04]",
              )}
              variants={staggerItem}
            >
              <h3
                className={cn(
                  "font-serif text-3xl leading-tight",
                  column.id === "avantages" ? "text-amber-200" : "text-white",
                )}
              >
                {column.title}
              </h3>

              <ul className="mt-5 space-y-3">
                {column.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm leading-relaxed text-white/80"
                  >
                    <CheckIcon
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        column.id === "avantages"
                          ? "text-amber-200"
                          : "text-amber-400/80",
                      )}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.article>
          ))}
        </div>

        <motion.div
          className="mt-8 rounded-2xl border border-amber-300/35 bg-amber-500/10 px-6 py-5"
          variants={staggerItem}
        >
          <p className="text-sm leading-relaxed text-amber-100">
            {pilotUrgencyText}
          </p>
        </motion.div>

        <motion.div className="mt-8" variants={staggerItem}>
          <Link
            href={pilotCtaHref}
            className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-7 py-3.5 text-sm font-semibold text-charcoal transition hover:bg-amber-400"
          >
            {pilotCtaText}
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-white/65">
            {pilotMetaText}
          </p>
        </motion.div>
      </div>
    </motion.section>
  );
}
