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
  /** Optional undo action */
  onUndo?: () => void;
}

const VARIANT_STYLES: Record<
  ToastVariant,
  { accent: string; icon: string; iconEl: typeof CheckCircle2 }
> = {
  success: {
    accent: "bg-success",
    icon: "text-success",
    iconEl: CheckCircle2,
  },
  error: {
    accent: "bg-danger",
    icon: "text-danger",
    iconEl: XCircle,
  },
  warning: {
    accent: "bg-warning",
    icon: "text-warning",
    iconEl: AlertTriangle,
  },
  info: {
    accent: "bg-info",
    icon: "text-info",
    iconEl: Info,
  },
};

const DEFAULT_DURATION = 5000;

function getReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getSlideVariants(reduced: boolean) {
  return {
    initial: reduced ? { opacity: 0 } : { opacity: 0, x: 60, y: -4 },
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
          x: 60,
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
  const Icon = style.iconEl;
  const duration = toast.duration ?? DEFAULT_DURATION;
  const role = toast.variant === "error" ? "alert" : "status";
  const ariaLive = toast.variant === "error" ? "assertive" : "polite";
  const slideVariants = getSlideVariants(getReducedMotion());

  const handleDismiss = useCallback(() => {
    onDismiss(toast.id);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    if (toast.onUndo) return; // Don't auto-dismiss if undo action
    if (toast.variant === "error") return; // Never auto-dismiss critical/error toasts
    const timer = setTimeout(handleDismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, handleDismiss, toast.onUndo, toast.variant]);

  return (
    <motion.div
      layout
      variants={slideVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      role={role}
      aria-live={ariaLive}
      className={cn(
        "pointer-events-auto relative flex w-[340px] items-start gap-3 overflow-hidden rounded-lg",
        "surface-glass shadow-overlay",
      )}
    >
      {/* Left accent */}
      <div className={cn("w-[3px] shrink-0 self-stretch", style.accent)} />

      <div className="flex flex-1 items-start gap-3 py-3.5 pr-3">
        <Icon
          className={cn("mt-0.5 h-5 w-5 shrink-0", style.icon)}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-title-sm text-ink">{toast.title}</p>
          {toast.description && (
            <p className="mt-0.5 text-caption text-ink-secondary">
              {toast.description}
            </p>
          )}
          {toast.onUndo && (
            <button
              type="button"
              onClick={() => {
                toast.onUndo?.();
                handleDismiss();
              }}
              className="mt-1.5 inline-flex items-center gap-1 text-caption font-semibold text-primary transition-colors duration-fast hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:rounded"
              aria-label="Annuler l'action"
            >
              Annuler
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
            "text-ink-tertiary transition-colors duration-fast",
            "hover:bg-surface-interactive hover:text-ink",
          )}
          aria-label="Fermer la notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Progress bar (auto-dismiss timer) — hidden for error and undo */}
      {!toast.onUndo && toast.variant !== "error" && (
        <motion.div
          className={cn("absolute bottom-0 left-0 h-[2px]", style.accent)}
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: duration / 1000, ease: "linear" }}
        />
      )}
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
