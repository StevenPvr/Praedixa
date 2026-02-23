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
  }
> = {
  success: {
    container:
      "border border-success-light bg-success-light/30 text-success-text",
    icon: "text-success",
    title: "text-success-text",
  },
  warning: {
    container:
      "border border-warning-light bg-warning-light/30 text-warning-text",
    icon: "text-warning",
    title: "text-warning-text",
  },
  danger: {
    container: "border border-danger-light bg-danger-light/30 text-danger-text",
    icon: "text-danger",
    title: "text-danger-text",
  },
  info: {
    container: "border border-info-light bg-info-light/30 text-info-text",
    icon: "text-info",
    title: "text-info-text",
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
        "flex items-start gap-3.5 rounded-lg px-4 py-3 text-body-sm transition-shadow duration-normal",
        styles.container,
        className,
      )}
    >
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
