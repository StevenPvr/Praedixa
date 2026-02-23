import { describe, it, expect } from "vitest";
import { serpResourceTargetsFr } from "../serp-resources-fr";
import { getSerpAssetDownloadBySlug } from "../serp-asset-downloads";

describe("serp asset downloads", () => {
  it("builds one downloadable asset per SERP slug", () => {
    for (const entry of serpResourceTargetsFr) {
      const asset = getSerpAssetDownloadBySlug(entry.slug);
      expect(asset).toBeDefined();
      expect(asset?.fileName).toContain(entry.slug);
      expect(asset?.body.length ?? 0).toBeGreaterThan(40);
    }
  });

  it("uses csv for calculator/comparatif assets", () => {
    const calculator = getSerpAssetDownloadBySlug("cout-sous-couverture");
    const comparatif = getSerpAssetDownloadBySlug("wfm-logistique");

    expect(calculator?.fileName.endsWith(".csv")).toBe(true);
    expect(calculator?.contentType).toContain("text/csv");

    expect(comparatif?.fileName.endsWith(".csv")).toBe(true);
    expect(comparatif?.contentType).toContain("text/csv");
  });

  it("uses markdown for template/playbook/guide assets", () => {
    const template = getSerpAssetDownloadBySlug("sous-couverture-definition");
    expect(template?.fileName.endsWith(".md")).toBe(true);
    expect(template?.contentType).toContain("text/markdown");
    expect(template?.body).toContain("## Tableau de suivi");
  });
});
