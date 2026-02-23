import { describe, it, expect, vi, beforeEach } from "vitest";

const redirectMock = vi.fn(() => {
  throw new Error("NEXT_REDIRECT");
});

vi.mock("next/navigation", () => ({
  permanentRedirect: (target: string) => redirectMock(target),
}));

import RootPage from "../page";

describe("root page redirect", () => {
  beforeEach(() => {
    redirectMock.mockClear();
  });

  it("always redirects root to /fr", () => {
    expect(() => RootPage()).toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/fr");
  });
});
