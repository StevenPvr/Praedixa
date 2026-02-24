"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Plugs } from "@phosphor-icons/react";
import type { Dictionary } from "../../lib/i18n/types";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";

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
  return (
    <SectionShell id="security">
      <div className="grid grid-cols-1 gap-16 md:grid-cols-[1.3fr_1fr]">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VP}
            transition={SPRING}
          >
            <Kicker>{dict.security.kicker}</Kicker>
            <h2 className="mt-3 max-w-2xl text-4xl font-bold tracking-tighter text-ink md:text-5xl" style={{ lineHeight: 1.05 }}>
              {dict.security.heading}
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-neutral-500">
              {dict.security.subheading}
            </p>
          </motion.div>

          {/* Tiles — anti-card, divide-y layout */}
          <motion.div
            variants={staggerTiles}
            initial="hidden"
            whileInView="visible"
            viewport={VP}
            className="mt-12 divide-y divide-border-subtle"
          >
            {dict.security.tiles.map((tile) => (
              <motion.div
                key={tile.title}
                variants={tileItem}
                className="flex items-start gap-3 py-5 first:pt-0"
              >
                <ShieldCheck
                  size={20}
                  weight="fill"
                  className="mt-0.5 shrink-0 text-brass"
                />
                <div>
                  <h3 className="text-sm font-semibold text-ink">{tile.title}</h3>
                  <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-neutral-500">
                    {tile.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Right: compatibility + honesty — sticky */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={VP}
          transition={{ ...SPRING, delay: 0.2 }}
          className="md:sticky md:top-28 md:self-start"
        >
          <div className="border-t-2 border-brass-300 pt-6">
            <div className="flex items-start gap-3">
              <Plugs size={20} weight="fill" className="mt-0.5 shrink-0 text-brass" />
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  {dict.security.compatibility.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">
                  {dict.security.compatibility.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {dict.security.compatibility.tools.map((tool) => (
                    <span
                      key={tool}
                      className="inline-flex rounded-full border border-border-subtle bg-white px-3 py-1 text-xs font-medium text-neutral-600"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <p className="mt-8 text-xs leading-relaxed text-neutral-400">
              {dict.security.honesty}
            </p>
          </div>
        </motion.div>
      </div>
    </SectionShell>
  );
}
