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
import { useApiGetPaginated, useApiPatch, useApiPost } from "../use-api";

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

const defaultPagination = {
  total: 25,
  page: 1,
  pageSize: 10,
  totalPages: 3,
  hasNextPage: true,
  hasPreviousPage: false,
};

afterEach(() => {
  cleanup();
});

describe("useApiGetPaginated", () => {
  beforeEach(() => {
    mockApiGetPaginated.mockReset();
    mockReplace.mockReset();
    mockClearAuthSession.mockReset();
    mockClearAuthSession.mockResolvedValue(undefined);
  });

  it("starts with loading=true and empty data", () => {
    mockApiGetPaginated.mockReturnValue(new Promise(() => {}));

    const { result, unmount } = renderHook(() =>
      useApiGetPaginated<TestItem>("/api/v1/items", 1, 10),
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.pagination).toBeNull();
    expect(result.current.error).toBeNull();
    unmount();
  });

  it("stays idle when paginated URL is null", async () => {
    const { result } = renderHook(() =>
      useApiGetPaginated<TestItem>(null, 1, 10),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.pagination).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockApiGetPaginated).not.toHaveBeenCalled();
  });

  it("fetches paginated data successfully", async () => {
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
  });

  it("builds URLs with the right separator", async () => {
    mockApiGetPaginated.mockResolvedValue(
      paginatedResponse([], { ...defaultPagination, total: 0, totalPages: 0 }),
    );

    const first = renderHook(() =>
      useApiGetPaginated<TestItem>("/api/v1/items", 2, 20),
    );
    await waitFor(() => expect(mockApiGetPaginated).toHaveBeenCalled());
    expect(mockApiGetPaginated.mock.calls[0][0]).toBe(
      "/api/v1/items?page=2&page_size=20",
    );
    first.unmount();

    mockApiGetPaginated.mockReset();
    mockApiGetPaginated.mockResolvedValue(
      paginatedResponse([], { ...defaultPagination, total: 0, totalPages: 0 }),
    );
    const second = renderHook(() =>
      useApiGetPaginated<TestItem>("/api/v1/items?siteId=abc", 1, 10),
    );
    await waitFor(() => expect(mockApiGetPaginated).toHaveBeenCalled());
    expect(mockApiGetPaginated.mock.calls[0][0]).toBe(
      "/api/v1/items?siteId=abc&page=1&page_size=10",
    );
    second.unmount();
  });

  it("handles errors and redirects on 401", async () => {
    mockApiGetPaginated.mockRejectedValue(new ApiError("Acces refuse", 403));

    const { result } = renderHook(() =>
      useApiGetPaginated<TestItem>("/api/v1/items", 1, 10, {
        autoRetry: false,
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Acces refuse");

    mockApiGetPaginated.mockReset();
    mockApiGetPaginated.mockRejectedValue(new ApiError("Unauthorized", 401));
    renderHook(() =>
      useApiGetPaginated<TestItem>("/api/v1/items", 1, 10, {
        autoRetry: false,
      }),
    );

    await waitFor(() => {
      expect(mockClearAuthSession).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith(
        "/login?reauth=1&reason=api_unauthorized",
      );
    });
  });

  it("refetches and handles race conditions", async () => {
    const items1: TestItem[] = [{ id: 1, name: "First" }];
    const items2: TestItem[] = [{ id: 2, name: "Second" }];
    mockApiGetPaginated.mockResolvedValue(
      paginatedResponse(items1, defaultPagination),
    );

    const { result, rerender } = renderHook(
      ({ page }: { page: number }) =>
        useApiGetPaginated<TestItem>("/api/v1/items", page, 10),
      { initialProps: { page: 1 } },
    );

    await waitFor(() => expect(result.current.data).toEqual(items1));

    mockApiGetPaginated.mockResolvedValue(
      paginatedResponse(items2, { ...defaultPagination, total: 30, page: 2 }),
    );

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(items2);
      expect(result.current.total).toBe(30);
    });

    rerender({ page: 2 });
    await waitFor(() => {
      expect(result.current.pagination?.page).toBe(2);
    });
  });
});

describe("useApiPost and useApiPatch", () => {
  beforeEach(() => {
    mockApiPost.mockReset();
    mockApiPatch.mockReset();
    mockReplace.mockReset();
    mockClearAuthSession.mockReset();
    mockClearAuthSession.mockResolvedValue(undefined);
  });

  it("posts successfully, resets, and redirects on 401", async () => {
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

    act(() => {
      result.current.reset();
    });
    expect(result.current.data).toBeNull();

    mockApiPost.mockRejectedValue(new ApiError("Unauthorized", 401));
    await act(async () => {
      await result.current.mutate({ name: "test" });
    });

    expect(mockClearAuthSession).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith(
      "/login?reauth=1&reason=api_unauthorized",
    );
  });

  it("patches successfully, resets, and redirects on 401", async () => {
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

    act(() => {
      result.current.reset();
    });
    expect(result.current.data).toBeNull();

    mockApiPatch.mockRejectedValue(new ApiError("Unauthorized", 401));
    await act(async () => {
      await result.current.mutate({ name: "test" });
    });

    expect(mockClearAuthSession).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith(
      "/login?reauth=1&reason=api_unauthorized",
    );
  });

  it("passes URL, body, token getter, and abort signal to mutations", async () => {
    mockApiPost.mockResolvedValue(successResponse({ id: 1, name: "test" }));
    mockApiPatch.mockResolvedValue(successResponse({ id: 1, name: "test" }));

    const post = renderHook(() =>
      useApiPost<{ name: string }, TestItem>("/api/v1/items"),
    );
    await act(async () => {
      await post.result.current.mutate({ name: "test" });
    });
    expect(mockApiPost).toHaveBeenCalledWith(
      "/api/v1/items",
      { name: "test" },
      expect.any(Function),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );

    const patch = renderHook(() =>
      useApiPatch<{ name: string }, TestItem>("/api/v1/items/1"),
    );
    await act(async () => {
      await patch.result.current.mutate({ name: "test" });
    });
    expect(mockApiPatch).toHaveBeenCalledWith(
      "/api/v1/items/1",
      { name: "test" },
      expect.any(Function),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});
