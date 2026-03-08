import { describe, expect, it } from "vitest";

import { isUuidString } from "../services/persistence.js";

describe("isUuidString", () => {
  it("accepts the fixed demo organization UUID used by medallion seeds", () => {
    expect(isUuidString("10000000-0000-0000-0000-000000000001")).toBe(true);
  });

  it("rejects malformed identifiers", () => {
    expect(isUuidString("org-1")).toBe(false);
    expect(isUuidString("not-a-uuid")).toBe(false);
  });
});
