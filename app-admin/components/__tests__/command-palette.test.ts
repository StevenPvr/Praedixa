import { describe, expect, it } from "vitest";

import {
  buildWorkspaceCommandItems,
  resolveWorkspaceBasePath,
} from "../command-palette";

describe("command palette workspace links", () => {
  it("derives the current workspace base path from the pathname", () => {
    expect(resolveWorkspaceBasePath("/clients/org-acme/dashboard")).toBe(
      "/clients/org-acme",
    );
    expect(resolveWorkspaceBasePath("/clients/org-acme")).toBe(
      "/clients/org-acme",
    );
    expect(resolveWorkspaceBasePath("/journal")).toBeNull();
  });

  it("builds workspace commands with real org-scoped hrefs", () => {
    const items = buildWorkspaceCommandItems("/clients/org-acme/previsions");

    expect(items.map((item) => item.href)).toContain(
      "/clients/org-acme/dashboard",
    );
    expect(items.map((item) => item.href)).toContain(
      "/clients/org-acme/vue-client",
    );
    expect(items.map((item) => item.href)).toContain(
      "/clients/org-acme/config",
    );
    expect(items.map((item) => item.href)).toContain(
      "/clients/org-acme/contrats",
    );
    expect(items.map((item) => item.href)).toContain(
      "/clients/org-acme/messages",
    );
    expect(
      items.every((item) => item.href.startsWith("/clients/org-acme/")),
    ).toBe(true);
  });

  it("hides workspace commands outside a client workspace route", () => {
    expect(buildWorkspaceCommandItems("/clients")).toEqual([]);
    expect(buildWorkspaceCommandItems("/parametres")).toEqual([]);
  });
});
