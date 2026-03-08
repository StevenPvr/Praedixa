import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

describe("api-client base URL security", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { ok: true } }),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("allows https API base URLs in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.praedixa.com");

    const { apiGet } = await import("../api-client");

    await apiGet("/api/v1/health", async () => null);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.praedixa.com/api/v1/health",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-Request-ID": expect.any(String),
        }),
      }),
    );
  });

  it("rejects plaintext API base URLs in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.praedixa.com");

    const { apiGet } = await import("../api-client");

    await expect(apiGet("/api/v1/health", async () => null)).rejects.toThrow(
      /must use https in production/i,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows loopback http API URLs in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000");

    const { apiGet } = await import("../api-client");

    await apiGet("/api/v1/health", async () => null);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/health",
      expect.any(Object),
    );
  });
});
