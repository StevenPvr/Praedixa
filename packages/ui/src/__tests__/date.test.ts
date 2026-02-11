/**
 * Tests for shared date utilities (@praedixa/ui).
 */

import { describe, it, expect } from "vitest";
import { formatRelativeTime } from "../utils/date";

describe("formatRelativeTime", () => {
  it("returns empty string for null", () => {
    expect(formatRelativeTime(null)).toBe("");
  });

  it("returns 'A l'instant' for recent times", () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe("A l'instant");
  });

  it("returns minutes for <1h", () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    expect(formatRelativeTime(tenMinAgo)).toBe("Il y a 10min");
  });

  it("returns hours for <24h", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    expect(formatRelativeTime(twoHoursAgo)).toBe("Il y a 2h");
  });

  it("returns days for >=24h", () => {
    const threeDaysAgo = new Date(
      Date.now() - 3 * 24 * 3600 * 1000,
    ).toISOString();
    expect(formatRelativeTime(threeDaysAgo)).toBe("Il y a 3j");
  });

  it("returns '1' minute for times just over 1 minute ago", () => {
    const oneMinAgo = new Date(Date.now() - 61 * 1000).toISOString();
    expect(formatRelativeTime(oneMinAgo)).toBe("Il y a 1min");
  });
});
