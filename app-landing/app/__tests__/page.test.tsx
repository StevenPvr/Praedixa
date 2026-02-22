import { describe, it, expect, vi, beforeEach } from "vitest";

const redirectMock = vi.fn(() => {
  throw new Error("NEXT_REDIRECT");
});
const headersMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (target: string) => redirectMock(target),
}));

vi.mock("next/headers", () => ({
  headers: () => headersMock(),
}));

import RootPage, { metadata } from "../page";

describe("root page redirect", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    headersMock.mockReset();
  });

  it("redirects to /fr for French country", async () => {
    headersMock.mockReturnValue(new Headers({ "cf-ipcountry": "FR" }));

    await expect(RootPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/fr");
  });

  it("redirects to /en for non-French country", async () => {
    headersMock.mockReturnValue(new Headers({ "cf-ipcountry": "US" }));

    await expect(RootPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/en");
  });

  it("falls back to accept-language when country is unavailable", async () => {
    headersMock.mockReturnValue(
      new Headers({ "accept-language": "fr-FR,fr;q=0.9,en;q=0.8" }),
    );

    await expect(RootPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/fr");
  });

  it("exposes alternates with x-default", () => {
    expect(metadata.alternates?.canonical).toBe("/");
    expect(metadata.alternates?.languages?.["fr-FR"]).toBe("/fr");
    expect(metadata.alternates?.languages?.en).toBe("/en");
    expect(metadata.alternates?.languages?.["x-default"]).toBe("/en");
  });
});
