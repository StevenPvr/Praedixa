import { describe, expect, it, vi } from "vitest";

const mockRedirect = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

import ClientRedirectPage from "../page";

describe("ClientRedirectPage", () => {
  it("redirects to dashboard route for plain params", async () => {
    await ClientRedirectPage({ params: { orgId: "org-1" } });
    expect(mockRedirect).toHaveBeenCalledWith("/clients/org-1/dashboard");
  });

  it("redirects with encoded orgId for promise params", async () => {
    await ClientRedirectPage({ params: Promise.resolve({ orgId: "org / 1" }) });
    expect(mockRedirect).toHaveBeenCalledWith(
      "/clients/org%20%2F%201/dashboard",
    );
  });
});
