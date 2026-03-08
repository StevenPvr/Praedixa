import { beforeEach, describe, expect, it, vi } from "vitest";

describe("navigation security helpers", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("allows relative admin paths", async () => {
    const { sanitizeHttpHref } = await import("../navigation");

    expect(sanitizeHttpHref("/clients/acme/messages")).toBe(
      "/clients/acme/messages",
    );
  });

  it("allows https URLs", async () => {
    const { sanitizeHttpHref } = await import("../navigation");

    expect(
      sanitizeHttpHref("https://storage.praedixa.com/proof-packs/report.pdf"),
    ).toBe("https://storage.praedixa.com/proof-packs/report.pdf");
  });

  it("rejects javascript URLs", async () => {
    const { sanitizeHttpHref } = await import("../navigation");

    expect(sanitizeHttpHref("javascript:alert(1)")).toBeNull();
  });

  it("rejects protocol-relative URLs", async () => {
    const { sanitizeHttpHref } = await import("../navigation");

    expect(sanitizeHttpHref("//evil.example")).toBeNull();
  });

  it("encodes mailto targets", async () => {
    const { buildMailtoHref } = await import("../navigation");

    expect(buildMailtoHref("admin+ops@praedixa.com")).toBe(
      "mailto:admin%2Bops%40praedixa.com",
    );
  });
});
