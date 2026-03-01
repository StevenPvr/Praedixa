"use client";

import { memo, useEffect, useMemo, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowClockwise, CaretDown } from "@phosphor-icons/react";
import type { Dictionary } from "../../lib/i18n/types";

interface FaqSectionClientProps {
  dict: Dictionary;
}

interface MagneticCategoryPillProps {
  active: boolean;
  category: string;
  index: number;
  onClick: (category: string) => void;
}

interface EmptyStateProps {
  title: string;
  body: string;
}

interface ErrorStateProps {
  title: string;
  body: string;
  retryLabel: string;
  onRetry: () => void;
}

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };
const MAGNETIC_SPRING = { stiffness: 260, damping: 22, mass: 0.24 };

const LIST_VARIANTS = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: SPRING,
  },
};

const Beacon = memo(function Beacon({ reduced }: { reduced: boolean }) {
  if (reduced) {
    return <span className="h-2.5 w-2.5 rounded-full bg-brass-600" />;
  }

  return (
    <motion.span
      className="h-2.5 w-2.5 rounded-full bg-brass-600"
      animate={{ opacity: [0.45, 1, 0.45], scale: [0.9, 1.08, 0.9] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
    />
  );
});

const MagneticCategoryPill = memo(function MagneticCategoryPill({
  active,
  category,
  index,
  onClick,
}: MagneticCategoryPillProps) {
  const reducedMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const mappedX = useTransform(pointerX, [-1, 1], [-6, 6]);
  const mappedY = useTransform(pointerY, [-1, 1], [-6, 6]);
  const springX = useSpring(mappedX, MAGNETIC_SPRING);
  const springY = useSpring(mappedY, MAGNETIC_SPRING);

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (reducedMotion) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const normalizedX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const normalizedY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    pointerX.set(normalizedX);
    pointerY.set(normalizedY);
  };

  const handlePointerLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <motion.button
      type="button"
      layout
      onClick={() => onClick(category)}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={reducedMotion ? undefined : { x: springX, y: springY }}
      transition={SPRING}
      className={`relative overflow-hidden rounded-2xl border px-4 py-3 text-left text-sm font-medium tracking-tight transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:-translate-y-[1px] active:scale-[0.98] ${
        active
          ? "border-brass-300 text-brass-800"
          : "border-border-subtle bg-white/80 text-neutral-600 hover:border-border-hover hover:bg-white hover:text-ink"
      }`}
    >
      {active ? (
        <motion.span
          layoutId="faq-active-category-pill"
          className="absolute inset-0 rounded-2xl border border-white/10 bg-brass-50/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
          transition={SPRING}
        />
      ) : null}

      <span className="relative z-[1] flex items-center justify-between gap-3">
        <span>{category}</span>
        <span
          className="text-2xs uppercase tracking-[0.08em] text-neutral-400"
          style={{ animationDelay: `${index * 80}ms` }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
      </span>
    </motion.button>
  );
});

const FaqSkeleton = memo(function FaqSkeleton({
  label,
}: {
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-[color:var(--surface-elevated)] p-4 md:p-6">
      <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">{label}</p>
      <div className="mt-4 space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`faq-skeleton-${index}`}
            className="rounded-xl border border-border-subtle/70 bg-white/70 p-4"
          >
            <div className="h-3.5 w-[84%] animate-pulse rounded-full bg-neutral-200/80" />
            <div className="mt-3 h-3 w-[56%] animate-pulse rounded-full bg-neutral-100" />
          </div>
        ))}
      </div>
    </div>
  );
});

function EmptyState({ title, body }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-[color:var(--surface-elevated)] p-6">
      <p className="text-sm font-semibold tracking-tight text-ink">{title}</p>
      <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-neutral-600">
        {body}
      </p>
    </div>
  );
}

function ErrorState({ title, body, retryLabel, onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-2xl border border-brass-200 bg-brass-50/40 p-6">
      <p className="text-sm font-semibold tracking-tight text-brass-800">{title}</p>
      <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-brass-700/90">
        {body}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-2 rounded-full border border-brass-300 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-brass-800 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-brass-400 hover:bg-white active:-translate-y-[1px] active:scale-[0.98]"
      >
        <ArrowClockwise size={14} weight="regular" />
        <span>{retryLabel}</span>
      </button>
    </div>
  );
}

