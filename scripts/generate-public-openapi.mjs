#!/usr/bin/env node

import { access, mkdir, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const sharedTypesPackageJson = path.join(
  repoRoot,
  "packages/shared-types/package.json",
);
const sharedTypesDistRoot = path.join(
  repoRoot,
  "packages/shared-types/dist/api/public-contract",
);
const publicOpenApiPath = path.join(repoRoot, "contracts/openapi/public.yaml");

const requireFromSharedTypes = createRequire(sharedTypesPackageJson);
const { stringify } = requireFromSharedTypes("yaml");

const operationsModuleUrl = new URL(
  "../packages/shared-types/dist/api/public-contract/operations.js",
  import.meta.url,
);
const commonModuleUrl = new URL(
  "../packages/shared-types/dist/api/public-contract/common.js",
  import.meta.url,
);
const responseSchemasModuleUrl = new URL(
  "../packages/shared-types/dist/api/public-contract/response-schemas.js",
  import.meta.url,
);

await assertBuiltSharedTypes();

const { PUBLIC_API_OPERATIONS } = await import(operationsModuleUrl);
const { PUBLIC_API_COMPATIBILITY_POLICY } = await import(commonModuleUrl);
const { PUBLIC_API_RESPONSE_SCHEMAS } = await import(responseSchemasModuleUrl);

const REQUEST_SCHEMAS = {
  ContactRequestSubmission: objectSchema(
    {
      locale: { type: "string", enum: ["fr", "en"] },
      requestType: {
        type: "string",
        enum: ["founding_pilot", "product_demo", "partnership", "press_other"],
      },
      companyName: { type: "string" },
      firstName: { type: "string" },
      lastName: { type: "string" },
      role: { type: "string" },
      email: { type: "string", format: "email" },
      phone: { type: "string" },
      subject: { type: "string" },
      message: { type: "string" },
      consent: { type: "boolean", const: true },
      website: { type: "string" },
    },
    ["companyName", "email", "message", "consent"],
  ),
  ScenarioGenerationRequest: objectSchema({
    notes: { type: "string" },
  }),
  RequestForecastRequest: objectSchema(
    {
      horizonDays: { type: "integer", minimum: 1 },
      granularity: { type: "string" },
      modelType: { type: "string" },
      departmentId: { type: "string" },
      includeConfidenceIntervals: { type: "boolean" },
      includeRiskIndicators: { type: "boolean" },
    },
    ["horizonDays"],
  ),
  WhatIfScenarioRequest: objectSchema(
    {
      name: { type: "string" },
      description: { type: "string" },
      absenceRateModifier: { type: "number" },
      typeModifiers: mapOf({ type: "number" }),
      additionalAbsences: {
        type: "array",
        items: objectSchema(
          {
            employeeId: { type: "string" },
            startDate: { type: "string", format: "date" },
            endDate: { type: "string", format: "date" },
            type: { type: "string" },
          },
          ["employeeId", "startDate", "endDate", "type"],
        ),
      },
    },
    ["name"],
  ),
  ReviewDecisionRequest: objectSchema(
    {
      action: { type: "string", enum: ["approve", "reject", "defer"] },
      notes: { type: "string" },
      implementationDeadline: { type: "string", format: "date" },
    },
    ["action"],
  ),
  RecordDecisionOutcomeRequest: objectSchema(
    {
      effective: { type: "boolean" },
      actualCost: { type: "number" },
      actualImpact: { type: "string" },
      lessonsLearned: { type: "string" },
    },
    ["effective", "actualImpact"],
  ),
  ValidateArbitrageRequest: objectSchema(
    {
      selectedOptionIndex: { type: "integer", minimum: 0 },
      notes: { type: "string" },
    },
    ["selectedOptionIndex"],
  ),
  ExportRequest: objectSchema(
    {
      format: { type: "string", enum: ["csv", "xlsx", "pdf", "json"] },
      dateRange: objectSchema({
        startDate: { type: "string", format: "date" },
        endDate: { type: "string", format: "date" },
      }),
      filters: { type: "object", additionalProperties: true },
      columns: { type: "array", items: { type: "string" } },
      includeHeaders: { type: "boolean" },
    },
    ["format"],
  ),
  OperationalDecisionCreateRequest: objectSchema({
    alertId: { type: "string" },
    optionId: { type: "string" },
    notes: { type: "string" },
  }),
  ProofPackGenerateRequest: objectSchema({
    siteId: { type: "string" },
    month: { type: "string", format: "date" },
  }),
  UserUxPreferencesPatch: objectSchema({
    language: { type: "string", enum: ["fr", "en"] },
    density: { type: "string", enum: ["comfortable", "compact"] },
    defaultLanding: { type: "string" },
    dismissedCoachmarks: {
      type: "array",
      items: { type: "string" },
    },
    nav: objectSchema({
      sidebarCollapsed: { type: "boolean" },
      sidebarWidth: { type: "number" },
      starredItems: { type: "array", items: { type: "string" } },
      recentItems: { type: "array", items: { type: "string" } },
    }),
    tables: mapOf(
      objectSchema({
        density: { type: "string", enum: ["comfortable", "compact"] },
        pageSize: { type: "integer", minimum: 1 },
        columns: { type: "array", items: { type: "string" } },
        sort: objectSchema({
          key: { type: "string" },
          direction: { type: "string", enum: ["asc", "desc"] },
        }),
      }),
    ),
    savedViews: {
      type: "array",
      items: objectSchema(
        {
          id: { type: "string" },
          name: { type: "string" },
          resource: { type: "string" },
          scope: { type: "string", enum: ["personal", "team"] },
          filters: { type: "object", additionalProperties: true },
          sort: objectSchema({
            key: { type: "string" },
            direction: { type: "string", enum: ["asc", "desc"] },
          }),
          columns: { type: "array", items: { type: "string" } },
          groupBy: { type: "array", items: { type: "string" } },
          isDefault: { type: "boolean" },
          updatedAt: { type: "string", format: "date-time" },
        },
        ["id", "name", "resource", "scope"],
      ),
    },
    theme: objectSchema({
      mode: { type: "string", enum: ["light", "dark", "system"] },
    }),
  }),
  ProductEventBatchRequest: objectSchema(
    {
      events: {
        type: "array",
        items: objectSchema(
          {
            name: {
              type: "string",
              enum: [
                "decision_queue_opened",
                "decision_option_selected",
                "decision_validated",
                "time_to_decision_ms",
                "onboarding_step_completed",
              ],
            },
            occurredAt: { type: "string", format: "date-time" },
            context: { type: "object", additionalProperties: true },
          },
          ["name"],
        ),
      },
    },
    ["events"],
  ),
  ConversationCreateRequest: objectSchema(
    {
      subject: { type: "string" },
    },
    ["subject"],
  ),
  MessageCreateRequest: objectSchema(
    {
      content: { type: "string" },
    },
    ["content"],
  ),
};

const RESPONSE_SCHEMA_NAMES = new Set(
  PUBLIC_API_OPERATIONS.map((operation) => operation.responseTypeName),
);

const pathParameters = buildPathParameterComponents(PUBLIC_API_OPERATIONS);
const schemas = buildSchemas();
const document = {
  openapi: "3.1.0",
  info: {
    title: "Praedixa Public API",
    version: "2.0.0",
    description:
      "Generated public OpenAPI contract for the non-admin TypeScript API surface.",
  },
  servers: [{ url: "http://localhost:8000" }],
  "x-praedixa-compatibility": PUBLIC_API_COMPATIBILITY_POLICY,
  paths: buildPaths(),
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    parameters: pathParameters,
    schemas,
  },
};

