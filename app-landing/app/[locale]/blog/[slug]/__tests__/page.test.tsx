import { describe, expect, it } from "vitest";
import { generateMetadata, generateStaticParams } from "../page";

describe("blog post route", () => {
  it("generates static params for published posts", () => {
    const params = generateStaticParams();

    expect(params).toEqual(
      expect.arrayContaining([
        { locale: "fr", slug: "sous-sureeffectif-multi-sites-methode-j3-j7-j14" },
      ]),
    );
  });

  it("builds metadata for a blog post", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({
        locale: "fr",
        slug: "sous-sureeffectif-multi-sites-methode-j3-j7-j14",
      }),
    });

    expect(metadata.alternates?.canonical).toBe(
      "https://www.praedixa.com/fr/blog/sous-sureeffectif-multi-sites-methode-j3-j7-j14",
    );
    expect(
      (metadata.openGraph as Record<string, unknown> | undefined)?.type,
    ).toBe("article");
  });
});
