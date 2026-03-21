import { assertPathInsideRoot, sanitizeWorkspaceKey } from "./utils.js";

describe("utils", () => {
  it("sanitizes workspace keys", () => {
    expect(sanitizeWorkspaceKey("ABC/123:demo")).toBe("ABC_123_demo");
  });

  it("rejects paths that escape the configured root", () => {
    expect(() => {
      assertPathInsideRoot("/tmp/root", "/tmp/other/file");
    }).toThrow(/escapes configured root/);
  });
});