await mkdir(path.dirname(publicOpenApiPath), { recursive: true });
await writeFile(publicOpenApiPath, stringify(document), "utf8");

function objectSchema(properties, required = []) {
  const schema = {
    type: "object",
    properties,
    additionalProperties: false,
  };
  if (required.length > 0) {
    schema.required = required;
  }
  return schema;
}

function mapOf(valueSchema) {
  return {
    type: "object",
    additionalProperties: valueSchema,
  };
}

async function assertBuiltSharedTypes() {
  try {
    await access(sharedTypesDistRoot, fsConstants.R_OK);
  } catch {
    throw new Error(
      "packages/shared-types/dist is missing. Run `pnpm --dir packages/shared-types build` before generating public OpenAPI.",
    );
  }
}

function buildPathParameterComponents(operations) {
  const components = {};
  const descriptions = {
    alertId: "Identifier of the coverage alert or alert-backed decision.",
    convId: "Identifier of the conversation.",
    datasetId: "Identifier of the dataset.",
    decisionId: "Identifier of the decision.",
    forecastId: "Identifier of the forecast.",
    resource: "Export resource name.",
  };

  for (const operation of operations) {
    for (const parameterName of extractPathParameters(operation.path)) {
      if (components[parameterName]) {
        continue;
      }

      components[parameterName] = {
        name: parameterName,
        in: "path",
        required: true,
        description:
          descriptions[parameterName] ??
          `Path identifier for \`${parameterName}\`.`,
        schema: {
          type: "string",
        },
      };
    }
  }

  return components;
}

