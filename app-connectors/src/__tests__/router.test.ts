import { describe, expect, it } from "vitest";

import { compileRoutes, matchRoute, RouteMatchError } from "../router.js";
import { routes } from "../routes.js";

describe("router hardening", () => {
  it("rejects malformed URL-encoded route params instead of crashing", () => {
    const compiledRoutes = compileRoutes(routes);

    expect(() =>
      matchRoute(
        compiledRoutes,
        "GET",
        "/v1/organizations/%E0%A4%A/connections",
      ),
    ).toThrow(RouteMatchError);
  });
});
