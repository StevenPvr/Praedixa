import { describe, expect, it } from "vitest";

import {
  isSameOriginBrowserRequest,
  resolveExpectedOrigin,
} from "../browser-request";

function makeRequest(headers: Record<string, string | undefined> = {}) {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );

  return {
    headers: {
      get: (name: string) => normalizedHeaders[name.toLowerCase()] ?? null,
    },
    nextUrl: {
      origin: "https://admin.praedixa.com",
    },
  } as Parameters<typeof isSameOriginBrowserRequest>[0];
}

describe("admin browser request origin guards", () => {
  it("rejects headerless requests when no same-origin signal is present", () => {
    expect(
      isSameOriginBrowserRequest(makeRequest(), "https://admin.praedixa.com"),
    ).toBe(false);
  });

  it("allows same-origin origin headers", () => {
    expect(
      isSameOriginBrowserRequest(
        makeRequest({ origin: "https://admin.praedixa.com" }),
        "https://admin.praedixa.com",
      ),
    ).toBe(true);
  });

  it("allows explicit browser navigations only when navigation fallback is enabled", () => {
    expect(
      isSameOriginBrowserRequest(
        makeRequest({ "sec-fetch-site": "none" }),
        "https://admin.praedixa.com",
        { allowNavigate: true },
      ),
    ).toBe(true);
    expect(
      isSameOriginBrowserRequest(
        makeRequest({ "sec-fetch-site": "none" }),
        "https://admin.praedixa.com",
      ),
    ).toBe(false);
  });

  it("fails closed when the configured public origin cannot be resolved", () => {
    expect(
      isSameOriginBrowserRequest(
        makeRequest({ origin: "https://admin.praedixa.com" }),
        resolveExpectedOrigin(makeRequest(), () => {
          throw new Error("Missing AUTH_APP_ORIGIN");
        }),
      ),
    ).toBe(false);
  });
});
