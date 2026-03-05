import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ApiError,
  apiGet,
  apiGetPaginated,
  apiPost,
  apiPatch,
  apiDelete,
} from "../client";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Deterministic X-Request-ID
vi.spyOn(crypto, "randomUUID").mockReturnValue(
  "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" as `${string}-${string}-${string}-${string}-${string}`,
);

const BASE_URL = "http://localhost:8000";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function textResponse(text: string, status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.reject(new Error("not JSON")),
  } as unknown as Response;
}

const TOKEN = "test-jwt-token";
const withToken = () => Promise.resolve(TOKEN);
const noToken = () => Promise.resolve(null);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ApiError", () => {
  it("should set message, status, code, details, and requestId", () => {
    const details = { field: "email" };
    const err = new ApiError(
      "Something went wrong",
      422,
      "VAL_001",
      details,
      "req-1234",
    );

    expect(err.message).toBe("Something went wrong");
    expect(err.status).toBe(422);
    expect(err.code).toBe("VAL_001");
    expect(err.details).toEqual({ field: "email" });
    expect(err.requestId).toBe("req-1234");
  });

  it('should have name "ApiError"', () => {
    const err = new ApiError("fail", 500);
    expect(err.name).toBe("ApiError");
  });

  it("should be an instance of Error", () => {
    const err = new ApiError("fail", 500);
    expect(err).toBeInstanceOf(Error);
  });

  it("should allow code, details, and requestId to be undefined", () => {
    const err = new ApiError("not found", 404);
    expect(err.code).toBeUndefined();
    expect(err.details).toBeUndefined();
    expect(err.requestId).toBeUndefined();
  });
});

