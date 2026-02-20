import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  permanentRedirect: vi.fn(),
}));

import { permanentRedirect } from "next/navigation";
import CGUPage, { metadata } from "../page";

describe("CGUPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports expected metadata", () => {
    expect(metadata.title).toBe(
      "Conditions Générales d'Utilisation - Praedixa",
    );
    expect(metadata.description).toBe(
      "Conditions générales d'utilisation du site Praedixa.",
    );
    expect(metadata.alternates?.canonical).toBe("/fr/cgu");
  });

  it("redirects to the localized terms page", () => {
    CGUPage();
    expect(permanentRedirect).toHaveBeenCalledWith("/fr/cgu");
  });
});
