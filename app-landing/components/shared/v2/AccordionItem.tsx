"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "../../../lib/utils";

interface AccordionItemProps {
  question: string;
  answer: string;
  /** Controlled mode: current open state */
  open?: boolean;
  /** Controlled mode: toggle callback */
  onToggle?: () => void;
  className?: string;
}

const PANEL_SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };

function getPanelAnimation(
  reducedMotion: boolean,
  isOpen: boolean,
): { height?: number | "auto"; opacity: number } {
  if (reducedMotion) {
    return { opacity: isOpen ? 1 : 0 };
  }

  return {
    height: isOpen ? "auto" : 0,
    opacity: isOpen ? 1 : 0,
  };
}

function AccordionToggleIcon({
  isOpen,
  reducedMotion,
}: {
  isOpen: boolean;
  reducedMotion: boolean;
}) {
  return (
    <motion.span
      animate={{ rotate: isOpen ? 45 : 0 }}
      transition={reducedMotion ? { duration: 0 } : PANEL_SPRING}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-v2-border-200 text-ink-700 transition-colors group-hover:border-v2-border-300 group-hover:text-ink-950"
      aria-hidden="true"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <line x1="7" y1="2" x2="7" y2="12" />
        <line x1="2" y1="7" x2="12" y2="7" />
      </svg>
    </motion.span>
  );
}

function AccordionPanel({
  answer,
  reducedMotion,
}: {
  answer: string;
  reducedMotion: boolean;
}) {
  return (
    <motion.div
      key="accordion-panel"
      initial={getPanelAnimation(reducedMotion, false)}
      animate={getPanelAnimation(reducedMotion, true)}
      exit={getPanelAnimation(reducedMotion, false)}
      transition={reducedMotion ? { duration: 0 } : PANEL_SPRING}
      className="overflow-hidden"
    >
      <p className="pb-5 pr-12 text-sm leading-relaxed text-ink-700 md:text-base">
        {answer}
      </p>
    </motion.div>
  );
}

export function AccordionItem({
  question,
  answer,
  open: controlledOpen,
  onToggle,
  className,
}: AccordionItemProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const reducedMotion = useReducedMotion() ?? false;

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const handleToggle = useCallback(() => {
    if (isControlled && onToggle) {
      onToggle();
    } else {
      setInternalOpen((prev) => !prev);
    }
  }, [isControlled, onToggle]);

  return (
    <div className={cn("border-b border-v2-border-100", className)}>
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        className="group flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-sm font-semibold tracking-tight text-ink-950 md:text-base">
          {question}
        </span>
        <AccordionToggleIcon isOpen={isOpen} reducedMotion={reducedMotion} />
      </button>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <AccordionPanel answer={answer} reducedMotion={reducedMotion} />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
