"use client";

import { useContext } from "react";
import { ToastContext } from "@/components/toast-provider";

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return {
    success: (message: string, duration?: number) =>
      context.addToast("success", message, duration),
    error: (message: string, duration?: number) =>
      context.addToast("error", message, duration),
    warning: (message: string, duration?: number) =>
      context.addToast("warning", message, duration),
    info: (message: string, duration?: number) =>
      context.addToast("info", message, duration),
  };
}