export function FaqSectionClient({ dict }: FaqSectionClientProps) {
  const categories = dict.faq.categories;
  const [activeCategory, setActiveCategory] = useState(categories[0] ?? "");
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const [loadingCategory, setLoadingCategory] = useState(activeCategory);
  const reducedMotion = useReducedMotion();

  const filteredItems = useMemo(
    () => dict.faq.items.filter((item) => item.category === activeCategory),
    [dict.faq.items, activeCategory],
  );

  useEffect(() => {
    if (!activeCategory) {
      return;
    }

    setLoadingCategory(activeCategory);
    const timer = window.setTimeout(() => {
      setLoadingCategory("");
    }, 220);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeCategory]);

  useEffect(() => {
    if (filteredItems.length === 0) {
      setOpenQuestion(null);
      return;
    }

    setOpenQuestion((currentOpen) => {
      if (
        currentOpen &&
        filteredItems.some((item) => item.question === currentOpen)
      ) {
        return currentOpen;
      }

      return filteredItems[0]?.question ?? null;
    });
  }, [filteredItems]);

  const hasCategories = categories.length > 0;
  const hasInvalidCategory = !hasCategories || !categories.includes(activeCategory);
  const isLoading = loadingCategory === activeCategory && !hasInvalidCategory;

  const handleCategorySelect = (category: string) => {
    setActiveCategory(category);
    setOpenQuestion(null);
  };

  const handleResetCategory = () => {
    const fallbackCategory = categories[0] ?? "";
    setActiveCategory(fallbackCategory);
    setOpenQuestion(null);
  };

  return (
    <div className="rounded-[2rem] border border-border-subtle/90 bg-gradient-to-b from-white/95 via-white to-[color:var(--surface-elevated)] p-4 shadow-[0_20px_40px_-20px_rgba(28,22,14,0.18)] md:p-8">
      <div className="flex flex-wrap items-center gap-3 border-b border-border-subtle pb-5">
        <Beacon reduced={Boolean(reducedMotion)} />
        <p className="text-2xs uppercase tracking-[0.12em] text-neutral-500">
          {dict.faq.liveLabel}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {categories.map((category, index) => (
          <MagneticCategoryPill
            key={category}
            active={activeCategory === category}
            category={category}
            index={index}
            onClick={handleCategorySelect}
          />
        ))}
      </div>

      <div className="mt-6">
        {hasInvalidCategory ? (
          <ErrorState
            title={dict.faq.errorTitle}
            body={dict.faq.errorBody}
            retryLabel={dict.faq.retryLabel}
            onRetry={handleResetCategory}
          />
        ) : null}

        {!hasInvalidCategory && isLoading ? (
          <FaqSkeleton label={dict.faq.loadingLabel} />
        ) : null}

        {!hasInvalidCategory && !isLoading && filteredItems.length === 0 ? (
          <EmptyState title={dict.faq.emptyTitle} body={dict.faq.emptyBody} />
        ) : null}

        {!hasInvalidCategory && !isLoading && filteredItems.length > 0 ? (
          <motion.ul
            layout
            variants={LIST_VARIANTS}
            initial="hidden"
            animate="show"
            className="divide-y divide-border-subtle"
          >
            {filteredItems.map((item) => {
              const isOpen = openQuestion === item.question;

              return (
                <motion.li
                  key={item.question}
                  layout
                  variants={ITEM_VARIANTS}
                  className="py-1"
                >
                  <motion.button
                    layout
                    type="button"
                    onClick={() =>
                      setOpenQuestion(isOpen ? null : item.question)
                    }
                    aria-expanded={isOpen}
                    className="group flex w-full items-start justify-between gap-4 rounded-2xl bg-transparent px-2 py-5 text-left transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-neutral-50/70 hover:pl-3 active:-translate-y-[1px] active:scale-[0.99]"
                  >
                    <span className="max-w-[58ch] text-sm font-semibold leading-relaxed tracking-tight text-ink md:text-base">
                      {item.question}
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0, y: isOpen ? 1 : 0 }}
                      transition={SPRING}
                      className="mt-0.5 shrink-0 rounded-full border border-border-subtle bg-white p-1.5 text-neutral-500 transition-colors duration-300 group-hover:text-brass-700"
                    >
                      <CaretDown size={16} weight="regular" />
                    </motion.span>
                  </motion.button>

                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <motion.div
                        layout
                        key={`answer-${item.question}`}
                        initial={{ opacity: 0, y: -6, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.985 }}
                        transition={SPRING}
                        className="origin-top pb-5 pl-2 pr-12"
                      >
                        <p className="max-w-[65ch] text-sm leading-relaxed text-neutral-600 md:text-base">
                          {item.answer}
                        </p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </motion.ul>
        ) : null}
      </div>
    </div>
  );
}