function buildSchemas() {
  const commonSchemas = {
    PaginationMeta: objectSchema(
      {
        total: { type: "integer", minimum: 0 },
        page: { type: "integer", minimum: 1 },
        pageSize: { type: "integer", minimum: 1 },
        totalPages: { type: "integer", minimum: 0 },
        hasNextPage: { type: "boolean" },
        hasPreviousPage: { type: "boolean" },
      },
      [
        "total",
        "page",
        "pageSize",
        "totalPages",
        "hasNextPage",
        "hasPreviousPage",
      ],
    ),
    Error: objectSchema(
      {
        success: { type: "boolean", const: false },
        error: objectSchema(
          {
            code: { type: "string" },
            message: { type: "string" },
            details: { type: "object", additionalProperties: true },
          },
          ["code", "message"],
        ),
        timestamp: { type: "string", format: "date-time" },
        requestId: { type: "string" },
      },
      ["success", "error", "timestamp"],
    ),
  };

  const unusedResponseSchemas = Object.keys(PUBLIC_API_RESPONSE_SCHEMAS).filter(
    (schemaName) => !RESPONSE_SCHEMA_NAMES.has(schemaName),
  );
  if (unusedResponseSchemas.length > 0) {
    throw new Error(
      `Unused explicit response schema mappings: ${unusedResponseSchemas.join(", ")}`,
    );
  }

  const responseSchemas = Object.fromEntries(
    [...RESPONSE_SCHEMA_NAMES]
      .sort()
      .map((schemaName) => [schemaName, schemaForResponseType(schemaName)]),
  );

  return {
    ...commonSchemas,
    ...responseSchemas,
    ...REQUEST_SCHEMAS,
  };
}

function schemaForResponseType(schemaName) {
  const schema = PUBLIC_API_RESPONSE_SCHEMAS[schemaName];
  if (!schema) {
    throw new Error(
      `Missing explicit response schema mapping for ${schemaName}.`,
    );
  }
  return schema;
}

function buildPaths() {
  const paths = {};

  for (const operation of PUBLIC_API_OPERATIONS) {
    const lowerMethod = operation.method.toLowerCase();
    const parameters = extractPathParameters(operation.path).map(
      (parameterName) => ({
        $ref: `#/components/parameters/${parameterName}`,
      }),
    );

    const operationDocument = {
      operationId: operation.operationId,
      responses: {
        [responseStatusFor(operation.method)]: {
          description: `${operation.operationId} response.`,
          content: {
            "application/json": {
              schema: buildResponseEnvelopeSchema(
                operation.responseEnvelope,
                operation.responseTypeName,
              ),
            },
          },
        },
      },
    };

    if (operation.auth === "bearer") {
      operationDocument.security = [{ bearerAuth: [] }];
    }

    if (parameters.length > 0) {
      operationDocument.parameters = parameters;
    }

    if (operation.requestTypeName) {
      if (!REQUEST_SCHEMAS[operation.requestTypeName]) {
        throw new Error(
          `Missing JSON schema mapping for request type ${operation.requestTypeName}`,
        );
      }

      operationDocument.requestBody = {
        required: Boolean(operation.requestBodyRequired),
        content: {
          "application/json": {
            schema: {
              $ref: `#/components/schemas/${operation.requestTypeName}`,
            },
          },
        },
      };
    }

    paths[operation.path] ??= {};
    paths[operation.path][lowerMethod] = operationDocument;
  }

  return paths;
}

function buildResponseEnvelopeSchema(envelope, responseTypeName) {
  const baseProperties = {
    success: { type: "boolean", const: true },
    timestamp: { type: "string", format: "date-time" },
    requestId: { type: "string" },
  };

  if (envelope === "SuccessObject") {
    return objectSchema(
      {
        ...baseProperties,
        data: { $ref: `#/components/schemas/${responseTypeName}` },
        message: { type: "string" },
      },
      ["success", "data", "timestamp"],
    );
  }

  if (envelope === "SuccessArray") {
    return objectSchema(
      {
        ...baseProperties,
        data: {
          type: "array",
          items: { $ref: `#/components/schemas/${responseTypeName}` },
        },
      },
      ["success", "data", "timestamp"],
    );
  }

  return objectSchema(
    {
      ...baseProperties,
      data: {
        type: "array",
        items: { $ref: `#/components/schemas/${responseTypeName}` },
      },
      pagination: { $ref: "#/components/schemas/PaginationMeta" },
    },
    ["success", "data", "pagination", "timestamp"],
  );
}

function responseStatusFor(method) {
  return method === "POST" ? "201" : "200";
}

function extractPathParameters(pathname) {
  return [...pathname.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
}