describe("apiGet", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should call fetch with GET method and correct URL", async () => {
    const body = { success: true, data: { id: 1 }, timestamp: "t" };
    mockFetch.mockResolvedValueOnce(jsonResponse(body));

    await apiGet("/api/v1/items", withToken);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/api/v1/items`);
    expect(opts.method).toBe("GET");
  });

  it("should include Authorization header when token is present", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: true, data: null, timestamp: "t" }),
    );

    await apiGet("/test", withToken);

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["Authorization"]).toBe(`Bearer ${TOKEN}`);
  });

  it("should NOT include Authorization header when token is null", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: true, data: null, timestamp: "t" }),
    );

    await apiGet("/test", noToken);

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("should set X-Request-ID header", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: true, data: null, timestamp: "t" }),
    );

    await apiGet("/test", noToken);

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["X-Request-ID"]).toBe(
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    );
  });

  it("should set Content-Type to application/json", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: true, data: null, timestamp: "t" }),
    );

    await apiGet("/test", noToken);

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("should parse JSON response and return typed ApiResponse", async () => {
    const body = {
      success: true,
      data: { name: "foo" },
      timestamp: "2024-01-01",
    };
    mockFetch.mockResolvedValueOnce(jsonResponse(body));

    const result = await apiGet<{ name: string }>("/test", noToken);

    expect(result).toEqual(body);
    expect(result.data.name).toBe("foo");
  });

  it("should throw ApiError on non-ok response with structured error body", async () => {
    const errorBody = {
      success: false,
      error: {
        message: "Not found",
        code: "RES_001",
        details: { resource: "item" },
      },
      requestId: "req-404-1",
    };
    mockFetch.mockResolvedValueOnce(jsonResponse(errorBody, 404));

    await expect(apiGet("/test", noToken)).rejects.toThrow(ApiError);

    try {
      await apiGet("/test", noToken);
    } catch {
      // Reset mock for second call
    }

    // Proper assertion: capture the error
    mockFetch.mockResolvedValueOnce(jsonResponse(errorBody, 404));
    try {
      await apiGet("/missing", noToken);
      expect.unreachable("should have thrown");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.message).toBe("Not found");
      expect(apiErr.status).toBe(404);
      expect(apiErr.code).toBe("RES_001");
      expect(apiErr.details).toEqual({ resource: "item" });
      expect(apiErr.requestId).toBe("req-404-1");
    }
  });

  it("should throw ApiError with generic message when error body is not JSON", async () => {
    mockFetch.mockResolvedValueOnce(textResponse("Internal Server Error", 500));

    try {
      await apiGet("/broken", noToken);
      expect.unreachable("should have thrown");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.message).toBe("Request failed with status 500");
      expect(apiErr.status).toBe(500);
      expect(apiErr.code).toBeUndefined();
    }
  });

  it("should pass custom headers from options", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: true, data: null, timestamp: "t" }),
    );

    await apiGet("/test", noToken, { headers: { "X-Custom": "value" } });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["X-Custom"]).toBe("value");
  });

  it("should allow custom headers to override default headers", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: true, data: null, timestamp: "t" }),
    );

    await apiGet("/test", noToken, {
      headers: { "Content-Type": "text/plain" },
    });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["Content-Type"]).toBe("text/plain");
  });

  it("should pass AbortSignal", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: true, data: null, timestamp: "t" }),
    );

    const controller = new AbortController();
    await apiGet("/test", noToken, { signal: controller.signal });

    const opts = mockFetch.mock.calls[0][1];
    expect(opts.signal).toBe(controller.signal);
  });

  it("should not include body in GET request", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: true, data: null, timestamp: "t" }),
    );

    await apiGet("/test", noToken);

    const opts = mockFetch.mock.calls[0][1];
    expect(opts.body).toBeUndefined();
  });
});

describe("apiGetPaginated", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should call fetch with GET method and return PaginatedResponse", async () => {
    const body = {
      success: true,
      data: [{ id: 1 }, { id: 2 }],
      pagination: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
      timestamp: "t",
    };
    mockFetch.mockResolvedValueOnce(jsonResponse(body));

    const result = await apiGetPaginated<{ id: number }>("/items", withToken);

    expect(result.data).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
    expect(mockFetch.mock.calls[0][1].method).toBe("GET");
  });

  it("should include Authorization header with token", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: true, data: [], pagination: {}, timestamp: "t" }),
    );

    await apiGetPaginated("/items", withToken);

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["Authorization"]).toBe(`Bearer ${TOKEN}`);
  });
});

describe("apiPost", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should call fetch with POST method", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: true, data: { id: 1 }, timestamp: "t" }),
    );

    await apiPost("/items", { name: "test" }, withToken);

    expect(mockFetch.mock.calls[0][1].method).toBe("POST");
  });

  it("should send body as JSON string", async () => {
    const payload = { name: "test", value: 42 };
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: true, data: payload, timestamp: "t" }),
    );

    await apiPost("/items", payload, withToken);

    const opts = mockFetch.mock.calls[0][1];
    expect(opts.body).toBe(JSON.stringify(payload));
  });

  it("should include auth header and return ApiResponse", async () => {
    const body = { success: true, data: { created: true }, timestamp: "t" };
    mockFetch.mockResolvedValueOnce(jsonResponse(body));

    const result = await apiPost<{ created: boolean }>("/items", {}, withToken);

    expect(result.data.created).toBe(true);
    expect(mockFetch.mock.calls[0][1].headers["Authorization"]).toBe(
      `Bearer ${TOKEN}`,
    );
  });
});

describe("apiPatch", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should call fetch with PATCH method", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: true, data: {}, timestamp: "t" }),
    );

    await apiPatch("/items/1", { name: "updated" }, withToken);

    expect(mockFetch.mock.calls[0][1].method).toBe("PATCH");
  });

  it("should send body as JSON string", async () => {
    const payload = { status: "approved" };
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: true, data: {}, timestamp: "t" }),
    );

    await apiPatch("/items/1", payload, withToken);

    expect(mockFetch.mock.calls[0][1].body).toBe(JSON.stringify(payload));
  });
});

describe("apiDelete", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should call fetch with DELETE method", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(undefined, 204));

    await apiDelete("/items/1", withToken);

    expect(mockFetch.mock.calls[0][1].method).toBe("DELETE");
  });

  it("should return undefined for 204 No Content", async () => {
    const resp = {
      ok: true,
      status: 204,
      json: () => Promise.resolve(undefined),
    } as unknown as Response;
    mockFetch.mockResolvedValueOnce(resp);

    const result = await apiDelete("/items/1", withToken);

    expect(result).toBeUndefined();
  });

  it("should not include body in DELETE request", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(undefined, 204));

    await apiDelete("/items/1", withToken);

    expect(mockFetch.mock.calls[0][1].body).toBeUndefined();
  });

  it("should throw ApiError on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        { success: false, error: { message: "Forbidden", code: "AUTH_002" } },
        403,
      ),
    );

    try {
      await apiDelete("/items/1", withToken);
      expect.unreachable("should have thrown");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(403);
      expect(apiErr.message).toBe("Forbidden");
    }
  });
});
