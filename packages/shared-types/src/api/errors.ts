// API Error codes and types

/** Standard error codes */
export enum ErrorCode {
  // Authentication & Authorization (1xxx)
  UNAUTHORIZED = "AUTH_001",
  FORBIDDEN = "AUTH_002",
  TOKEN_EXPIRED = "AUTH_003",
  TOKEN_INVALID = "AUTH_004",
  MFA_REQUIRED = "AUTH_005",
  MFA_INVALID = "AUTH_006",
  SESSION_EXPIRED = "AUTH_007",
  ACCOUNT_LOCKED = "AUTH_008",
  ACCOUNT_SUSPENDED = "AUTH_009",

  // Validation (2xxx)
  VALIDATION_ERROR = "VAL_001",
  INVALID_INPUT = "VAL_002",
  MISSING_REQUIRED_FIELD = "VAL_003",
  INVALID_FORMAT = "VAL_004",
  VALUE_OUT_OF_RANGE = "VAL_005",
  INVALID_DATE_RANGE = "VAL_006",
  DUPLICATE_ENTRY = "VAL_007",

  // Resource (3xxx)
  NOT_FOUND = "RES_001",
  ALREADY_EXISTS = "RES_002",
  CONFLICT = "RES_003",
  GONE = "RES_004",
  LOCKED = "RES_005",

  // Business Logic (4xxx)
  ABSENCE_OVERLAP = "BIZ_001",
  INSUFFICIENT_BALANCE = "BIZ_002",
  APPROVAL_REQUIRED = "BIZ_003",
  CANNOT_MODIFY_APPROVED = "BIZ_004",
  CANNOT_DELETE_ACTIVE = "BIZ_005",
  INVALID_STATUS_TRANSITION = "BIZ_006",
  MANAGER_REQUIRED = "BIZ_007",
  CIRCULAR_REFERENCE = "BIZ_008",
  QUOTA_EXCEEDED = "BIZ_009",
  FEATURE_DISABLED = "BIZ_010",

  // Tenant/Organization (5xxx)
  TENANT_NOT_FOUND = "TEN_001",
  TENANT_SUSPENDED = "TEN_002",
  TENANT_LIMIT_EXCEEDED = "TEN_003",
  CROSS_TENANT_ACCESS = "TEN_004",

  // External Services (6xxx)
  EXTERNAL_SERVICE_ERROR = "EXT_001",
  EXTERNAL_SERVICE_TIMEOUT = "EXT_002",
  EXTERNAL_SERVICE_UNAVAILABLE = "EXT_003",

  // ML/Forecasting (7xxx)
  FORECAST_FAILED = "ML_001",
  INSUFFICIENT_DATA = "ML_002",
  MODEL_NOT_READY = "ML_003",
  PREDICTION_ERROR = "ML_004",

  // System (9xxx)
  INTERNAL_ERROR = "SYS_001",
  SERVICE_UNAVAILABLE = "SYS_002",
  RATE_LIMITED = "SYS_003",
  MAINTENANCE_MODE = "SYS_004",
  DATABASE_ERROR = "SYS_005",
  CONFIGURATION_ERROR = "SYS_006",
}

/** HTTP status code mapping */
export const ErrorHttpStatus: Record<ErrorCode, number> = {
  // Auth
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.TOKEN_INVALID]: 401,
  [ErrorCode.MFA_REQUIRED]: 401,
  [ErrorCode.MFA_INVALID]: 401,
  [ErrorCode.SESSION_EXPIRED]: 401,
  [ErrorCode.ACCOUNT_LOCKED]: 403,
  [ErrorCode.ACCOUNT_SUSPENDED]: 403,

  // Validation
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCode.INVALID_FORMAT]: 400,
  [ErrorCode.VALUE_OUT_OF_RANGE]: 400,
  [ErrorCode.INVALID_DATE_RANGE]: 400,
  [ErrorCode.DUPLICATE_ENTRY]: 409,

  // Resource
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.ALREADY_EXISTS]: 409,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.GONE]: 410,
  [ErrorCode.LOCKED]: 423,

  // Business
  [ErrorCode.ABSENCE_OVERLAP]: 409,
  [ErrorCode.INSUFFICIENT_BALANCE]: 422,
  [ErrorCode.APPROVAL_REQUIRED]: 422,
  [ErrorCode.CANNOT_MODIFY_APPROVED]: 422,
  [ErrorCode.CANNOT_DELETE_ACTIVE]: 422,
  [ErrorCode.INVALID_STATUS_TRANSITION]: 422,
  [ErrorCode.MANAGER_REQUIRED]: 422,
  [ErrorCode.CIRCULAR_REFERENCE]: 422,
  [ErrorCode.QUOTA_EXCEEDED]: 429,
  [ErrorCode.FEATURE_DISABLED]: 403,

  // Tenant
  [ErrorCode.TENANT_NOT_FOUND]: 404,
  [ErrorCode.TENANT_SUSPENDED]: 403,
  [ErrorCode.TENANT_LIMIT_EXCEEDED]: 429,
  [ErrorCode.CROSS_TENANT_ACCESS]: 403,

  // External
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCode.EXTERNAL_SERVICE_TIMEOUT]: 504,
  [ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE]: 503,

  // ML
  [ErrorCode.FORECAST_FAILED]: 500,
  [ErrorCode.INSUFFICIENT_DATA]: 422,
  [ErrorCode.MODEL_NOT_READY]: 503,
  [ErrorCode.PREDICTION_ERROR]: 500,

  // System
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.MAINTENANCE_MODE]: 503,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.CONFIGURATION_ERROR]: 500,
};

