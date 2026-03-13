import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";

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
    code?: string;
    details?: Record<string, unknown>;
    requestId?: string;
    constructor(
      msg: string,
      status: number,
      code?: string,
      details?: Record<string, unknown>,
      requestId?: string,
    ) {
      super(msg);
      this.name = "ApiError";
      this.status = status;
      this.code = code;
      this.details = details;
      this.requestId = requestId;
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

describe("useApiGet core", () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockReplace.mockReset();
    mockClearAuthSession.mockReset();
    mockClearAuthSession.mockResolvedValue(undefined);
  });

  it("starts with loading=true and data=null", () => {
    mockApiGet.mockReturnValue(new Promise(() => {}));
    const { result, unmount } = renderHook(() =>
      useApiGet<TestItem>("/api/v1/items"),
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    unmount();
  });

  it("fetches data successfully and updates state", async () => {
    const item: TestItem = { id: 1, name: "Widget" };
    mockApiGet.mockResolvedValue(successResponse(item));

    const { result } = renderHook(() => useApiGet<TestItem>("/api/v1/items"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(item);
    expect(result.current.error).toBeNull();
  });

  it("passes URL and getAccessToken to apiGet", async () => {
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

  it("sets loading=false and skips fetch when url is null", async () => {
    const { result } = renderHook(() => useApiGet<TestItem>(null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it("handles ApiError and sets error message", async () => {
    mockApiGet.mockRejectedValue(new ApiError("Ressource introuvable", 404));

    const { result } = renderHook(() =>
      useApiGet<TestItem>("/api/v1/items/999", { autoRetry: false }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Ressource introuvable");
    expect(result.current.data).toBeNull();
  });

  it("shows generic French message for non-ApiError errors", async () => {
    mockApiGet.mockRejectedValue(new TypeError("fetch failed"));

    const { result } = renderHook(() =>
      useApiGet<TestItem>("/api/v1/items", { autoRetry: false }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Une erreur inattendue est survenue");
  });

  it("redirects to login on 401 ApiError", async () => {
    mockApiGet.mockRejectedValue(new ApiError("Unauthorized", 401));

    renderHook(() =>
      useApiGet<TestItem>("/api/v1/items", { autoRetry: false }),
    );

    await waitFor(() => {
      expect(mockClearAuthSession).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith(
        "/login?reauth=1&reason=api_unauthorized",
      );
    });
  });

  it("includes error code and request id in reauth redirect when available", async () => {
    mockApiGet.mockRejectedValue(
      new ApiError(
        "Unauthorized",
        401,
        "UNAUTHORIZED",
        undefined,
        "req-1234-abcd",
      ),
    );

    renderHook(() =>
      useApiGet<TestItem>("/api/v1/items", { autoRetry: false }),
    );

    await waitFor(() => {
      expect(mockClearAuthSession).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith(
        "/login?reauth=1&reason=api_unauthorized&error_code=UNAUTHORIZED&request_id=req-1234-abcd",
      );
    });
  });

  it("does not set error state on 401 redirect", async () => {
    mockApiGet.mockRejectedValue(new ApiError("Unauthorized", 401));

    const { result } = renderHook(() =>
      useApiGet<TestItem>("/api/v1/items", { autoRetry: false }),
    );

    await waitFor(() => {
      expect(mockClearAuthSession).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith(
        "/login?reauth=1&reason=api_unauthorized",
      );
    });

    expect(result.current.error).toBeNull();
  });
});
