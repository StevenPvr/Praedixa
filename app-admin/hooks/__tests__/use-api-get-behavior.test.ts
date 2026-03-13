import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockReplace,
  mockPush,
  mockApiGet,
  mockApiGetPaginated,
  mockApiPost,
  mockApiPatch,
  mockClearAuthSession,
} = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  mockPush: vi.fn(),
  mockApiGet: vi.fn(),
  mockApiGetPaginated: vi.fn(),
  mockApiPost: vi.fn(),
  mockApiPatch: vi.fn(),
  mockClearAuthSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

vi.mock("@/lib/api/client", () => ({
  apiGet: mockApiGet,
  apiGetPaginated: mockApiGetPaginated,
  apiPost: mockApiPost,
  apiPatch: mockApiPatch,
  ApiError: class ApiError extends Error {
    status: number;
    constructor(msg: string, status: number) {
      super(msg);
      this.name = "ApiError";
      this.status = status;
    }
  },
}));

vi.mock("@/lib/auth/client", () => ({
  getValidAccessToken: () => Promise.resolve("test-token"),
  clearAuthSession: () => mockClearAuthSession(),
}));

import { ApiError } from "@/lib/api/client";
import { useApiGet } from "../use-api";

interface TestItem {
  id: number;
  name: string;
}

function successResponse<T>(data: T) {
  return { success: true, data, timestamp: "2026-01-01T00:00:00Z" };
}

afterEach(() => {
  cleanup();
});

describe("useApiGet behavior", () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockReplace.mockReset();
    mockClearAuthSession.mockReset();
    mockClearAuthSession.mockResolvedValue(undefined);
  });

  it("refetches data when refetch is called", async () => {
    const item1: TestItem = { id: 1, name: "First" };
    const item2: TestItem = { id: 2, name: "Second" };
    mockApiGet.mockResolvedValue(successResponse(item1));

    const { result } = renderHook(() => useApiGet<TestItem>("/api/v1/items"));

    await waitFor(() => {
      expect(result.current.data).toEqual(item1);
    });

    mockApiGet.mockResolvedValue(successResponse(item2));

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(item2);
    });
  });

  it("aborts previous fetch on unmount", () => {
    mockApiGet.mockReturnValue(new Promise(() => {}));

    const { unmount } = renderHook(() => useApiGet<TestItem>("/api/v1/items"));

    unmount();

    const lastCallIdx = mockApiGet.mock.calls.length - 1;
    const signal = mockApiGet.mock.calls[lastCallIdx][2].signal as AbortSignal;
    expect(signal.aborted).toBe(true);
  });

  it("protects against race conditions and keeps latest fetch", async () => {
    let resolveFirst: (value: unknown) => void;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    mockApiGet.mockReturnValue(firstPromise);

    const { result, rerender } = renderHook(
      ({ url }: { url: string }) => useApiGet<TestItem>(url),
      { initialProps: { url: "/api/v1/items?v=1" } },
    );

    mockApiGet.mockResolvedValue(successResponse({ id: 2, name: "New" }));
    rerender({ url: "/api/v1/items?v=2" });

    await waitFor(() => {
      expect(result.current.data).toEqual({ id: 2, name: "New" });
    });

    resolveFirst!(successResponse({ id: 1, name: "Old" }));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(result.current.data).toEqual({ id: 2, name: "New" });
  });

  it("ignores errors from aborted fetches", () => {
    mockApiGet.mockImplementation(
      (_url: string, _getToken: unknown, opts: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          opts.signal.addEventListener("abort", () => {
            reject(
              new DOMException("The operation was aborted.", "AbortError"),
            );
          });
        }),
    );

    const { result, unmount } = renderHook(() =>
      useApiGet<TestItem>("/api/v1/items"),
    );

    unmount();
    expect(result.current.error).toBeNull();
  });

  it("refetches when URL changes", async () => {
    mockApiGet.mockResolvedValue(successResponse({ id: 1, name: "A" }));

    const { result, rerender } = renderHook(
      ({ url }: { url: string }) => useApiGet<TestItem>(url),
      { initialProps: { url: "/api/v1/items/1" } },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({ id: 1, name: "A" });
    });

    mockApiGet.mockResolvedValue(successResponse({ id: 2, name: "B" }));
    rerender({ url: "/api/v1/items/2" });

    await waitFor(() => {
      expect(result.current.data).toEqual({ id: 2, name: "B" });
    });
  });

  it("ignores errors from stale fetches", async () => {
    let rejectFirst: (err: Error) => void;
    const firstPromise = new Promise((_resolve, reject) => {
      rejectFirst = reject;
    });
    mockApiGet.mockReturnValue(firstPromise);

    const { result, rerender } = renderHook(
      ({ url }: { url: string }) => useApiGet<TestItem>(url),
      { initialProps: { url: "/api/v1/items?v=1" } },
    );

    mockApiGet.mockResolvedValue(successResponse({ id: 2, name: "New" }));
    rerender({ url: "/api/v1/items?v=2" });

    await waitFor(() => {
      expect(result.current.data).toEqual({ id: 2, name: "New" });
    });

    rejectFirst!(new ApiError("Stale error", 500));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual({ id: 2, name: "New" });
  });

  it("clears error on successful refetch", async () => {
    mockApiGet.mockRejectedValue(new ApiError("Server error", 500));

    const { result } = renderHook(() =>
      useApiGet<TestItem>("/api/v1/items", { autoRetry: false }),
    );

    await waitFor(() => {
      expect(result.current.error).toBe("Server error");
    });

    mockApiGet.mockResolvedValue(successResponse({ id: 1, name: "OK" }));

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
      expect(result.current.data).toEqual({ id: 1, name: "OK" });
    });
  });

  it("sets loading back to true during refetch", async () => {
    mockApiGet.mockResolvedValue(successResponse({ id: 1, name: "A" }));

    const { result, unmount } = renderHook(() =>
      useApiGet<TestItem>("/api/v1/items"),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockApiGet.mockReturnValue(new Promise(() => {}));

    act(() => {
      result.current.refetch();
    });

    expect(result.current.loading).toBe(true);
    unmount();
  });
});
