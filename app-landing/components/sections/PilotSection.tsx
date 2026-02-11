"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@praedixa/ui";
import { staggerItem } from "../../lib/animations/variants";
import {
  pilotColumns,
  pilotUrgencyText,
  pilotCtaText,
  pilotCtaHref,
} from "../../lib/content/pilot-benefits";
import { SectionWrapper } from "../shared/SectionWrapper";
import { SectionHeader } from "../shared/SectionHeader";
import { CheckIcon, ArrowRightIcon } from "../icons";

/* ------------------------------------------------------------------ */
/*  Column icons                                                       */
/* ------------------------------------------------------------------ */

function CoConstructionIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={cn("h-10 w-10", className)}
      aria-hidden="true"
    >
      {/* Two overlapping people */}
      <circle
        cx="18"
        cy="16"
        r="6"
        stroke="oklch(0.769 0.205 70)"
        strokeWidth="1.5"
        fill="oklch(0.769 0.205 70)"
        fillOpacity="0.15"
      />
      <path
        d="M8 38 C8 30 14 26 18 26 C22 26 28 30 28 38"
        stroke="oklch(0.769 0.205 70)"
        strokeWidth="1.5"
        fill="none"
      />
      <circle
        cx="30"
        cy="16"
        r="6"
        stroke="oklch(0.769 0.205 70)"
        strokeWidth="1.5"
        fill="oklch(0.769 0.205 70)"
        fillOpacity="0.15"
      />
      <path
        d="M20 38 C20 30 26 26 30 26 C34 26 40 30 40 38"
        stroke="oklch(0.769 0.205 70)"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}

function AdvantagesIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={cn("h-10 w-10", className)}
      aria-hidden="true"
    >
      {/* Star / badge */}
      <polygon
        points="24,4 28,16 40,18 31,27 33,40 24,34 15,40 17,27 8,18 20,16"
        stroke="oklch(0.769 0.205 70)"
        strokeWidth="1.5"
        fill="oklch(0.769 0.205 70)"
        fillOpacity="0.15"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ObjectiveFlowIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={cn("h-10 w-10", className)}
      aria-hidden="true"
    >
      {/* Circular flow */}
      <path
        d="M24 8 A16 16 0 1 1 8 24"
        stroke="oklch(0.769 0.205 70)"
        strokeWidth="1.5"
        fill="none"
        strokeDasharray="4 3"
      />
      <polygon points="8,24 12,20 12,28" fill="oklch(0.769 0.205 70)" />
      {/* Center checkmark */}
      <circle
        cx="24"
        cy="24"
        r="6"
        fill="oklch(0.769 0.205 70)"
        fillOpacity="0.15"
      />
      <polyline
        points="20,24 23,27 28,21"
        stroke="oklch(0.769 0.205 70)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const COLUMN_ICONS: Record<string, React.FC<{ className?: string }>> = {
  "co-construction": CoConstructionIcon,
  avantages: AdvantagesIcon,
  objectif: ObjectiveFlowIcon,
};

/* ------------------------------------------------------------------ */
/*  PilotSection                                                       */
/* ------------------------------------------------------------------ */

export function PilotSection({ className }: { className?: string }) {
  return (
    <SectionWrapper id="pilot" dark className={className}>
      <SectionHeader
        kicker="Programme pilote"
        heading="Co-construisez la solution avec nous"
        subheading="Rejoignez un nombre restreint d'entreprises pilotes. Vous apportez vos données et vos contraintes métier, on apporte la technologie prédictive et l'interprétabilité. Ensemble, on bâtit un système qui explique, chiffre et prouve."
        light
      />

      {/* 3-column grid */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {pilotColumns.map((col) => {
          const Icon = COLUMN_ICONS[col.id];
          const isHighlighted = col.id === "avantages";
          return (
            <motion.div
              key={col.id}
              className={cn(
                "rounded-2xl border p-6",
                isHighlighted
                  ? "border-amber-500/50 bg-amber-500/10"
                  : "border-white/10 bg-white/5",
              )}
              variants={staggerItem}
            >
              {Icon && <Icon className="mb-4" />}
              <h3
                className={cn(
                  "mb-4 text-lg font-bold",
                  isHighlighted ? "text-amber-400" : "text-white",
                )}
              >
                {col.title}
              </h3>
              <ul className="space-y-3">
                {col.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm leading-relaxed text-white/70"
                  >
                    <CheckIcon
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        isHighlighted ? "text-amber-400" : "text-amber-500/70",
                      )}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </div>

      {/* Urgency callout */}
      <motion.div
        className="mt-12 rounded-xl border border-amber-500/40 bg-amber-500/10 px-6 py-4 text-center"
        variants={staggerItem}
      >
        <p className="text-sm font-medium leading-relaxed text-amber-300">
          {pilotUrgencyText}
        </p>
      </motion.div>

      {/* CTA */}
      <motion.div className="mt-8 text-center" variants={staggerItem}>
        <Link
          href={pilotCtaHref}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-8 py-4 text-base font-bold text-charcoal shadow-lg transition-all duration-200 hover:bg-amber-400 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-charcoal"
        >
          {pilotCtaText}
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </motion.div>
    </SectionWrapper>
  );
}
