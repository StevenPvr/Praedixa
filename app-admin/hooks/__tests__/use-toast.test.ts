import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { ToastContext } from "@/components/toast-provider";
import { useToast } from "../use-toast";

const mockAddToast = vi.fn();
const mockRemoveToast = vi.fn();

describe("useToast", () => {
  it("throws when used outside ToastProvider", () => {
    expect(() => {
      renderHook(() => useToast());
    }).toThrow("useToast must be used within a ToastProvider");
  });

  it("maps success/error/warning/info to addToast", () => {
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(
        ToastContext.Provider,
        { value: { addToast: mockAddToast, removeToast: mockRemoveToast } },
        children,
      );

    const { result } = renderHook(() => useToast(), { wrapper });

    result.current.success("ok");
    result.current.error("ko");
    result.current.warning("careful");
    result.current.info("heads up", 4000);

    expect(mockAddToast).toHaveBeenNthCalledWith(1, "success", "ok", undefined);
    expect(mockAddToast).toHaveBeenNthCalledWith(2, "error", "ko", undefined);
    expect(mockAddToast).toHaveBeenNthCalledWith(
      3,
      "warning",
      "careful",
      undefined,
    );
    expect(mockAddToast).toHaveBeenNthCalledWith(4, "info", "heads up", 4000);
  });
});
