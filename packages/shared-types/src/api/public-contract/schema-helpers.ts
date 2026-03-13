export type PublicJsonSchema = Record<string, unknown>;

export function objectSchema(
  properties: Record<string, PublicJsonSchema>,
  required: readonly string[] = [],
): PublicJsonSchema {
  return {
    type: "object",
    properties,
    additionalProperties: false,
    ...(required.length > 0 ? { required: [...required] } : {}),
  };
}

export function arrayOf(items: PublicJsonSchema): PublicJsonSchema {
  return {
    type: "array",
    items,
  };
}

export function stringSchema(
  options: {
    enum?: readonly string[];
    format?: string;
    const?: string;
  } = {},
): PublicJsonSchema {
  return {
    type: "string",
    ...options,
  };
}

export function numberSchema(
  options: {
    minimum?: number;
  } = {},
): PublicJsonSchema {
  return {
    type: "number",
    ...options,
  };
}

export function integerSchema(
  options: {
    minimum?: number;
  } = {},
): PublicJsonSchema {
  return {
    type: "integer",
    ...options,
  };
}

export function booleanSchema(
  options: {
    const?: boolean;
  } = {},
): PublicJsonSchema {
  return {
    type: "boolean",
    ...options,
  };
}

export function nullable(schema: PublicJsonSchema): PublicJsonSchema {
  return {
    anyOf: [schema, { type: "null" }],
  };
}

export function mapOf(valueSchema: PublicJsonSchema = {}): PublicJsonSchema {
  return {
    type: "object",
    additionalProperties: valueSchema,
  };
}
