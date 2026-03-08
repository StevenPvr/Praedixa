import { describe, expect, it } from "vitest";
import { generateMetadata } from "../page";

describe("blog index route metadata", () => {
  it("builds metadata for french blog index", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "fr" }),
      searchParams: Promise.resolve({}),
    });

    expect(metadata.alternates?.canonical).toBe(
      "https://www.praedixa.com/fr/blog",
    );
    expect(metadata.robots).toEqual({ index: true, follow: true });
  });

  it("includes query params in canonical when filters are present", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({ tag: "ops", page: "2" }),
    });

    expect(metadata.alternates?.canonical).toBe(
      "https://www.praedixa.com/en/blog?tag=ops&page=2",
    );
    expect(metadata.alternates?.languages).toBeUndefined();
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});
