import { describe, expect, it } from "vitest";
import {
  assertSafeOutboundUrl,
  collectAllowedHostnames,
} from "../outbound-url";

describe("outbound URL guards", () => {
  it("collects allowlisted hostnames from raw hosts and full URLs", () => {
    const hosts = collectAllowedHostnames(
      "https://api.praedixa.com, ingest.praedixa.com:443",
    );

    expect(hosts).toEqual(new Set(["api.praedixa.com", "ingest.praedixa.com"]));
  });

  it("normalizes hostnames and ignores empty allowlist entries", () => {
    const hosts = collectAllowedHostnames(
      " API.Praedixa.com., , https://Ingest.Praedixa.com/path ",
    );

    expect(hosts).toEqual(new Set(["api.praedixa.com", "ingest.praedixa.com"]));
  });

  it("rejects loopback and private addresses", () => {
    expect(() =>
      assertSafeOutboundUrl(new URL("https://127.0.0.1/api/contact")),
    ).toThrow("Outbound URL host is not allowed");

    expect(() =>
      assertSafeOutboundUrl(new URL("https://192.168.1.20/api/contact")),
    ).toThrow("Outbound URL host is not allowed");
  });

  it("enforces the optional hostname allowlist", () => {
    expect(() =>
      assertSafeOutboundUrl(new URL("https://api.example.com"), {
        allowedHosts: new Set(["ingest.example.com"]),
      }),
    ).toThrow("Outbound URL host is not in the allowlist");
  });
});
