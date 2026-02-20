"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";
import { cn } from "@praedixa/ui";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastData {
  id: string;
  variant: ToastVariant;
  message: string;
  duration?: number;
}

const VARIANT_STYLES: Record<
  ToastVariant,
  { bg: string; border: string; text: string; icon: typeof CheckCircle2 }
> = {
  success: {
    bg: "bg-success-50",
    border: "border-success-500",
    text: "text-success-700",
    icon: CheckCircle2,
  },
  error: {
    bg: "bg-danger-50",
    border: "border-danger-500",
    text: "text-danger-700",
    icon: XCircle,
  },
  warning: {
    bg: "bg-warning-50",
    border: "border-warning-500",
    text: "text-warning-700",
    icon: AlertTriangle,
  },
  info: {
    bg: "bg-info-light",
    border: "border-info",
    text: "text-info-text",
    icon: Info,
  },
};

const DEFAULT_DURATION = 4000;

interface ToastItemProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [exiting, setExiting] = useState(false);
  const style = VARIANT_STYLES[toast.variant];
  const Icon = style.icon;
  const duration = toast.duration ?? DEFAULT_DURATION;

  const handleDismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 200);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    const timer = setTimeout(handleDismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, handleDismiss]);

  return (
    <div
      role="alert"
      className={cn(
        "pointer-events-auto flex w-80 items-start gap-3 rounded-lg border-l-4 p-4 shadow-card",
        style.bg,
        style.border,
        exiting ? "animate-toast-out" : "animate-toast-in",
      )}
    >
      <Icon
        className={cn("mt-0.5 h-5 w-5 shrink-0", style.text)}
        aria-hidden="true"
      />
      <p className={cn("flex-1 text-sm font-medium", style.text)}>
        {toast.message}
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors",
          style.text,
          "hover:bg-surface-sunken/70",
        )}
        aria-label="Fermer la notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed right-4 top-4 z-[var(--toast-z,9999)] flex flex-col gap-2"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
