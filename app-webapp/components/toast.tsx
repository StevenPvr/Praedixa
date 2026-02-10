"use client";

import { useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";
import { cn } from "@praedixa/ui";
import { DURATION, EASING } from "@/lib/animations/config";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastData {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
}

const VARIANT_STYLES: Record<
  ToastVariant,
  { bg: string; accent: string; text: string; icon: typeof CheckCircle2 }
> = {
  success: {
    bg: "bg-white",
    accent: "bg-success-500",
    text: "text-success-700",
    icon: CheckCircle2,
  },
  error: {
    bg: "bg-white",
    accent: "bg-danger-500",
    text: "text-danger-700",
    icon: XCircle,
  },
  warning: {
    bg: "bg-white",
    accent: "bg-warning-500",
    text: "text-warning-700",
    icon: AlertTriangle,
  },
  info: {
    bg: "bg-white",
    accent: "bg-blue-500",
    text: "text-blue-700",
    icon: Info,
  },
};

const DEFAULT_DURATION = 5000;

function getReducedMotion(): boolean {
  /* v8 ignore next -- SSR guard: window is always defined in jsdom */
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getSlideVariants(reduced: boolean) {
  return {
    initial: reduced ? { opacity: 0 } : { opacity: 0, x: 80, y: -8 },
    animate: reduced
      ? { opacity: 1 }
      : {
          opacity: 1,
          x: 0,
          y: 0,
          transition: { duration: DURATION.normal, ease: EASING.snappy },
        },
    exit: reduced
      ? { opacity: 0 }
      : {
          opacity: 0,
          x: 80,
          transition: { duration: DURATION.fast, ease: EASING.smooth },
        },
  };
}

interface ToastItemProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const style = VARIANT_STYLES[toast.variant];
  const Icon = style.icon;
  const duration = toast.duration ?? DEFAULT_DURATION;
  const role =
    toast.variant === "error" || toast.variant === "warning"
      ? "alert"
      : "status";
  const slideVariants = getSlideVariants(getReducedMotion());

  const handleDismiss = useCallback(() => {
    onDismiss(toast.id);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    const timer = setTimeout(handleDismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, handleDismiss]);

  return (
    <motion.div
      layout
      variants={slideVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      role={role}
      className={cn(
        "pointer-events-auto flex w-80 items-start gap-3 overflow-hidden rounded-xl border border-gray-200 shadow-lg",
        style.bg,
      )}
    >
      <div className={cn("w-[3px] shrink-0 self-stretch", style.accent)} />
      <div className="flex flex-1 items-start gap-3 py-3 pr-3">
        <Icon
          className={cn("mt-0.5 h-5 w-5 shrink-0", style.text)}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-semibold", style.text)}>
            {toast.title}
          </p>
          {toast.description && (
            <p className="mt-0.5 text-xs text-gray-500">{toast.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Fermer la notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed right-4 top-4 z-[9999] flex flex-col gap-2"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}
