import { beforeEach, describe, expect, it, vi } from "vitest";

const mockResolveAuthAppOrigin = vi.fn();
const mockResolveRequestSession = vi.fn();

vi.mock("@/lib/auth/oidc", () => ({
  clearAuthCookies: vi.fn(),
  resolveAuthAppOrigin: (...args: unknown[]) =>
    mockResolveAuthAppOrigin(...args),
  setAuthCookies: vi.fn(),
}));

vi.mock("@/lib/auth/request-session", () => ({
  resolveRequestSession: (...args: unknown[]) => mockResolveRequestSession(...args),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
      headers: {
        set: vi.fn(),
      },
      cookies: {
        delete: vi.fn(),
        set: vi.fn(),
      },
    }),
  },
}));

import { GET } from "../route";

function createRequest(options?: {
  origin?: string | null;
  referer?: string | null;
  fetchSite?: string | null;
  requestOrigin?: string;
}) {
  const headers = new Headers();
  if (options?.origin !== undefined && options.origin !== null) {
    headers.set("origin", options.origin);
  }
  if (options?.referer !== undefined && options.referer !== null) {
    headers.set("referer", options.referer);
  }
  if (options?.fetchSite !== undefined && options.fetchSite !== null) {
    headers.set("sec-fetch-site", options.fetchSite);
  }

  return {
    method: "GET",
    headers,
    nextUrl: {
      origin: options?.requestOrigin ?? "https://admin.praedixa.com",
      search: "",
    },
  } as Parameters<typeof GET>[0];
}

describe("GET /api/v1/[...path]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveAuthAppOrigin.mockReturnValue("https://admin.praedixa.com");
  });

  it("rejects cross-site authenticated proxy requests before touching the session", async () => {
    const response = (await GET(createRequest({
      origin: "https://evil.example",
      fetchSite: "cross-site",
    }), {
      params: Promise.resolve({ path: ["organizations"] }),
    })) as { body: { error: string }; status: number };

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "csrf_failed" });
    expect(mockResolveRequestSession).not.toHaveBeenCalled();
  });
});
