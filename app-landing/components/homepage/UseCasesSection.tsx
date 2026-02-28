"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CaretDown, Lightbulb } from "@phosphor-icons/react";
import type { Dictionary } from "../../lib/i18n/types";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";

interface UseCasesSectionProps {
  dict: Dictionary;
}

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };
const VP = { once: true, margin: "-60px" as const };

const staggerCases = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const caseItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: SPRING },
};

export function UseCasesSection({ dict }: UseCasesSectionProps) {
  const [openId, setOpenId] = useState<string | null>(
    dict.useCases.cases[0]?.id ?? null,
  );

  return (
    <SectionShell id="use-cases">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VP}
        transition={SPRING}
      >
        <Kicker>{dict.useCases.kicker}</Kicker>
        <h2 className="mt-3 max-w-2xl text-4xl font-bold tracking-tighter text-ink md:text-5xl" style={{ lineHeight: 1.05 }}>
          {dict.useCases.heading}
        </h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-neutral-500">
          {dict.useCases.subheading}
        </p>
      </motion.div>

      <motion.div
        variants={staggerCases}
        initial="hidden"
        whileInView="visible"
        viewport={VP}
        className="mt-14 space-y-3"
      >
        {dict.useCases.cases.map((c) => {
          const isOpen = openId === c.id;
          return (
            <motion.div
              key={c.id}
              variants={caseItem}
              className={`overflow-hidden border-l-2 transition-colors duration-200 ${
                isOpen
                  ? "border-l-brass bg-white"
                  : "border-l-transparent hover:border-l-brass-200"
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : c.id)}
                className="flex w-full items-center justify-between bg-transparent px-6 py-5 text-left transition-colors hover:bg-neutral-50/30"
                aria-expanded={isOpen}
              >
                <span className="flex items-center gap-3">
                  <Lightbulb
                    size={18}
                    weight="fill"
                    className="shrink-0 text-brass"
                  />
                  <span className="text-base font-semibold text-ink">
                    {c.title}
                  </span>
                </span>
                <CaretDown
                  size={16}
                  weight="bold"
                  className={`shrink-0 text-neutral-400 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      height: { type: "spring", stiffness: 200, damping: 28 },
                      opacity: { duration: 0.25 },
                    }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border-subtle px-6 pb-6 pt-4">
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_1fr]">
                        <div className="space-y-4">
                          <div>
                            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-400">
                              {dict.useCases.labels.context}
                            </span>
                            <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                              {c.context}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-400">
                              {dict.useCases.labels.action}
                            </span>
                            <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                              {c.action}
                            </p>
                          </div>
                        </div>
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-400">
                            {dict.useCases.labels.impact}
                          </span>
                          <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                            {c.result}
                          </p>
                          {c.callout && (
                            <p className="mt-4 border-l-2 border-brass-200 pl-4 text-xs leading-relaxed text-brass-700">
                              {c.callout}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>
    </SectionShell>
  );
}
