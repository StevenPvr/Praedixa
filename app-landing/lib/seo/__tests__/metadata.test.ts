import { describe, it, expect } from "vitest";
import {
  alternatesFromPaths,
  buildLocaleMetadata,
  localePathMap,
} from "../metadata";

describe("seo metadata helpers", () => {
  it("sets x-default to the french canonical path", () => {
    const alternates = alternatesFromPaths(
      localePathMap("/fr/test", "/en/test"),
      "en",
    );
    expect(alternates.languages?.["x-default"]).toBe(
      "https://www.praedixa.com/fr/test",
    );
  });

  it("builds self-referencing canonical for the current locale", () => {
    const metadata = buildLocaleMetadata({
      locale: "en",
      paths: localePathMap("/fr/example", "/en/example"),
      title: "Example",
      description: "Example description",
    });

    expect(metadata.alternates?.canonical).toBe(
      "https://www.praedixa.com/en/example",
    );
  });
});
