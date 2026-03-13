import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

import { parse } from "yaml";

import type {
  PublicApiCompatibilityPolicy,
  PublicApiMethod,
} from "./common.js";

function resolvePublicOpenApiPath(): string {
  const candidatePaths = [
    path.resolve(process.cwd(), "contracts/openapi/public.yaml"),
    path.resolve(process.cwd(), "../contracts/openapi/public.yaml"),
  ];

  try {
    candidatePaths.push(
      fileURLToPath(
        new URL(
          "../../../../../contracts/openapi/public.yaml",
          import.meta.url,
        ),
      ),
    );
  } catch {
    // Vitest / vite-node can expose non-file module URLs; cwd fallbacks cover that case.
  }

  for (const candidatePath of candidatePaths) {
    if (existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  throw new Error(
    `Unable to resolve contracts/openapi/public.yaml from ${process.cwd()}`,
  );
}

const PUBLIC_OPENAPI_PATH = resolvePublicOpenApiPath();
let cachedPublicOpenApiSource: string | null = null;
let cachedPublicOpenApiDocument: PublicOpenApiDocument | null = null;

const OPENAPI_METHODS = ["get", "post", "patch", "put", "delete"] as const;

type OpenApiMethod = (typeof OPENAPI_METHODS)[number];

interface OpenApiRequestBody {
  required?: boolean;
  content?: {
    "application/json"?: {
      schema?: {
        $ref?: string;
      };
    };
  };
}

interface OpenApiMediaType {
  schema?: Record<string, unknown>;
}

interface OpenApiOperation {
  operationId?: string;
  requestBody?: OpenApiRequestBody;
  responses?: Record<
    string,
    {
      content?: {
        "application/json"?: OpenApiMediaType;
      };
    }
  >;
}

interface PublicOpenApiDocument {
  paths?: Record<string, Partial<Record<OpenApiMethod, OpenApiOperation>>>;
  components?: {
    schemas?: Record<string, unknown>;
  };
  "x-praedixa-compatibility"?: Partial<PublicApiCompatibilityPolicy>;
}

export interface PublishedPublicOpenApiOperation {
  method: PublicApiMethod;
  path: string;
  normalizedPath: string;
  operationId: string;
  hasRequestBody: boolean;
  requestBodyRequired: boolean;
  requestSchemaRef: string | null;
  responseSchemaRef: string | null;
}

const METHOD_NAME_BY_OPENAPI: Record<OpenApiMethod, PublicApiMethod> = {
  get: "GET",
  post: "POST",
  patch: "PATCH",
  put: "PUT",
  delete: "DELETE",
};

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertString(value: unknown, message: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(message);
  }
  return value;
}

function assertLiteralTrue(value: unknown, message: string): true {
  if (value !== true) {
    throw new Error(message);
  }
  return true;
}

function assertNumber(value: unknown, message: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(message);
  }
  return value;
}

function readRequestSchemaRef(
  requestBody: OpenApiRequestBody | undefined,
): string | null {
  const ref = requestBody?.content?.["application/json"]?.schema?.$ref;
  return typeof ref === "string" && ref.length > 0 ? ref : null;
}

function readResponseSchemaRef(
  operation: OpenApiOperation | undefined,
): string | null {
  const jsonSchema =
    operation?.responses?.["200"]?.content?.["application/json"]?.schema ??
    operation?.responses?.["201"]?.content?.["application/json"]?.schema;
  if (!isObjectRecord(jsonSchema)) {
    return null;
  }

  const properties = isObjectRecord(jsonSchema.properties)
    ? jsonSchema.properties
    : null;
  const dataSchema = properties?.data;
  if (!isObjectRecord(dataSchema)) {
    return null;
  }

  const directRef = dataSchema.$ref;
  if (typeof directRef === "string" && directRef.length > 0) {
    return directRef;
  }

  const itemRef = dataSchema.items;
  if (isObjectRecord(itemRef) && typeof itemRef.$ref === "string") {
    return itemRef.$ref;
  }

  return null;
}

export function loadPublicOpenApiSource(): string {
  if (cachedPublicOpenApiSource === null) {
    cachedPublicOpenApiSource = readFileSync(PUBLIC_OPENAPI_PATH, "utf8");
  }

  return cachedPublicOpenApiSource;
}

export function loadPublicOpenApiDocument(): PublicOpenApiDocument {
  if (cachedPublicOpenApiDocument === null) {
    const parsed = parse(loadPublicOpenApiSource());
    if (!isObjectRecord(parsed)) {
      throw new Error("Public OpenAPI contract must parse to an object");
    }

    cachedPublicOpenApiDocument = parsed as PublicOpenApiDocument;
  }

  return cachedPublicOpenApiDocument;
}

export function normalizePublicOpenApiPath(pathname: string): string {
  return pathname.replace(/\{([^}]+)\}/g, ":$1");
}

