import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const globalsCssPath = resolve(process.cwd(), "app/globals.css");
const globalsCss = readFileSync(globalsCssPath, "utf8");

describe("hero-pulsor header theme", () => {
  it("renders the logo mark and wordmark in white at the top of the hero", () => {
    expect(globalsCss).toMatch(
      /body:has\(\.hero-pulsor\) header\[data-scroll-surface="top"\] \.hdr-logo img\s*\{[\s\S]*filter:\s*brightness\(0\) invert\(1\);/m,
    );
    expect(globalsCss).toMatch(
      /body:has\(\.hero-pulsor\) header\[data-scroll-surface="top"\] \.hdr-logo-text\s*\{[\s\S]*color:\s*rgba\(255,\s*255,\s*255,\s*0\.92\);/m,
    );
  });

  it("renders desktop navigation links in white at the top of the hero", () => {
    expect(globalsCss).toMatch(
      /body:has\(\.hero-pulsor\) header\[data-scroll-surface="top"\] \.hdr-nav-link\s*\{[\s\S]*color:\s*rgba\(255,\s*255,\s*255,\s*0\.78\);/m,
    );
  });
});
