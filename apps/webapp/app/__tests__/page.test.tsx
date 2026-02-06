import { describe, expect, it, vi } from "vitest";

const { mockRedirect } = vi.hoisted(() => ({
  mockRedirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

import RootPage from "../page";

describe("Root page", () => {
  it("redirects to /dashboard", () => {
    RootPage();
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
  });
});
