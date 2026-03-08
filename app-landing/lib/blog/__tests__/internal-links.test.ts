import { describe, expect, it } from "vitest";
import { createRehypeInternalLinksPlugin, getInternalLinkRules } from "../internal-links";
import type { InternalLinkRule } from "../types";
import { legacyRedirectMap } from "../../i18n/config";

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

function collectAnchors(node: HastNode, out: HastNode[] = []): HastNode[] {
  if (node.type === "element" && node.tagName === "a") {
    out.push(node);
  }

  for (const child of node.children ?? []) {
    collectAnchors(child, out);
  }

  return out;
}

describe("rehype internal links", () => {
  it("injects at most one link per URL by default", () => {
    const rules: InternalLinkRule[] = [
      {
        id: "en-services",
        patterns: ["Praedixa services"],
        url: "/en/services",
      },
    ];

    const tree: HastNode = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "p",
          children: [
            {
              type: "text",
              value: "Praedixa services improve alignment. Praedixa services reduce ambiguity.",
            },
          ],
        },
      ],
    };

    const transformer = createRehypeInternalLinksPlugin({ rules })();
    transformer(tree);

    const anchors = collectAnchors(tree);
    expect(anchors).toHaveLength(1);
    expect(anchors[0]?.properties?.href).toBe("/en/services");
  });

  it("does not inject links in headings, code blocks, or existing anchors", () => {
    const rules: InternalLinkRule[] = [
      {
        id: "pilot",
        patterns: ["founding pilot"],
        url: "/en/pilot-application",
      },
    ];

    const tree: HastNode = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "h2",
          children: [{ type: "text", value: "founding pilot" }],
        },
        {
          type: "element",
          tagName: "pre",
          children: [
            {
              type: "element",
              tagName: "code",
              children: [{ type: "text", value: "founding pilot" }],
            },
          ],
        },
        {
          type: "element",
          tagName: "p",
          children: [
            {
              type: "element",
              tagName: "a",
              properties: { href: "/en/pilot-application" },
              children: [{ type: "text", value: "founding pilot" }],
            },
          ],
        },
      ],
    };

    const transformer = createRehypeInternalLinksPlugin({ rules })();
    transformer(tree);

    const anchors = collectAnchors(tree);
    expect(anchors).toHaveLength(1);
    expect(anchors[0]?.properties?.href).toBe("/en/pilot-application");
  });

  it("never targets retired or redirecting internal URLs", () => {
    const rules = getInternalLinkRules();

    for (const rule of rules) {
      expect(legacyRedirectMap[rule.url]).toBeUndefined();
    }
  });
});