/** Error message templates */
export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCode.UNAUTHORIZED]: "Authentication required",
  [ErrorCode.FORBIDDEN]: "You do not have permission to perform this action",
  [ErrorCode.TOKEN_EXPIRED]: "Your session has expired, please log in again",
  [ErrorCode.TOKEN_INVALID]: "Invalid authentication token",
  [ErrorCode.MFA_REQUIRED]: "Multi-factor authentication required",
  [ErrorCode.MFA_INVALID]: "Invalid MFA code",
  [ErrorCode.SESSION_EXPIRED]: "Your session has expired",
  [ErrorCode.ACCOUNT_LOCKED]:
    "Account is locked due to too many failed attempts",
  [ErrorCode.ACCOUNT_SUSPENDED]: "Your account has been suspended",

  [ErrorCode.VALIDATION_ERROR]: "Validation error",
  [ErrorCode.INVALID_INPUT]: "Invalid input provided",
  [ErrorCode.MISSING_REQUIRED_FIELD]: "Required field is missing",
  [ErrorCode.INVALID_FORMAT]: "Invalid format",
  [ErrorCode.VALUE_OUT_OF_RANGE]: "Value is out of allowed range",
  [ErrorCode.INVALID_DATE_RANGE]: "Invalid date range",
  [ErrorCode.DUPLICATE_ENTRY]: "Entry already exists",

  [ErrorCode.NOT_FOUND]: "Resource not found",
  [ErrorCode.ALREADY_EXISTS]: "Resource already exists",
  [ErrorCode.CONFLICT]: "Conflict with current state",
  [ErrorCode.GONE]: "Resource no longer available",
  [ErrorCode.LOCKED]: "Resource is locked",

  [ErrorCode.ABSENCE_OVERLAP]: "Absence overlaps with existing absence",
  [ErrorCode.INSUFFICIENT_BALANCE]: "Insufficient absence balance",
  [ErrorCode.APPROVAL_REQUIRED]: "Manager approval required",
  [ErrorCode.CANNOT_MODIFY_APPROVED]: "Cannot modify approved absence",
  [ErrorCode.CANNOT_DELETE_ACTIVE]: "Cannot delete active resource",
  [ErrorCode.INVALID_STATUS_TRANSITION]: "Invalid status transition",
  [ErrorCode.MANAGER_REQUIRED]: "Manager assignment required",
  [ErrorCode.CIRCULAR_REFERENCE]: "Circular reference detected",
  [ErrorCode.QUOTA_EXCEEDED]: "Quota exceeded",
  [ErrorCode.FEATURE_DISABLED]:
    "This feature is not enabled for your organization",

  [ErrorCode.TENANT_NOT_FOUND]: "Organization not found",
  [ErrorCode.TENANT_SUSPENDED]: "Organization is suspended",
  [ErrorCode.TENANT_LIMIT_EXCEEDED]: "Organization limit exceeded",
  [ErrorCode.CROSS_TENANT_ACCESS]: "Cross-organization access denied",

  [ErrorCode.EXTERNAL_SERVICE_ERROR]: "External service error",
  [ErrorCode.EXTERNAL_SERVICE_TIMEOUT]: "External service timeout",
  [ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE]: "External service unavailable",

  [ErrorCode.FORECAST_FAILED]: "Forecast generation failed",
  [ErrorCode.INSUFFICIENT_DATA]: "Insufficient data for analysis",
  [ErrorCode.MODEL_NOT_READY]: "Model is not ready",
  [ErrorCode.PREDICTION_ERROR]: "Prediction error",

  [ErrorCode.INTERNAL_ERROR]: "An internal error occurred",
  [ErrorCode.SERVICE_UNAVAILABLE]: "Service temporarily unavailable",
  [ErrorCode.RATE_LIMITED]: "Too many requests, please slow down",
  [ErrorCode.MAINTENANCE_MODE]: "System is under maintenance",
  [ErrorCode.DATABASE_ERROR]: "Database error",
  [ErrorCode.CONFIGURATION_ERROR]: "Configuration error",
};

/** Type guard for error codes */
export function isErrorCode(code: string): code is ErrorCode {
  return Object.values(ErrorCode).includes(code as ErrorCode);
}

/** Get HTTP status for error code */
export function getHttpStatus(code: ErrorCode): number {
  return ErrorHttpStatus[code] ?? 500;
}

/** Get error message for code */
export function getErrorMessage(code: ErrorCode): string {
  return ErrorMessages[code] ?? "An error occurred";
}
