import { describe, expect, it } from "vitest";
import { generateMetadata, generateStaticParams } from "../page";

describe("blog post route", () => {
  it("generates static params for published posts", () => {
    const params = generateStaticParams();

    expect(params).toEqual([]);
  });

  it("returns empty metadata when the blog post does not exist", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({
        locale: "fr",
        slug: "sous-sureeffectif-multi-sites-guide-j3-j7-j14",
      }),
    });

    expect(metadata).toEqual({});
  });
});
