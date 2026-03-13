import type { PublicApiResponseTypeName } from "./types.js";
import type { PublicJsonSchema } from "./schema-helpers.js";
import { PUBLIC_API_BUSINESS_RESPONSE_SCHEMAS } from "./response-schemas-business.js";
import { PUBLIC_API_ENGAGEMENT_RESPONSE_SCHEMAS } from "./response-schemas-engagement.js";
import { PUBLIC_API_LIVE_RESPONSE_SCHEMAS } from "./response-schemas-live.js";

export const PUBLIC_API_RESPONSE_SCHEMAS = {
  ...PUBLIC_API_LIVE_RESPONSE_SCHEMAS,
  ...PUBLIC_API_BUSINESS_RESPONSE_SCHEMAS,
  ...PUBLIC_API_ENGAGEMENT_RESPONSE_SCHEMAS,
} as const satisfies Record<PublicApiResponseTypeName, PublicJsonSchema>;

export const PUBLIC_API_RESPONSE_SCHEMA_NAMES = Object.freeze(
  Object.keys(PUBLIC_API_RESPONSE_SCHEMAS).sort(),
);
