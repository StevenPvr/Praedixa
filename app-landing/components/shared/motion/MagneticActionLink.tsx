"use client";

import type { MouseEvent } from "react";
import { memo } from "react";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { cn } from "../../../lib/utils";

interface MagneticActionLinkProps {
  href: string;
  label: string;
  className?: string;
  wrapperClassName?: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function MagneticActionLinkInner({
  href,
  label,
  className,
  wrapperClassName,
}: MagneticActionLinkProps) {
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const reducedMotion = useReducedMotion();

  const x = useTransform(pointerX, [-1, 1], [-11, 11]);
  const y = useTransform(pointerY, [-1, 1], [-8, 8]);

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (reducedMotion) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const nextX =
      (event.clientX - (bounds.left + bounds.width / 2)) / (bounds.width / 2);
    const nextY =
      (event.clientY - (bounds.top + bounds.height / 2)) / (bounds.height / 2);

    pointerX.set(clamp(nextX, -1, 1));
    pointerY.set(clamp(nextY, -1, 1));
  };

  const resetMagnet = () => {
    if (reducedMotion) return;

    animate(pointerX, 0, {
      type: "spring",
      stiffness: 140,
      damping: 20,
      mass: 0.8,
    });
    animate(pointerY, 0, {
      type: "spring",
      stiffness: 140,
      damping: 20,
      mass: 0.8,
    });
  };

  return (
    <motion.div
      className={cn("w-full will-change-transform", wrapperClassName)}
      {...(reducedMotion ? {} : { style: { x, y } })}
      onMouseMove={handleMouseMove}
      onMouseLeave={resetMagnet}
    >
      <Link
        href={href}
        className={cn(
          "group inline-flex w-full items-center justify-between rounded-full border px-5 py-3.5 text-sm font-semibold tracking-[-0.01em] no-underline transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98]",
          className,
        )}
      >
        <span>{label}</span>
        <span
          aria-hidden="true"
          className="shrink-0 transition-transform duration-200 [transition-timing-function:var(--ease-snappy)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        >
          <ArrowUpRight size={18} weight="bold" />
        </span>
      </Link>
    </motion.div>
  );
}

export const MagneticActionLink = memo(MagneticActionLinkInner);
