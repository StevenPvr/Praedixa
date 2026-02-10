import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { ToastContext } from "@/components/toast-provider";
import { useToast } from "../use-toast";

// We must mock toast-provider to prevent it from importing framer-motion
// but we still need the real ToastContext for useContext to work.
// Since toast-provider re-exports ToastContext created via createContext,
// we mock only the transitive deps (framer-motion, lucide-react, @praedixa/ui).

vi.mock("@praedixa/ui", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: any) => createElement("div", rest, children),
  },
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("lucide-react", () => ({
  CheckCircle2: () => null,
  AlertTriangle: () => null,
  Info: () => null,
  XCircle: () => null,
  X: () => null,
}));

const mockToast = vi.fn().mockReturnValue("toast-42");
const mockDismiss = vi.fn();

describe("useToast", () => {
  it("throws when used outside ToastProvider", () => {
    expect(() => {
      renderHook(() => useToast());
    }).toThrow("useToast must be used within a ToastProvider");
  });

  it("returns toast and dismiss from context", () => {
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(
        ToastContext.Provider,
        { value: { toast: mockToast, dismiss: mockDismiss } },
        children,
      );

    const { result } = renderHook(() => useToast(), { wrapper });

    expect(result.current.toast).toBe(mockToast);
    expect(result.current.dismiss).toBe(mockDismiss);
  });

  it("toast function can be called with options", () => {
    mockToast.mockClear();
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(
        ToastContext.Provider,
        { value: { toast: mockToast, dismiss: mockDismiss } },
        children,
      );

    const { result } = renderHook(() => useToast(), { wrapper });

    const id = result.current.toast({
      variant: "success",
      title: "Test",
      description: "Description",
    });
    expect(mockToast).toHaveBeenCalledWith({
      variant: "success",
      title: "Test",
      description: "Description",
    });
    expect(id).toBe("toast-42");
  });

  it("dismiss function can be called with id", () => {
    mockDismiss.mockClear();
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(
        ToastContext.Provider,
        { value: { toast: mockToast, dismiss: mockDismiss } },
        children,
      );

    const { result } = renderHook(() => useToast(), { wrapper });

    result.current.dismiss("toast-1");
    expect(mockDismiss).toHaveBeenCalledWith("toast-1");
  });
});
