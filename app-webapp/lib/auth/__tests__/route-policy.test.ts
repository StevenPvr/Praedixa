import { describe, expect, it } from "vitest";

import {
  listDocumentedWebappPagePaths,
  resolveWebappRoutePolicy,
} from "../route-policy";

describe("webapp route policy", () => {
  it("documents the explicit page surface used by the webapp shell", () => {
    expect(listDocumentedWebappPagePaths()).toEqual([
      "/",
      "/actions",
      "/dashboard",
      "/login",
      "/messages",
      "/parametres",
      "/previsions",
    ]);
  });

  it("classifies auth and api prefixes as dedicated runtime surfaces", () => {
    expect(resolveWebappRoutePolicy("/auth/callback").kind).toBe("auth");
    expect(resolveWebappRoutePolicy("/auth/unknown").kind).toBe("auth");
    expect(resolveWebappRoutePolicy("/api/v1/health").kind).toBe("api");
    expect(resolveWebappRoutePolicy("/api/custom").kind).toBe("api");
  });

  it("fails closed for unknown app paths", () => {
    expect(resolveWebappRoutePolicy("/coverage-harness").kind).toBe("unknown");
    expect(resolveWebappRoutePolicy("/previsions/details").kind).toBe(
      "unknown",
    );
  });
});
