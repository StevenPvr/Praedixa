import { describe, expect, it } from "vitest";

import { buildCsvDocument, neutralizeCsvCell, serializeCsvRow } from "../csv";

describe("admin csv security helpers", () => {
  it("prefixes spreadsheet formula markers with an apostrophe", () => {
    expect(neutralizeCsvCell("=1+1")).toBe("'=1+1");
    expect(neutralizeCsvCell("+SUM(A1:A2)")).toBe("'+SUM(A1:A2)");
    expect(neutralizeCsvCell("-42")).toBe("'-42");
    expect(neutralizeCsvCell("@cmd")).toBe("'@cmd");
  });

  it("prefixes leading control characters", () => {
    expect(neutralizeCsvCell("\tcmd")).toBe("'\tcmd");
    expect(neutralizeCsvCell("\ncmd")).toBe("'\ncmd");
  });

  it("leaves safe values unchanged and escapes quotes during serialization", () => {
    expect(neutralizeCsvCell("Alice")).toBe("Alice");
    expect(serializeCsvRow(['say "hello"', "Alice"])).toBe(
      '"say ""hello""","Alice"',
    );
  });

  it("builds a csv document with sanitized body cells", () => {
    expect(
      buildCsvDocument(["name", "email"], [["=cmd", "ops@praedixa.com"]]),
    ).toBe('"name","email"\n"\'=cmd","ops@praedixa.com"');
  });
});
