import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockExecFileSync } = vi.hoisted(() => ({
  mockExecFileSync: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execFileSync: mockExecFileSync,
}));

import {
  clearOutboundUrlDnsCacheForTests,
  validateOutboundUrl,
} from "../outbound-url.js";

describe("validateOutboundUrl", () => {
  beforeEach(() => {
    mockExecFileSync.mockReset();
    clearOutboundUrlDnsCacheForTests();
  });

  it("accepts an allowlisted hostname that resolves only to public IPs", () => {
    mockExecFileSync.mockReturnValueOnce(JSON.stringify(["8.8.8.8"]));

    expect(
      validateOutboundUrl("https://api.partner.example.com/v1", {
        allowedHosts: ["partner.example.com"],
        label: "baseUrl",
        nodeEnv: "production",
      }),
    ).toBe("https://api.partner.example.com/v1");
  });

  it("rejects an allowlisted hostname that resolves to a private IP", () => {
    mockExecFileSync.mockReturnValueOnce(JSON.stringify(["10.0.0.12"]));

    expect(() =>
      validateOutboundUrl("https://api.partner.example.com/v1", {
        allowedHosts: ["partner.example.com"],
        label: "baseUrl",
        nodeEnv: "production",
      }),
    ).toThrow("baseUrl host resolved to a non-public IP address");
  });

  it("rejects a mixed DNS answer when any resolved address is private", () => {
    mockExecFileSync.mockReturnValueOnce(
      JSON.stringify(["8.8.8.8", "192.168.10.20"]),
    );

    expect(() =>
      validateOutboundUrl("https://api.partner.example.com/v1", {
        allowedHosts: ["partner.example.com"],
        label: "baseUrl",
        nodeEnv: "production",
      }),
    ).toThrow("baseUrl host resolved to a non-public IP address");
  });

  it("caches DNS resolutions per hostname inside the TTL window", () => {
    mockExecFileSync.mockReturnValue(JSON.stringify(["8.8.4.4"]));

    expect(
      validateOutboundUrl("https://api.partner.example.com/v1", {
        allowedHosts: ["partner.example.com"],
        label: "baseUrl",
        nodeEnv: "production",
      }),
    ).toBe("https://api.partner.example.com/v1");
    expect(
      validateOutboundUrl("https://api.partner.example.com/v2", {
        allowedHosts: ["partner.example.com"],
        label: "probeUrl",
        nodeEnv: "production",
      }),
    ).toBe("https://api.partner.example.com/v2");

    expect(mockExecFileSync).toHaveBeenCalledTimes(1);
  });
});
