import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockJson = vi.fn();
const mockGetOidcEnv = vi.fn();
const mockGetTrustedOidcEndpoints = vi.fn();
const mockIsMissingOidcEnvError = vi.fn();

vi.mock("next/server", () => ({
  NextResponse: {
    json: (...args: unknown[]) => mockJson(...args),
  },
}));

vi.mock("@/lib/auth/oidc", () => ({
  getOidcEnv: (...args: unknown[]) => mockGetOidcEnv(...args),
  getTrustedOidcEndpoints: (...args: unknown[]) =>
    mockGetTrustedOidcEndpoints(...args),
  isMissingOidcEnvError: (...args: unknown[]) =>
    mockIsMissingOidcEnvError(...args),
}));

import { GET } from "../route";

const emitWarningSpy = vi
  .spyOn(process, "emitWarning")
  .mockImplementation(() => undefined);

function createJsonResponse(
  body: Record<string, unknown>,
  init?: ResponseInit,
) {
  return {
    status: init?.status ?? 200,
    body,
    headers: {
      set: vi.fn(),
    },
  };
}

describe("GET /auth/provider-status (admin)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJson.mockImplementation(
      (body: Record<string, unknown>, init?: ResponseInit) =>
        createJsonResponse(body, init),
    );
    mockGetOidcEnv.mockReturnValue({
      issuerUrl: "http://localhost:8081/realms/praedixa",
    });
    mockGetTrustedOidcEndpoints.mockResolvedValue({
      authorizationEndpoint:
        "http://localhost:8081/realms/praedixa/protocol/openid-connect/auth",
      tokenEndpoint:
        "http://localhost:8081/realms/praedixa/protocol/openid-connect/token",
      revocationEndpoint: null,
    });
    mockIsMissingOidcEnvError.mockReturnValue(false);
  });

  afterEach(() => {
    emitWarningSpy.mockClear();
  });

  it("returns healthy when issuer discovery succeeds", async () => {
    const response = (await GET()) as {
      status: number;
      body: { healthy: boolean };
      headers: { set: ReturnType<typeof vi.fn> };
    };

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ healthy: true });
    expect(response.headers.set).toHaveBeenCalledWith(
      "Cache-Control",
      "no-store",
    );
    expect(response.headers.set).toHaveBeenCalledWith("Pragma", "no-cache");
  });

  it("returns oidc_config_missing when OIDC env is not available", async () => {
    mockGetOidcEnv.mockImplementationOnce(() => {
      throw new Error("Missing OIDC env vars");
    });
    mockIsMissingOidcEnvError.mockReturnValueOnce(true);

    const response = (await GET()) as {
      status: number;
      body: { healthy: boolean; code: string };
    };

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      healthy: false,
      code: "oidc_config_missing",
    });
    expect(emitWarningSpy).not.toHaveBeenCalled();
  });

  it("returns oidc_provider_untrusted and logs the provider failure", async () => {
    mockGetTrustedOidcEndpoints.mockRejectedValueOnce(
      new Error(
        "OIDC discovery request failed (404 Not Found: Realm does not exist)",
      ),
    );
    mockIsMissingOidcEnvError.mockReturnValueOnce(false);

    const response = (await GET()) as {
      status: number;
      body: { healthy: boolean; code: string };
    };

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      healthy: false,
      code: "oidc_provider_untrusted",
    });
    expect(emitWarningSpy).toHaveBeenCalledWith(
      expect.stringContaining("Realm does not exist"),
    );
  });
});
