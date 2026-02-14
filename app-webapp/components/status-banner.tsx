"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, AlertOctagon } from "lucide-react";
import { cn } from "@praedixa/ui";
import { DURATION, EASING } from "@/lib/animations/config";

type StatusBannerVariant = "success" | "warning" | "danger" | "info";

interface StatusBannerProps {
  variant: StatusBannerVariant;
  children: React.ReactNode;
  className?: string;
  title?: string;
}

const variantStyles: Record<
  StatusBannerVariant,
  {
    container: string;
    icon: string;
    title: string;
    accent: string;
    glow: string;
  }
> = {
  success: {
    container: "border border-success-light surface-glass text-success-text",
    icon: "text-success",
    title: "text-success-text",
    accent: "bg-success",
    glow: "glow-success",
  },
  warning: {
    container: "border border-warning-light surface-glass text-warning-text",
    icon: "text-warning",
    title: "text-warning-text",
    accent: "bg-warning",
    glow: "glow-warning",
  },
  danger: {
    container: "border border-danger-light surface-glass text-danger-text",
    icon: "text-danger",
    title: "text-danger-text",
    accent: "bg-danger",
    glow: "glow-danger",
  },
  info: {
    container: "border border-info-light surface-glass text-info-text",
    icon: "text-info",
    title: "text-info-text",
    accent: "bg-info",
    glow: "",
  },
};

const variantIcons: Record<StatusBannerVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertOctagon,
  info: Info,
};

export function StatusBanner({
  variant,
  title,
  children,
  className,
}: StatusBannerProps) {
  const styles = variantStyles[variant];
  const Icon = variantIcons[variant];

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: -6, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: DURATION.normal,
        ease: EASING.premium,
        opacity: { duration: DURATION.slow, ease: EASING.smooth },
      }}
      className={cn(
        "relative flex items-start gap-3.5 overflow-hidden rounded-lg border px-5 py-4 text-body-sm transition-shadow duration-normal",
        styles.container,
        styles.glow,
        className,
      )}
    >
      {/* Left accent line */}
      <div
        className={cn("absolute left-0 top-0 h-full w-[3px]", styles.accent)}
      />

      <Icon
        className={cn("mt-0.5 h-5 w-5 shrink-0", styles.icon)}
        aria-hidden="true"
      />
      <div className="flex-1">
        {title && (
          <h4 className={cn("mb-0.5 text-title-sm", styles.title)}>{title}</h4>
        )}
        <div className="leading-relaxed opacity-90">{children}</div>
      </div>
    </motion.div>
  );
}
