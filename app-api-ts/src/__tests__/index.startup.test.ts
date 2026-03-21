import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("api bootstrap", () => {
  it("keeps the API server booting when Camunda eager initialization fails", async () => {
    const createAppServer = vi.fn();
    const initializeDecisionConfigService = vi
      .fn()
      .mockResolvedValue(undefined);
    const initializeDecisionContractRuntimeService = vi
      .fn()
      .mockResolvedValue(undefined);
    const initializeOnboardingCamundaRuntime = vi
      .fn()
      .mockRejectedValue(new Error("fetch failed"));
    const stderrWrite = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true as never);

    vi.doMock("../config.js", () => ({
      loadConfig: () => ({
        databaseUrl: "postgresql://example",
        camunda: {
          enabled: true,
          baseUrl: "http://127.0.0.1:8088/v2",
          authMode: "none",
          basicUsername: null,
          basicPassword: null,
          oauthTokenUrl: null,
          oauthClientId: null,
          oauthClientSecret: null,
          oauthAudience: null,
          oauthScope: null,
          processTenantId: null,
          deployOnStartup: true,
          requestTimeoutMs: 10000,
        },
      }),
    }));
    vi.doMock("../server.js", () => ({
      createAppServer,
    }));
    vi.doMock("../services/decision-config.js", () => ({
      initializeDecisionConfigService,
    }));
    vi.doMock("../services/decision-contract-runtime.js", () => ({
      initializeDecisionContractRuntimeService,
    }));
    vi.doMock("../services/admin-onboarding-camunda.js", () => ({
      initializeOnboardingCamundaRuntime,
    }));

    await expect(import("../index.js")).resolves.toBeDefined();

    expect(initializeDecisionConfigService).toHaveBeenCalledWith(
      "postgresql://example",
    );
    expect(initializeDecisionContractRuntimeService).toHaveBeenCalledWith(
      "postgresql://example",
    );
    expect(initializeOnboardingCamundaRuntime).toHaveBeenCalledTimes(1);
    expect(createAppServer).toHaveBeenCalledTimes(1);
    expect(stderrWrite).toHaveBeenCalledWith(
      expect.stringContaining(
        "Camunda onboarding runtime unavailable during startup",
      ),
    );
    expect(stderrWrite).toHaveBeenCalledWith(
      expect.stringContaining("baseUrl=http://127.0.0.1:8088/v2"),
    );
    expect(stderrWrite).toHaveBeenCalledWith(
      expect.stringContaining("cause=fetch failed"),
    );
    expect(stderrWrite).toHaveBeenCalledWith(
      expect.stringContaining("pnpm camunda:up"),
    );
  });
});
