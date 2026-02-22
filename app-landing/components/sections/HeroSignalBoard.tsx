"use client";

import { memo, useEffect, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import {
  CalendarCheck,
  ClockCountdown,
  DotsThree,
  Pulse,
  Rows,
  Sparkle,
  WaveSine,
} from "@phosphor-icons/react/dist/ssr";

const loopTransition = {
  duration: 2.4,
  repeat: Infinity,
  repeatType: "reverse",
  ease: "easeInOut",
} as const;

const springTransition = {
  type: "spring",
  stiffness: 100,
  damping: 20,
} as const;

const priorityItems = [
  { id: "north", label: "Nord hub", score: "47.2%" },
  { id: "west", label: "Ouest relais", score: "38.6%" },
  { id: "south", label: "Sud crossdock", score: "29.4%" },
];

const prompts = [
  "Simuler renfort temporaire sur 4 sites",
  "Comparer impact coûts intérim vs réaffectation",
  "Prioriser les zones en tension sous 72h",
];

function HeroSignalBoardBase() {
  const [priorities, setPriorities] = useState(priorityItems);
  const [promptIndex, setPromptIndex] = useState(0);
  const [cursor, setCursor] = useState(0);

  const activePrompt = prompts[promptIndex] ?? "";

  useEffect(() => {
    const priorityTimer = window.setInterval(() => {
      setPriorities((previous) => {
        const [first, ...rest] = previous;
        return first ? [...rest, first] : previous;
      });
    }, 2800);

    return () => window.clearInterval(priorityTimer);
  }, []);

  useEffect(() => {
    const typingTimer = window.setInterval(() => {
      setCursor((previous) => {
        const next = previous + 1;
        if (next <= activePrompt.length) return next;

        setPromptIndex((current) => (current + 1) % prompts.length);
        return 0;
      });
    }, 56);

    return () => window.clearInterval(typingTimer);
  }, [activePrompt.length]);

  return (
    <div className="grid gap-3 md:grid-cols-[1.25fr_1fr]">
      <div className="panel-glass rounded-3xl p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
          Intelligent list
        </p>
        <LayoutGroup>
          <div className="mt-4 space-y-2">
            <AnimatePresence initial={false}>
              {priorities.map((item, index) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0.4, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={springTransition}
                  className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2"
                >
                  <span className="text-sm font-medium text-[var(--ink)]">
                    {index + 1}. {item.label}
                  </span>
                  <span className="font-mono text-xs text-[var(--ink-soft)]">
                    {item.score}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </LayoutGroup>
      </div>

      <div className="panel-glass rounded-3xl p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
          Command input
        </p>
        <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-3">
          <div className="inline-flex items-center gap-2 text-xs text-[var(--ink-muted)]">
            <Sparkle size={13} weight="fill" />
            Assistant opérationnel
          </div>
          <p className="mt-3 min-h-11 text-sm leading-relaxed text-[var(--ink)]">
            {activePrompt.slice(0, cursor)}
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
              className="ml-0.5 inline-block h-4 w-[2px] bg-[var(--accent-500)] align-middle"
            />
          </p>
        </div>
      </div>

      <div className="panel-glass rounded-3xl p-5 md:col-span-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
            Live status
          </p>
          <motion.span
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--ink-soft)]"
            animate={{ scale: [1, 1.02, 1] }}
            transition={loopTransition}
          >
            <Pulse size={12} weight="duotone" />
            Flux actif
          </motion.span>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-[1.35fr_1fr]">
          <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
            <motion.div
              className="flex min-w-[200%] items-center gap-2 px-3 py-2"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            >
              {[...priorityItems, ...priorityItems].map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-1"
                >
                  <span className="font-mono text-xs text-[var(--ink-soft)]">
                    {item.label} · {item.score}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-3 py-2">
            <div className="flex items-center gap-2 text-[0.72rem] text-[var(--ink-muted)]">
              <CalendarCheck size={13} weight="duotone" />
              Focus mode
            </div>
            <motion.div
              className="mt-2 h-2 rounded-full bg-[var(--accent-100)]"
              animate={{ opacity: [0.5, 1, 0.5], scaleX: [0.98, 1, 0.98] }}
              transition={loopTransition}
            />
            <div className="mt-2 flex items-center gap-1.5 text-[var(--ink-soft)]">
              <Rows size={12} weight="duotone" />
              <WaveSine size={12} weight="duotone" />
              <ClockCountdown size={12} weight="duotone" />
              <DotsThree size={12} weight="bold" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const HeroSignalBoard = memo(HeroSignalBoardBase);
