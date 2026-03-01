"use client";

import { motion } from "framer-motion";
import { Database, Plugs, ShieldCheck } from "@phosphor-icons/react";
import type { Dictionary } from "../../lib/i18n/types";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";
import { PulseDot } from "../shared/motion/PulseDot";
import { ShimmerTrack } from "../shared/motion/ShimmerTrack";

interface SecuritySectionProps {
  dict: Dictionary;
}

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };
const VP = { once: true, margin: "-60px" as const };

const staggerTiles = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const tileItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: SPRING },
};

export function SecuritySection({ dict }: SecuritySectionProps) {
  const security = dict.security;
  const tiles = Array.isArray(security.tiles) ? security.tiles : null;
  const tools = Array.isArray(security.compatibility.tools)
    ? security.compatibility.tools
    : null;
  const isFrench = security.kicker.toLowerCase().includes("integration");

  if (!tiles || !tools) {
    return (
      <SectionShell id="security">
        <div className="max-w-3xl">
          <Kicker>{security.kicker}</Kicker>
          <h2
            className="mt-3 text-4xl font-bold tracking-tighter text-ink md:text-6xl"
            style={{ lineHeight: 1.04 }}
          >
            {isFrench
              ? "Chargement integration et data"
              : "Loading integration and data"}
          </h2>
          <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-neutral-600">
            {isFrench
              ? "Connexion des blocs de gouvernance en cours."
              : "Connecting governance layers."}
          </p>
          <div className="mt-8 space-y-4">
            <div className="h-16 animate-pulse rounded-2xl border border-neutral-200 bg-white" />
            <div className="h-16 animate-pulse rounded-2xl border border-neutral-200 bg-white" />
            <div className="h-16 animate-pulse rounded-2xl border border-neutral-200 bg-white" />
          </div>
        </div>
      </SectionShell>
    );
  }

  if (tiles.length === 0) {
    return (
      <SectionShell id="security">
        <div className="max-w-3xl">
          <Kicker>{security.kicker}</Kicker>
          <h2
            className="mt-3 text-4xl font-bold tracking-tighter text-ink md:text-6xl"
            style={{ lineHeight: 1.04 }}
          >
            {isFrench
              ? "Aucune brique d'integration"
              : "No integration blocks available"}
          </h2>
          <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-neutral-600">
            {isFrench
              ? "Ajoutez des capacites techniques pour afficher cette section."
              : "Add technical capabilities to render this section."}
          </p>
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell
      id="security"
      className="bg-[linear-gradient(180deg,#fafaf8_0%,#f3f2ee_100%)]"
    >
      <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.18fr_0.82fr] md:gap-14">
        <div className="min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VP}
            transition={SPRING}
          >
            <Kicker>{security.kicker}</Kicker>
            <h2 className="mt-3 max-w-3xl text-4xl font-bold leading-none tracking-tighter text-ink md:text-6xl">
              {security.heading}
            </h2>
            <p className="mt-5 max-w-[65ch] text-base leading-relaxed text-neutral-600">
              {security.subheading}
            </p>
          </motion.div>

          <motion.div
            variants={staggerTiles}
            initial="hidden"
            whileInView="visible"
            viewport={VP}
            className="mt-12 space-y-3"
          >
            {tiles.map((tile, index) => (
              <motion.div
                key={tile.title}
                variants={tileItem}
                className={`rounded-2xl border border-neutral-200/80 bg-white/85 p-5 shadow-[0_20px_36px_-30px_rgba(15,23,42,0.3)] md:p-6 ${
                  index % 2 === 1 ? "md:translate-x-4" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    size={20}
                    weight="fill"
                    className="mt-0.5 shrink-0 text-brass-600"
                  />
                  <div>
                    <h3 className="text-base font-semibold tracking-tight text-ink">
                      {tile.title}
                    </h3>
                    <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-neutral-600">
                      {tile.description}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-500">
                  <PulseDot className="h-1.5 w-1.5 bg-brass-500" />
                  {isFrench ? "Controle actif" : "Active control"}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={VP}
          transition={{ ...SPRING, delay: 0.2 }}
          className="md:sticky md:top-28 md:self-start"
        >
          <div className="rounded-[1.9rem] border border-neutral-200/80 bg-white/90 p-6 shadow-[0_24px_40px_-30px_rgba(15,23,42,0.28),inset_0_1px_0_rgba(255,255,255,0.75)] md:p-7">
            <div className="flex items-start gap-3">
              <Plugs size={20} weight="fill" className="mt-1 shrink-0 text-brass-700" />
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-ink">
                  {security.compatibility.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                  {security.compatibility.description}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {tools.map((tool, index) => (
                <span
                  key={tool}
                  className={`inline-flex items-center gap-1.5 rounded-full border border-neutral-300/70 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-700 ${
                    index % 2 === 1 ? "translate-y-[1px]" : ""
                  }`}
                >
                  <Database size={12} weight="fill" className="text-brass-600" />
                  {tool}
                </span>
              ))}
            </div>

            <ShimmerTrack
              className="mt-5 bg-neutral-100"
              indicatorClassName="via-brass-300/55"
            />

            <p className="mt-5 border-l-2 border-brass-300/70 pl-4 text-xs leading-relaxed text-neutral-600">
              {security.honesty}
            </p>
          </div>
        </motion.div>
      </div>
    </SectionShell>
  );
}
