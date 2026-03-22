import { describe, expect, it } from "vitest";
import { generateMetadata, generateStaticParams } from "../page";

describe("blog post route", () => {
  it("generates static params for published posts", () => {
    const params = generateStaticParams();

    expect(params).toContainEqual({
      locale: "fr",
      slug: "comite-ops-finance-prouver-roi-decision",
    });
    expect(params).toContainEqual({
      locale: "fr",
      slug: "decision-log-ops-daf-template",
    });
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

  it("returns metadata for the published decision log article", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({
        locale: "fr",
        slug: "decision-log-ops-daf-template",
      }),
    });

    expect(metadata.title).toBe(
      "Decision Log Ops/DAF : template simple pour décider sans biais inutile",
    );
    expect(metadata.keywords).toEqual([
      "ops-finance",
      "decision-intelligence",
      "roi",
    ]);
    expect(metadata.authors).toEqual([{ name: "Praedixa" }]);
  });

  it("returns metadata for the ROI review article", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({
        locale: "fr",
        slug: "comite-ops-finance-prouver-roi-decision",
      }),
    });

    expect(metadata.title).toBe(
      "Comité Ops/Finance : comment prouver le ROI d'une décision, pas seulement raconter un avant/après",
    );
    expect(metadata.keywords).toEqual([
      "roi",
      "ops-finance",
      "decision-intelligence",
    ]);
  });
});
