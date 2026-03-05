"use client";

import { useEffect } from "react";
import { isKnownExternalRuntimeError } from "@/lib/runtime-error-shield";

export function RuntimeErrorShield() {
  useEffect(() => {
    function handleError(event: ErrorEvent): void {
      const candidate = event.message || event.error;
      if (!isKnownExternalRuntimeError(candidate)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    function handleRejection(event: PromiseRejectionEvent): void {
      if (!isKnownExternalRuntimeError(event.reason)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    window.addEventListener("error", handleError, true);
    window.addEventListener("unhandledrejection", handleRejection, true);

    return () => {
      window.removeEventListener("error", handleError, true);
      window.removeEventListener("unhandledrejection", handleRejection, true);
    };
  }, []);

  return null;
}
