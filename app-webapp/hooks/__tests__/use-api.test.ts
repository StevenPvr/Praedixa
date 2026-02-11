import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Hoisted mocks — must be declared before vi.mock factories reference them
// ---------------------------------------------------------------------------

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

import {
  useApiGet,
  useApiGetPaginated,
  useApiPost,
  useApiPatch,
} from "../use-api";
import { ApiError } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// React 19 + @testing-library/react wraps in StrictMode by default,
// which causes effects to run twice. We use mockResolvedValue (not Once)
// for the initial render so that the double-invoke is handled, and then
// override with mockResolvedValueOnce for subsequent calls like refetch.

interface TestItem {
  id: number;
  name: string;
}

function successResponse<T>(data: T) {
  return { success: true, data, timestamp: "2026-01-01T00:00:00Z" };
}

function paginatedResponse<T>(
  data: T[],
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  },
) {
  return {
    success: true,
    data,
    pagination,
    timestamp: "2026-01-01T00:00:00Z",
  };
}

// ---------------------------------------------------------------------------
// useApiGet
// ---------------------------------------------------------------------------

describe("useApiGet", () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockApiGetPaginated.mockReset();
    mockReplace.mockReset();
    mockClearAuthSession.mockReset();
    mockClearAuthSession.mockResolvedValue(undefined);
  });

  it("should start with loading=true and data=null", () => {
    mockApiGet.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useApiGet<TestItem>("/api/v1/items"));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("should fetch data successfully and update state", async () => {
    const item: TestItem = { id: 1, name: "Widget" };
    mockApiGet.mockResolvedValue(successResponse(item));

    const { result } = renderHook(() => useApiGet<TestItem>("/api/v1/items"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(item);
    expect(result.current.error).toBeNull();
  });

  it("should pass URL and getAccessToken to apiGet", async () => {
    mockApiGet.mockResolvedValue(successResponse({ id: 1 }));

    renderHook(() => useApiGet<TestItem>("/api/v1/items"));

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalled();
    });

    const [url, getToken, opts] = mockApiGet.mock.calls[0];
    expect(url).toBe("/api/v1/items");
    expect(typeof getToken).toBe("function");
    expect(opts).toHaveProperty("signal");
    expect(opts.signal).toBeInstanceOf(AbortSignal);
  });

  it("should set loading=false and skip fetch when url is null", async () => {
    const { result } = renderHook(() => useApiGet<TestItem>(null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it("should handle ApiError and set error message", async () => {
    mockApiGet.mockRejectedValue(new ApiError("Ressource introuvable", 404));

    const { result } = renderHook(() =>
      useApiGet<TestItem>("/api/v1/items/999"),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Ressource introuvable");
    expect(result.current.data).toBeNull();
  });

  it("should show generic French message for non-ApiError errors", async () => {
    mockApiGet.mockRejectedValue(new TypeError("fetch failed"));

    const { result } = renderHook(() => useApiGet<TestItem>("/api/v1/items"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Une erreur inattendue est survenue");
  });

  it("should redirect to /login on 401 ApiError", async () => {
    mockApiGet.mockRejectedValue(new ApiError("Unauthorized", 401));

    renderHook(() => useApiGet<TestItem>("/api/v1/items"));

    await waitFor(() => {
      expect(mockClearAuthSession).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith("/login?reauth=1");
    });
  });

  it("should not set error state on 401 redirect", async () => {
    mockApiGet.mockRejectedValue(new ApiError("Unauthorized", 401));

    const { result } = renderHook(() => useApiGet<TestItem>("/api/v1/items"));

    await waitFor(() => {
      expect(mockClearAuthSession).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith("/login?reauth=1");
    });

    // Error should NOT be set — 401 triggers redirect, not error display
    expect(result.current.error).toBeNull();
  });

  it("should refetch data when refetch is called", async () => {
    const item1: TestItem = { id: 1, name: "First" };
    const item2: TestItem = { id: 2, name: "Second" };

    // Initial render: always return item1
    mockApiGet.mockResolvedValue(successResponse(item1));

    const { result } = renderHook(() => useApiGet<TestItem>("/api/v1/items"));

    await waitFor(() => {
      expect(result.current.data).toEqual(item1);
    });

    // Switch to item2 for the refetch call
    mockApiGet.mockResolvedValue(successResponse(item2));

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(item2);
    });
  });

  it("should abort previous fetch on unmount (AbortController cleanup)", async () => {
    mockApiGet.mockReturnValue(new Promise(() => {}));

    const { unmount } = renderHook(() => useApiGet<TestItem>("/api/v1/items"));

    unmount();

    // The signal passed to the most recent apiGet call should be aborted
    const lastCallIdx = mockApiGet.mock.calls.length - 1;
    const signal = mockApiGet.mock.calls[lastCallIdx][2].signal as AbortSignal;
    expect(signal.aborted).toBe(true);
  });

  it("should protect against race conditions — only latest fetch updates state", async () => {
    // First fetch: slow, resolves with "Old"
    // Second fetch: fast, resolves with "New"
    // Only "New" should end up in state.

    let resolveFirst: (value: unknown) => void;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    mockApiGet.mockReturnValue(firstPromise);

    const { result, rerender } = renderHook(
      ({ url }: { url: string }) => useApiGet<TestItem>(url),
      { initialProps: { url: "/api/v1/items?v=1" } },
    );

    // Trigger a second fetch by changing URL
    mockApiGet.mockResolvedValue(successResponse({ id: 2, name: "New" }));
    rerender({ url: "/api/v1/items?v=2" });

    await waitFor(() => {
      expect(result.current.data).toEqual({ id: 2, name: "New" });
    });

    // Now resolve the first (stale) fetch — state should NOT change
    resolveFirst!(successResponse({ id: 1, name: "Old" }));

    // Wait a tick to ensure the stale resolution is processed (or rather, discarded)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.data).toEqual({ id: 2, name: "New" });
  });

  it("should ignore errors from aborted fetches", async () => {
    // Simulate an abort error that occurs after unmount
    mockApiGet.mockImplementation(
      (_url: string, _getToken: unknown, opts: { signal: AbortSignal }) => {
        return new Promise((_resolve, reject) => {
          opts.signal.addEventListener("abort", () => {
            reject(
              new DOMException("The operation was aborted.", "AbortError"),
            );
          });
        });
      },
    );

    const { result, unmount } = renderHook(() =>
      useApiGet<TestItem>("/api/v1/items"),
    );

    unmount();

    // No error should be set since the signal was aborted
    expect(result.current.error).toBeNull();
  });

  it("should refetch when URL changes", async () => {
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

  it("should ignore errors from stale fetches (catch branch race guard)", async () => {
    // First fetch: slow, will reject with an error
    let rejectFirst: (err: Error) => void;
    const firstPromise = new Promise((_resolve, reject) => {
      rejectFirst = reject;
    });

    mockApiGet.mockReturnValue(firstPromise);

    const { result, rerender } = renderHook(
      ({ url }: { url: string }) => useApiGet<TestItem>(url),
      { initialProps: { url: "/api/v1/items?v=1" } },
    );

    // Trigger a second fetch by changing URL — this one succeeds
    mockApiGet.mockResolvedValue(successResponse({ id: 2, name: "New" }));
    rerender({ url: "/api/v1/items?v=2" });

    await waitFor(() => {
      expect(result.current.data).toEqual({ id: 2, name: "New" });
    });

    // Now reject the first (stale) fetch — error should be ignored
    rejectFirst!(new ApiError("Stale error", 500));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    // Error should NOT be set — the stale fetch's error was discarded
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual({ id: 2, name: "New" });
  });

  it("should clear error on successful refetch", async () => {
    mockApiGet.mockRejectedValue(new ApiError("Server error", 500));

    const { result } = renderHook(() => useApiGet<TestItem>("/api/v1/items"));

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

  it("should set loading back to true during refetch", async () => {
    mockApiGet.mockResolvedValue(successResponse({ id: 1, name: "A" }));

    const { result } = renderHook(() => useApiGet<TestItem>("/api/v1/items"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Make the next call hang so we can observe loading=true
    mockApiGet.mockReturnValue(new Promise(() => {}));

    act(() => {
      result.current.refetch();
    });

    // Loading should be true while refetching
    expect(result.current.loading).toBe(true);
  });

  it("polling should be silent on 401 (no redirect, no error)", async () => {
    mockApiGet.mockResolvedValue(successResponse({ id: 1, name: "A" }));

    const { result, unmount } = renderHook(() =>
      useApiGet<TestItem>("/api/v1/items", { pollInterval: 20 }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockApiGet.mockRejectedValue(new ApiError("Unauthorized", 401));

    await waitFor(() => {
      expect(mockApiGet.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    expect(mockClearAuthSession).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);

    unmount();
  });

  it("polling should not surface non-401 errors", async () => {
    mockApiGet.mockResolvedValue(successResponse({ id: 1, name: "A" }));

    const { result, unmount } = renderHook(() =>
      useApiGet<TestItem>("/api/v1/items", { pollInterval: 20 }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockApiGet.mockRejectedValue(new ApiError("Server error", 500));

    await waitFor(() => {
      expect(mockApiGet.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);

    unmount();
  });
});

// ---------------------------------------------------------------------------
// useApiGetPaginated
// ---------------------------------------------------------------------------

describe("useApiGetPaginated", () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockApiGetPaginated.mockReset();
    mockReplace.mockReset();
    mockClearAuthSession.mockReset();
    mockClearAuthSession.mockResolvedValue(undefined);
  });

  const defaultPagination = {
    total: 25,
    page: 1,
    pageSize: 10,
    totalPages: 3,
    hasNextPage: true,
    hasPreviousPage: false,
  };

  it("should start with loading=true and empty data", () => {
    mockApiGetPaginated.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() =>
      useApiGetPaginated<TestItem>("/api/v1/items", 1, 10),
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.pagination).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("should fetch paginated data successfully", async () => {
    const items: TestItem[] = [
      { id: 1, name: "A" },
      { id: 2, name: "B" },
    ];
    mockApiGetPaginated.mockResolvedValue(
      paginatedResponse(items, defaultPagination),
    );

    const { result } = renderHook(() =>
      useApiGetPaginated<TestItem>("/api/v1/items", 1, 10),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(items);
    expect(result.current.total).toBe(25);
    expect(result.current.pagination).toEqual(defaultPagination);
    expect(result.current.error).toBeNull();
  });

  it("should build URL with ? separator when base URL has no query params", async () => {
    mockApiGetPaginated.mockResolvedValue(
      paginatedResponse([], { ...defaultPagination, total: 0, totalPages: 0 }),
    );

    renderHook(() => useApiGetPaginated<TestItem>("/api/v1/items", 2, 20));

    await waitFor(() => {
      expect(mockApiGetPaginated).toHaveBeenCalled();
    });

    const [url] = mockApiGetPaginated.mock.calls[0];
    expect(url).toBe("/api/v1/items?page=2&page_size=20");
  });

  it("should build URL with & separator when base URL already has query params", async () => {
    mockApiGetPaginated.mockResolvedValue(
      paginatedResponse([], { ...defaultPagination, total: 0, totalPages: 0 }),
    );

    renderHook(() =>
      useApiGetPaginated<TestItem>("/api/v1/items?siteId=abc", 1, 10),
    );

    await waitFor(() => {
      expect(mockApiGetPaginated).toHaveBeenCalled();
    });

    const [url] = mockApiGetPaginated.mock.calls[0];
    expect(url).toBe("/api/v1/items?siteId=abc&page=1&page_size=10");
  });

  it("should handle ApiError and set error message", async () => {
    mockApiGetPaginated.mockRejectedValue(new ApiError("Acces refuse", 403));

    const { result } = renderHook(() =>
      useApiGetPaginated<TestItem>("/api/v1/items", 1, 10),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Acces refuse");
  });

  it("should show generic French message for non-ApiError errors", async () => {
    mockApiGetPaginated.mockRejectedValue(new Error("Network failure"));

    const { result } = renderHook(() =>
      useApiGetPaginated<TestItem>("/api/v1/items", 1, 10),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Une erreur inattendue est survenue");
  });

  it("should redirect to /login on 401 ApiError", async () => {
    mockApiGetPaginated.mockRejectedValue(new ApiError("Unauthorized", 401));

    renderHook(() => useApiGetPaginated<TestItem>("/api/v1/items", 1, 10));

    await waitFor(() => {
      expect(mockClearAuthSession).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith("/login?reauth=1");
    });
  });

  it("should refetch when refetch is called", async () => {
    const items1: TestItem[] = [{ id: 1, name: "First" }];
    const items2: TestItem[] = [{ id: 2, name: "Second" }];

    mockApiGetPaginated.mockResolvedValue(
      paginatedResponse(items1, defaultPagination),
    );

    const { result } = renderHook(() =>
      useApiGetPaginated<TestItem>("/api/v1/items", 1, 10),
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(items1);
    });

    mockApiGetPaginated.mockResolvedValue(
      paginatedResponse(items2, { ...defaultPagination, total: 30 }),
    );

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(items2);
      expect(result.current.total).toBe(30);
    });
  });

  it("should protect against race conditions — only latest fetch updates state", async () => {
    let resolveFirst: (value: unknown) => void;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    mockApiGetPaginated.mockReturnValue(firstPromise);

    const { result, rerender } = renderHook(
      ({ page }: { page: number }) =>
        useApiGetPaginated<TestItem>("/api/v1/items", page, 10),
      { initialProps: { page: 1 } },
    );

    // Trigger second fetch by changing page
    mockApiGetPaginated.mockResolvedValue(
      paginatedResponse([{ id: 2, name: "Page2" }], {
        ...defaultPagination,
        page: 2,
      }),
    );
    rerender({ page: 2 });

    await waitFor(() => {
      expect(result.current.data).toEqual([{ id: 2, name: "Page2" }]);
    });

    // Resolve stale first fetch — should NOT overwrite current state
    resolveFirst!(
      paginatedResponse([{ id: 1, name: "Page1-stale" }], defaultPagination),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.data).toEqual([{ id: 2, name: "Page2" }]);
  });

  it("should abort previous fetch on unmount", async () => {
    mockApiGetPaginated.mockReturnValue(new Promise(() => {}));

    const { unmount } = renderHook(() =>
      useApiGetPaginated<TestItem>("/api/v1/items", 1, 10),
    );

    unmount();

    const lastCallIdx = mockApiGetPaginated.mock.calls.length - 1;
    const signal = mockApiGetPaginated.mock.calls[lastCallIdx][2]
      .signal as AbortSignal;
    expect(signal.aborted).toBe(true);
  });

  it("should pass AbortSignal to apiGetPaginated", async () => {
    mockApiGetPaginated.mockResolvedValue(
      paginatedResponse([], { ...defaultPagination, total: 0, totalPages: 0 }),
    );

    renderHook(() => useApiGetPaginated<TestItem>("/api/v1/items", 1, 10));

    await waitFor(() => {
      expect(mockApiGetPaginated).toHaveBeenCalled();
    });

    const [_url, _getToken, opts] = mockApiGetPaginated.mock.calls[0];
    expect(opts).toHaveProperty("signal");
    expect(opts.signal).toBeInstanceOf(AbortSignal);
  });

  it("should refetch when page changes", async () => {
    mockApiGetPaginated.mockResolvedValue(
      paginatedResponse([{ id: 1, name: "P1" }], defaultPagination),
    );

    const { result, rerender } = renderHook(
      ({ page }: { page: number }) =>
        useApiGetPaginated<TestItem>("/api/v1/items", page, 10),
      { initialProps: { page: 1 } },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual([{ id: 1, name: "P1" }]);
    });

    mockApiGetPaginated.mockResolvedValue(
      paginatedResponse([{ id: 2, name: "P2" }], {
        ...defaultPagination,
        page: 2,
        hasPreviousPage: true,
      }),
    );
    rerender({ page: 2 });

    await waitFor(() => {
      expect(result.current.data).toEqual([{ id: 2, name: "P2" }]);
      expect(result.current.pagination?.page).toBe(2);
    });
  });

  it("should ignore errors from stale fetches (catch branch race guard)", async () => {
    let rejectFirst: (err: Error) => void;
    const firstPromise = new Promise((_resolve, reject) => {
      rejectFirst = reject;
    });

    mockApiGetPaginated.mockReturnValue(firstPromise);

    const { result, rerender } = renderHook(
      ({ page }: { page: number }) =>
        useApiGetPaginated<TestItem>("/api/v1/items", page, 10),
      { initialProps: { page: 1 } },
    );

    // Trigger second fetch by changing page — this one succeeds
    mockApiGetPaginated.mockResolvedValue(
      paginatedResponse([{ id: 2, name: "Page2" }], {
        ...defaultPagination,
        page: 2,
      }),
    );
    rerender({ page: 2 });

    await waitFor(() => {
      expect(result.current.data).toEqual([{ id: 2, name: "Page2" }]);
    });

    // Now reject the first (stale) fetch — error should be ignored
    rejectFirst!(new ApiError("Stale paginated error", 500));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual([{ id: 2, name: "Page2" }]);
  });

  it("should clear error on successful refetch", async () => {
    mockApiGetPaginated.mockRejectedValue(new ApiError("Server error", 500));

    const { result } = renderHook(() =>
      useApiGetPaginated<TestItem>("/api/v1/items", 1, 10),
    );

    await waitFor(() => {
      expect(result.current.error).toBe("Server error");
    });

    mockApiGetPaginated.mockResolvedValue(
      paginatedResponse([{ id: 1, name: "OK" }], defaultPagination),
    );

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
      expect(result.current.data).toEqual([{ id: 1, name: "OK" }]);
    });
  });
});

// ---------------------------------------------------------------------------
// useApiPost
// ---------------------------------------------------------------------------

describe("useApiPost", () => {
  beforeEach(() => {
    mockApiPost.mockReset();
    mockReplace.mockReset();
    mockClearAuthSession.mockReset();
    mockClearAuthSession.mockResolvedValue(undefined);
  });

  it("should start with loading=false and data=null", () => {
    const { result } = renderHook(() =>
      useApiPost<{ name: string }, TestItem>("/api/v1/items"),
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("should post data successfully and return data", async () => {
    const created: TestItem = { id: 1, name: "Created" };
    mockApiPost.mockResolvedValue(successResponse(created));

    const { result } = renderHook(() =>
      useApiPost<{ name: string }, TestItem>("/api/v1/items"),
    );

    let returned: TestItem | null = null;
    await act(async () => {
      returned = await result.current.mutate({ name: "Created" });
    });

    expect(returned).toEqual(created);
    expect(result.current.data).toEqual(created);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should set loading=true during mutation", async () => {
    let resolvePost!: (val: unknown) => void;
    mockApiPost.mockReturnValue(
      new Promise((resolve) => {
        resolvePost = resolve;
      }),
    );

    const { result } = renderHook(() =>
      useApiPost<{ name: string }, TestItem>("/api/v1/items"),
    );

    let mutatePromise: Promise<TestItem | null>;
    act(() => {
      mutatePromise = result.current.mutate({ name: "test" });
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolvePost(successResponse({ id: 1, name: "test" }));
      await mutatePromise;
    });

    expect(result.current.loading).toBe(false);
  });

  it("should handle ApiError and set error message", async () => {
    mockApiPost.mockRejectedValue(new ApiError("Validation failed", 422));

    const { result } = renderHook(() =>
      useApiPost<{ name: string }, TestItem>("/api/v1/items"),
    );

    let returned: TestItem | null = null;
    await act(async () => {
      returned = await result.current.mutate({ name: "bad" });
    });

    expect(returned).toBeNull();
    expect(result.current.error).toBe("Validation failed");
    expect(result.current.data).toBeNull();
  });

  it("should show generic French message for non-ApiError", async () => {
    mockApiPost.mockRejectedValue(new TypeError("fetch failed"));

    const { result } = renderHook(() =>
      useApiPost<{ name: string }, TestItem>("/api/v1/items"),
    );

    await act(async () => {
      await result.current.mutate({ name: "bad" });
    });

    expect(result.current.error).toBe("Une erreur inattendue est survenue");
  });

  it("should redirect to /login on 401 ApiError", async () => {
    mockApiPost.mockRejectedValue(new ApiError("Unauthorized", 401));

    const { result } = renderHook(() =>
      useApiPost<{ name: string }, TestItem>("/api/v1/items"),
    );

    await act(async () => {
      await result.current.mutate({ name: "test" });
    });

    expect(mockClearAuthSession).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith("/login?reauth=1");
  });

  it("should reset data, error, and loading", async () => {
    const created: TestItem = { id: 1, name: "Created" };
    mockApiPost.mockResolvedValue(successResponse(created));

    const { result } = renderHook(() =>
      useApiPost<{ name: string }, TestItem>("/api/v1/items"),
    );

    await act(async () => {
      await result.current.mutate({ name: "Created" });
    });

    expect(result.current.data).toEqual(created);

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("should pass URL and body to apiPost", async () => {
    mockApiPost.mockResolvedValue(successResponse({ id: 1, name: "test" }));

    const { result } = renderHook(() =>
      useApiPost<{ name: string }, TestItem>("/api/v1/items"),
    );

    await act(async () => {
      await result.current.mutate({ name: "test" });
    });

    expect(mockApiPost).toHaveBeenCalledWith(
      "/api/v1/items",
      { name: "test" },
      expect.any(Function),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("should abort on unmount", async () => {
    mockApiPost.mockReturnValue(new Promise(() => {}));

    const { result, unmount } = renderHook(() =>
      useApiPost<{ name: string }, TestItem>("/api/v1/items"),
    );

    act(() => {
      void result.current.mutate({ name: "test" });
    });

    unmount();

    // The AbortController should have been aborted
    const lastCall = mockApiPost.mock.calls[mockApiPost.mock.calls.length - 1];
    const signal = lastCall[3].signal as AbortSignal;
    expect(signal.aborted).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// useApiPatch
// ---------------------------------------------------------------------------

describe("useApiPatch", () => {
  beforeEach(() => {
    mockApiPatch.mockReset();
    mockReplace.mockReset();
    mockClearAuthSession.mockReset();
    mockClearAuthSession.mockResolvedValue(undefined);
  });

  it("should start with loading=false and data=null", () => {
    const { result } = renderHook(() =>
      useApiPatch<{ name: string }, TestItem>("/api/v1/items/1"),
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("should patch data successfully and return data", async () => {
    const updated: TestItem = { id: 1, name: "Updated" };
    mockApiPatch.mockResolvedValue(successResponse(updated));

    const { result } = renderHook(() =>
      useApiPatch<{ name: string }, TestItem>("/api/v1/items/1"),
    );

    let returned: TestItem | null = null;
    await act(async () => {
      returned = await result.current.mutate({ name: "Updated" });
    });

    expect(returned).toEqual(updated);
    expect(result.current.data).toEqual(updated);
    expect(result.current.loading).toBe(false);
  });

  it("should handle ApiError and set error message", async () => {
    mockApiPatch.mockRejectedValue(new ApiError("Not Found", 404));

    const { result } = renderHook(() =>
      useApiPatch<{ name: string }, TestItem>("/api/v1/items/999"),
    );

    await act(async () => {
      await result.current.mutate({ name: "bad" });
    });

    expect(result.current.error).toBe("Not Found");
    expect(result.current.data).toBeNull();
  });

  it("should redirect to /login on 401 ApiError", async () => {
    mockApiPatch.mockRejectedValue(new ApiError("Unauthorized", 401));

    const { result } = renderHook(() =>
      useApiPatch<{ name: string }, TestItem>("/api/v1/items/1"),
    );

    await act(async () => {
      await result.current.mutate({ name: "test" });
    });

    expect(mockClearAuthSession).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith("/login?reauth=1");
  });

  it("should reset data, error, and loading", async () => {
    mockApiPatch.mockRejectedValue(new ApiError("Error", 500));

    const { result } = renderHook(() =>
      useApiPatch<{ name: string }, TestItem>("/api/v1/items/1"),
    );

    await act(async () => {
      await result.current.mutate({ name: "bad" });
    });

    expect(result.current.error).toBe("Error");

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("should pass URL and body to apiPatch", async () => {
    mockApiPatch.mockResolvedValue(successResponse({ id: 1, name: "test" }));

    const { result } = renderHook(() =>
      useApiPatch<{ name: string }, TestItem>("/api/v1/items/1"),
    );

    await act(async () => {
      await result.current.mutate({ name: "test" });
    });

    expect(mockApiPatch).toHaveBeenCalledWith(
      "/api/v1/items/1",
      { name: "test" },
      expect.any(Function),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("should abort on unmount", async () => {
    mockApiPatch.mockReturnValue(new Promise(() => {}));

    const { result, unmount } = renderHook(() =>
      useApiPatch<{ name: string }, TestItem>("/api/v1/items/1"),
    );

    act(() => {
      void result.current.mutate({ name: "test" });
    });

    unmount();

    // The AbortController should have been aborted
    const lastCall =
      mockApiPatch.mock.calls[mockApiPatch.mock.calls.length - 1];
    const signal = lastCall[3].signal as AbortSignal;
    expect(signal.aborted).toBe(true);
  });

  it("should show generic French message for non-ApiError", async () => {
    mockApiPatch.mockRejectedValue(new TypeError("fetch failed"));

    const { result } = renderHook(() =>
      useApiPatch<{ name: string }, TestItem>("/api/v1/items/1"),
    );

    await act(async () => {
      await result.current.mutate({ name: "bad" });
    });

    expect(result.current.error).toBe("Une erreur inattendue est survenue");
  });
});
