import { describe, it, expect } from "vitest";
import { detectRequestLocale } from "../request-locale";

describe("detectRequestLocale", () => {
  it("returns fr for French geo-country", () => {
    const locale = detectRequestLocale(new Headers({ "cf-ipcountry": "FR" }));
    expect(locale).toBe("fr");
  });

  it("returns en for non-French geo-country", () => {
    const locale = detectRequestLocale(new Headers({ "cf-ipcountry": "US" }));
    expect(locale).toBe("en");
  });

  it("falls back to preferred language when country is missing", () => {
    const locale = detectRequestLocale(
      new Headers({ "accept-language": "fr-CA,fr;q=0.9,en;q=0.8" }),
    );
    expect(locale).toBe("fr");
  });

  it("falls back to default locale when hints are missing", () => {
    const locale = detectRequestLocale(new Headers());
    expect(locale).toBe("fr");
  });
});
