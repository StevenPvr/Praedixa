import {
  SECTORS,
  EMPLOYEE_RANGES,
  SITE_COUNTS,
  ROLES,
  TIMELINES,
} from "../../content/deployment-form-options";

export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
export const MAX_REQUESTS_PER_WINDOW = 5;
export const MAX_RATE_LIMIT_ENTRIES = 10_000;

export const MAX_COMPANY_NAME_LENGTH = 200;
export const MAX_EMAIL_LENGTH = 254;
export const MAX_PHONE_LENGTH = 30;
export const MAX_NAME_LENGTH = 100;
export const MAX_ROLE_LENGTH = 80;
export const MAX_STACK_LENGTH = 300;
export const MAX_PAIN_POINT_LENGTH = 1_200;
export const MAX_REQUEST_BODY_LENGTH = 2_000;

export const PHONE_REGEX = /^[0-9+\-() ]+$/;

export const ALLOWED_EMPLOYEE_RANGES = new Set([
  ...EMPLOYEE_RANGES,
  "500-1000",
  "1000+",
]);
export const ALLOWED_SECTORS = new Set([
  ...SECTORS,
  "Hospitality / Food service",
  "Logistics / Transport / Retail",
  "Construction",
  "Other",
]);
export const ALLOWED_ROLES = new Set(ROLES);
export const ALLOWED_SITE_COUNTS = new Set(SITE_COUNTS);
export const ALLOWED_TIMELINES = new Set(TIMELINES);
