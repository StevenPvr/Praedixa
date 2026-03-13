import { describe, expect, expectTypeOf, it } from "vitest";

import type { DashboardSummary } from "../domain/dashboard.js";
import type { UserUxPreferencesPatch } from "../domain/user-preferences.js";
import type {
  OperationalDecisionCreateRequest,
  ScenarioGenerationRequest,
} from "../api/requests.js";
import {
  PUBLIC_API_COMPATIBILITY_POLICY,
  PUBLIC_API_OPERATIONS,
  type PublicApiTypeRegistry,
} from "../api/public-contract.js";
import {
  getPublicOpenApiCompatibilityPolicy,
  hasPublicOpenApiSchema,
  listLoosePublicResponseSchemas,
  listLooseMutatingRequestOperations,
  listPublicOpenApiOperations,
} from "../api/public-contract/openapi-node.js";

describe("shared public contract manifest", () => {
  it("matches the published OpenAPI operation catalog", () => {
    const expected = PUBLIC_API_OPERATIONS.map((operation) => ({
      method: operation.method,
      path: operation.path,
      operationId: operation.operationId,
    }));

    expect(
      listPublicOpenApiOperations().map((operation) => ({
        method: operation.method,
        path: operation.path,
        operationId: operation.operationId,
      })),
    ).toEqual(expected);
  });

  it("keeps operation ids and route keys unique", () => {
    const operationIds = PUBLIC_API_OPERATIONS.map(
      (operation) => operation.operationId,
    );
    const routeKeys = PUBLIC_API_OPERATIONS.map(
      (operation) => `${operation.method} ${operation.path}`,
    );

    expect(new Set(operationIds).size).toBe(operationIds.length);
    expect(new Set(routeKeys).size).toBe(routeKeys.length);
  });

  it("documents the same compatibility policy as the published OpenAPI contract", () => {
    expect(getPublicOpenApiCompatibilityPolicy()).toEqual(
      PUBLIC_API_COMPATIBILITY_POLICY,
    );
  });

  it("binds every named mutating request payload to an explicit component schema", () => {
    const operationsById = new Map(
      listPublicOpenApiOperations().map((operation) => [
        operation.operationId,
        operation,
      ]),
    );

    for (const operation of PUBLIC_API_OPERATIONS) {
      if (!operation.requestTypeName) {
        continue;
      }

      const published = operationsById.get(operation.operationId);
      expect(published).toMatchObject({
        requestSchemaRef: `#/components/schemas/${operation.requestTypeName}`,
        requestBodyRequired: Boolean(operation.requestBodyRequired),
      });
      expect(hasPublicOpenApiSchema(operation.requestTypeName)).toBe(true);
    }

    expect(listLooseMutatingRequestOperations()).toEqual([]);
  });

  it("binds every named response payload to an explicit strict component schema", () => {
    const operationsById = new Map(
      listPublicOpenApiOperations().map((operation) => [
        operation.operationId,
        operation,
      ]),
    );

    for (const operation of PUBLIC_API_OPERATIONS) {
      const published = operationsById.get(operation.operationId);
      expect(published).toMatchObject({
        responseSchemaRef: `#/components/schemas/${operation.responseTypeName}`,
      });
      expect(hasPublicOpenApiSchema(operation.responseTypeName)).toBe(true);
    }

    expect(listLoosePublicResponseSchemas()).toEqual([]);
  });

  it("keeps stable shared payload names explicit for representative operations", () => {
    expect(
      PUBLIC_API_OPERATIONS.find(
        (operation) => operation.operationId === "getLiveDashboardSummary",
      ),
    ).toMatchObject({
      responseTypeName: "DashboardSummary",
      responseEnvelope: "SuccessObject",
    });

    expect(
      PUBLIC_API_OPERATIONS.find(
        (operation) => operation.operationId === "generateScenarioForAlert",
      ),
    ).toMatchObject({
      requestTypeName: "ScenarioGenerationRequest",
      responseTypeName: "ParetoFrontierResponse",
    });

    expect(
      PUBLIC_API_OPERATIONS.find(
        (operation) => operation.operationId === "createOperationalDecision",
      ),
    ).toMatchObject({
      requestTypeName: "OperationalDecisionCreateRequest",
      requestBodyRequired: true,
      responseTypeName: "OperationalDecision",
    });

    expect(
      PUBLIC_API_OPERATIONS.find(
        (operation) => operation.operationId === "updateUserPreferences",
      ),
    ).toMatchObject({
      requestTypeName: "UserUxPreferencesPatch",
      responseTypeName: "UserUxPreferences",
    });

    expect(
      PUBLIC_API_OPERATIONS.find(
        (operation) => operation.operationId === "getLiveDecisionWorkspace",
      ),
    ).toMatchObject({
      responseTypeName: "DecisionWorkspace",
    });
  });

  it("binds manifest type names to real shared types", () => {
    expectTypeOf<
      PublicApiTypeRegistry["DashboardSummary"]
    >().toEqualTypeOf<DashboardSummary>();
    expectTypeOf<
      PublicApiTypeRegistry["OperationalDecisionCreateRequest"]
    >().toEqualTypeOf<OperationalDecisionCreateRequest>();
    expectTypeOf<
      PublicApiTypeRegistry["ScenarioGenerationRequest"]
    >().toEqualTypeOf<ScenarioGenerationRequest>();
    expectTypeOf<
      PublicApiTypeRegistry["UserUxPreferencesPatch"]
    >().toEqualTypeOf<UserUxPreferencesPatch>();
  });
});
