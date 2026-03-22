import {
  listLoosePublicResponseSchemas,
  listPublicOpenApiOperations,
} from "@praedixa/shared-types/public-contract-node";
import { describe, expect, it } from "vitest";

import { routes } from "../routes.js";

const INTERNAL_NON_PUBLIC_RUNTIME_PATHS = new Set([
  "/api/v1/webhooks/resend/email-delivery",
]);

function readRuntimePublicOperations(): string[] {
  return routes
    .filter(
      (route) =>
        !route.template.startsWith("/api/v1/admin") &&
        !INTERNAL_NON_PUBLIC_RUNTIME_PATHS.has(route.template),
    )
    .map((route) => `${route.method} ${route.template}`)
    .sort();
}

describe("public OpenAPI contract parity", () => {
  it("documents the full non-admin runtime surface", () => {
    expect(
      listPublicOpenApiOperations()
        .map((operation) => `${operation.method} ${operation.normalizedPath}`)
        .sort(),
    ).toEqual(readRuntimePublicOperations());
  });

  it("keeps admin routes out of the public contract", () => {
    expect(
      listPublicOpenApiOperations().some((entry) =>
        entry.path.includes("/api/v1/admin/"),
      ),
    ).toBe(false);
  });

  it("assigns a unique operationId to every published public operation", () => {
    const operationIds = listPublicOpenApiOperations().map(
      (operation) => operation.operationId,
    );

    expect(operationIds.every((operationId) => operationId.length > 0)).toBe(
      true,
    );
    expect(new Set(operationIds).size).toBe(operationIds.length);
  });

  it("keeps published public response components explicit and non-placeholder", () => {
    const operations = listPublicOpenApiOperations();

    expect(
      operations.every(
        (operation) =>
          operation.responseSchemaRef?.startsWith("#/components/schemas/") ===
          true,
      ),
    ).toBe(true);
    expect(listLoosePublicResponseSchemas()).toEqual([]);
  });
});
