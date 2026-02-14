"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@praedixa/ui";
import { fadeScale } from "@/lib/animations/config";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** Custom action element (CTA button, etc.). Renders instead of ctaHref/onAction when provided. */
  action?: React.ReactNode;
  ctaLabel?: string;
  ctaHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  ctaLabel,
  ctaHref,
  onAction,
  className,
}: EmptyStateProps) {
  const ctaClasses = cn(
    "mt-6 inline-flex min-h-[44px] items-center rounded-lg",
    "bg-primary px-6 py-2.5 text-body-sm font-semibold text-white",
    "shadow-raised transition-all duration-fast",
    "hover:brightness-110 hover:shadow-floating",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
    "active:scale-[0.97]",
  );

  return (
    <motion.div
      variants={fadeScale}
      initial="hidden"
      animate="visible"
      role="status"
      aria-label={title}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg",
        "border border-dashed border-border bg-surface-sunken/30",
        "px-8 py-16",
        className,
      )}
    >
      {icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--brand-subtle)] text-primary">
          {icon}
        </div>
      )}
      <p className="mt-5 text-heading-sm text-ink">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-center text-body-sm text-ink-secondary">
          {description}
        </p>
      )}

      {action}

      {!action && ctaHref && ctaLabel && (
        <Link href={ctaHref} className={ctaClasses}>
          {ctaLabel}
        </Link>
      )}

      {!action && !ctaHref && onAction && (
        <button onClick={onAction} className={ctaClasses}>
          {ctaLabel ?? "Commencer"}
        </button>
      )}
    </motion.div>
  );
}