export function listPublicOpenApiOperations(
  document: PublicOpenApiDocument = loadPublicOpenApiDocument(),
): PublishedPublicOpenApiOperation[] {
  const operations: PublishedPublicOpenApiOperation[] = [];

  for (const [path, candidates] of Object.entries(document.paths ?? {})) {
    if (!isObjectRecord(candidates)) {
      continue;
    }

    for (const method of OPENAPI_METHODS) {
      const operation = candidates[method];
      if (!isObjectRecord(operation)) {
        continue;
      }

      const openApiOperation = operation as OpenApiOperation;

      operations.push({
        method: METHOD_NAME_BY_OPENAPI[method],
        path,
        normalizedPath: normalizePublicOpenApiPath(path),
        operationId: assertString(
          openApiOperation.operationId,
          `Missing operationId for ${method.toUpperCase()} ${path}`,
        ),
        hasRequestBody: openApiOperation.requestBody != null,
        requestBodyRequired: Boolean(openApiOperation.requestBody?.required),
        requestSchemaRef: readRequestSchemaRef(openApiOperation.requestBody),
        responseSchemaRef: readResponseSchemaRef(openApiOperation),
      });
    }
  }

  return operations;
}

export function getPublicOpenApiCompatibilityPolicy(
  document: PublicOpenApiDocument = loadPublicOpenApiDocument(),
): PublicApiCompatibilityPolicy {
  const policy = document["x-praedixa-compatibility"];
  if (!isObjectRecord(policy)) {
    throw new Error("Missing x-praedixa-compatibility section");
  }

  return {
    additiveChangesWithinMajorOnly: assertLiteralTrue(
      policy.additiveChangesWithinMajorOnly,
      "Compatibility policy must keep additiveChangesWithinMajorOnly=true",
    ),
    breakingChangesRequireNewMajor: assertLiteralTrue(
      policy.breakingChangesRequireNewMajor,
      "Compatibility policy must keep breakingChangesRequireNewMajor=true",
    ),
    minDeprecationNoticeDays: assertNumber(
      policy.minDeprecationNoticeDays,
      "Missing minDeprecationNoticeDays in compatibility policy",
    ),
    deprecationHeader: assertString(
      policy.deprecationHeader,
      "Missing deprecationHeader in compatibility policy",
    ) as PublicApiCompatibilityPolicy["deprecationHeader"],
    sunsetHeader: assertString(
      policy.sunsetHeader,
      "Missing sunsetHeader in compatibility policy",
    ) as PublicApiCompatibilityPolicy["sunsetHeader"],
    replacementRequiredBeforeRemoval: assertLiteralTrue(
      policy.replacementRequiredBeforeRemoval,
      "Compatibility policy must keep replacementRequiredBeforeRemoval=true",
    ),
  };
}

export function listLooseMutatingRequestOperations(
  document: PublicOpenApiDocument = loadPublicOpenApiDocument(),
): PublishedPublicOpenApiOperation[] {
  return listPublicOpenApiOperations(document).filter(
    (operation) =>
      operation.hasRequestBody && operation.requestSchemaRef === null,
  );
}

export function hasPublicOpenApiSchema(
  schemaName: string,
  document: PublicOpenApiDocument = loadPublicOpenApiDocument(),
): boolean {
  return Object.prototype.hasOwnProperty.call(
    document.components?.schemas ?? {},
    schemaName,
  );
}

export function getPublicOpenApiSchema(
  schemaName: string,
  document: PublicOpenApiDocument = loadPublicOpenApiDocument(),
): Record<string, unknown> {
  const schema = document.components?.schemas?.[schemaName];

  if (!isObjectRecord(schema)) {
    throw new Error(`Missing or invalid public OpenAPI schema: ${schemaName}`);
  }

  return schema;
}

export function listLooseResponseSchemas(
  schemaNames: readonly string[],
  document: PublicOpenApiDocument = loadPublicOpenApiDocument(),
): string[] {
  return [...new Set(schemaNames)].filter((schemaName) => {
    const schema = getPublicOpenApiSchema(schemaName, document);
    return schema.additionalProperties === true;
  });
}

function readSchemaComponent(
  schemaName: string,
  document: PublicOpenApiDocument,
): Record<string, unknown> | null {
  const schema = document.components?.schemas?.[schemaName];
  return isObjectRecord(schema) ? schema : null;
}

export function listLoosePublicResponseSchemas(
  document: PublicOpenApiDocument = loadPublicOpenApiDocument(),
): string[] {
  const responseSchemaNames = new Set(
    listPublicOpenApiOperations(document)
      .map((operation) => operation.responseSchemaRef)
      .filter((ref): ref is string => ref != null)
      .map((ref) => ref.replace("#/components/schemas/", "")),
  );

  return [...responseSchemaNames]
    .filter((schemaName) => {
      const schema = readSchemaComponent(schemaName, document);
      return schema?.type === "object" && schema.additionalProperties === true;
    })
    .sort();
}
