"use client";

import {
  createContext,
  useCallback,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { ToastContainer, type ToastData, type ToastVariant } from "./toast";

export interface ToastOptions {
  variant: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
}

export interface ToastContextValue {
  toast: (opts: ToastOptions) => string;
  dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_TOASTS = 3;
let nextId = 0;

type Action =
  | { type: "ADD_TOAST"; toast: ToastData }
  | { type: "REMOVE_TOAST"; id: string };

function toastReducer(state: ToastData[], action: Action): ToastData[] {
  switch (action.type) {
    case "ADD_TOAST": {
      const next = [...state, action.toast];
      return next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next;
    }
    case "REMOVE_TOAST":
      return state.filter((t) => t.id !== action.id);
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  const dismiss = useCallback((id: string) => {
    dispatch({ type: "REMOVE_TOAST", id });
  }, []);

  const toast = useCallback((opts: ToastOptions): string => {
    const id = `toast-${++nextId}`;
    dispatch({
      type: "ADD_TOAST",
      toast: {
        id,
        variant: opts.variant,
        title: opts.title,
        description: opts.description,
        duration: opts.duration,
      },
    });
    return id;
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
