import { describe, it, expect } from "vitest";
import {
  ErrorCode,
  ErrorHttpStatus,
  ErrorMessages,
  isErrorCode,
  getHttpStatus,
  getErrorMessage,
} from "../api/errors";

describe("ErrorCode enum", () => {
  it("defines authentication error codes", () => {
    expect(ErrorCode.UNAUTHORIZED).toBe("AUTH_001");
    expect(ErrorCode.FORBIDDEN).toBe("AUTH_002");
    expect(ErrorCode.TOKEN_EXPIRED).toBe("AUTH_003");
    expect(ErrorCode.TOKEN_INVALID).toBe("AUTH_004");
    expect(ErrorCode.MFA_REQUIRED).toBe("AUTH_005");
    expect(ErrorCode.MFA_INVALID).toBe("AUTH_006");
    expect(ErrorCode.SESSION_EXPIRED).toBe("AUTH_007");
    expect(ErrorCode.ACCOUNT_LOCKED).toBe("AUTH_008");
    expect(ErrorCode.ACCOUNT_SUSPENDED).toBe("AUTH_009");
  });

  it("defines validation error codes", () => {
    expect(ErrorCode.VALIDATION_ERROR).toBe("VAL_001");
    expect(ErrorCode.INVALID_INPUT).toBe("VAL_002");
    expect(ErrorCode.MISSING_REQUIRED_FIELD).toBe("VAL_003");
    expect(ErrorCode.INVALID_FORMAT).toBe("VAL_004");
    expect(ErrorCode.VALUE_OUT_OF_RANGE).toBe("VAL_005");
    expect(ErrorCode.INVALID_DATE_RANGE).toBe("VAL_006");
    expect(ErrorCode.DUPLICATE_ENTRY).toBe("VAL_007");
  });

  it("defines resource error codes", () => {
    expect(ErrorCode.NOT_FOUND).toBe("RES_001");
    expect(ErrorCode.ALREADY_EXISTS).toBe("RES_002");
    expect(ErrorCode.CONFLICT).toBe("RES_003");
    expect(ErrorCode.GONE).toBe("RES_004");
    expect(ErrorCode.LOCKED).toBe("RES_005");
  });

  it("defines business logic error codes", () => {
    expect(ErrorCode.ABSENCE_OVERLAP).toBe("BIZ_001");
    expect(ErrorCode.INSUFFICIENT_BALANCE).toBe("BIZ_002");
    expect(ErrorCode.APPROVAL_REQUIRED).toBe("BIZ_003");
    expect(ErrorCode.CANNOT_MODIFY_APPROVED).toBe("BIZ_004");
    expect(ErrorCode.CANNOT_DELETE_ACTIVE).toBe("BIZ_005");
    expect(ErrorCode.INVALID_STATUS_TRANSITION).toBe("BIZ_006");
    expect(ErrorCode.MANAGER_REQUIRED).toBe("BIZ_007");
    expect(ErrorCode.CIRCULAR_REFERENCE).toBe("BIZ_008");
    expect(ErrorCode.QUOTA_EXCEEDED).toBe("BIZ_009");
    expect(ErrorCode.FEATURE_DISABLED).toBe("BIZ_010");
  });

  it("defines tenant error codes", () => {
    expect(ErrorCode.TENANT_NOT_FOUND).toBe("TEN_001");
    expect(ErrorCode.TENANT_SUSPENDED).toBe("TEN_002");
    expect(ErrorCode.TENANT_LIMIT_EXCEEDED).toBe("TEN_003");
    expect(ErrorCode.CROSS_TENANT_ACCESS).toBe("TEN_004");
  });

  it("defines external service error codes", () => {
    expect(ErrorCode.EXTERNAL_SERVICE_ERROR).toBe("EXT_001");
    expect(ErrorCode.EXTERNAL_SERVICE_TIMEOUT).toBe("EXT_002");
    expect(ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE).toBe("EXT_003");
  });

  it("defines ML/forecasting error codes", () => {
    expect(ErrorCode.FORECAST_FAILED).toBe("ML_001");
    expect(ErrorCode.INSUFFICIENT_DATA).toBe("ML_002");
    expect(ErrorCode.MODEL_NOT_READY).toBe("ML_003");
    expect(ErrorCode.PREDICTION_ERROR).toBe("ML_004");
  });

  it("defines system error codes", () => {
    expect(ErrorCode.INTERNAL_ERROR).toBe("SYS_001");
    expect(ErrorCode.SERVICE_UNAVAILABLE).toBe("SYS_002");
    expect(ErrorCode.RATE_LIMITED).toBe("SYS_003");
    expect(ErrorCode.MAINTENANCE_MODE).toBe("SYS_004");
    expect(ErrorCode.DATABASE_ERROR).toBe("SYS_005");
    expect(ErrorCode.CONFIGURATION_ERROR).toBe("SYS_006");
  });
});

describe("isErrorCode", () => {
  it("returns true for valid error codes", () => {
    expect(isErrorCode("AUTH_001")).toBe(true);
    expect(isErrorCode("VAL_003")).toBe(true);
    expect(isErrorCode("RES_001")).toBe(true);
    expect(isErrorCode("BIZ_001")).toBe(true);
    expect(isErrorCode("TEN_001")).toBe(true);
    expect(isErrorCode("EXT_001")).toBe(true);
    expect(isErrorCode("ML_001")).toBe(true);
    expect(isErrorCode("SYS_001")).toBe(true);
  });

  it("returns true for all ErrorCode enum values", () => {
    for (const code of Object.values(ErrorCode)) {
      expect(isErrorCode(code)).toBe(true);
    }
  });

  it("returns false for invalid strings", () => {
    expect(isErrorCode("INVALID")).toBe(false);
    expect(isErrorCode("")).toBe(false);
    expect(isErrorCode("AUTH_999")).toBe(false);
    expect(isErrorCode("auth_001")).toBe(false); // case-sensitive
    expect(isErrorCode("UNKNOWN_001")).toBe(false);
  });
});

describe("getHttpStatus", () => {
  it("returns 401 for auth errors that require re-authentication", () => {
    expect(getHttpStatus(ErrorCode.UNAUTHORIZED)).toBe(401);
    expect(getHttpStatus(ErrorCode.TOKEN_EXPIRED)).toBe(401);
    expect(getHttpStatus(ErrorCode.TOKEN_INVALID)).toBe(401);
    expect(getHttpStatus(ErrorCode.MFA_REQUIRED)).toBe(401);
    expect(getHttpStatus(ErrorCode.MFA_INVALID)).toBe(401);
    expect(getHttpStatus(ErrorCode.SESSION_EXPIRED)).toBe(401);
  });

  it("returns 403 for forbidden/access-denied errors", () => {
    expect(getHttpStatus(ErrorCode.FORBIDDEN)).toBe(403);
    expect(getHttpStatus(ErrorCode.ACCOUNT_LOCKED)).toBe(403);
    expect(getHttpStatus(ErrorCode.ACCOUNT_SUSPENDED)).toBe(403);
    expect(getHttpStatus(ErrorCode.FEATURE_DISABLED)).toBe(403);
    expect(getHttpStatus(ErrorCode.TENANT_SUSPENDED)).toBe(403);
    expect(getHttpStatus(ErrorCode.CROSS_TENANT_ACCESS)).toBe(403);
  });

  it("returns 400 for validation errors", () => {
    expect(getHttpStatus(ErrorCode.VALIDATION_ERROR)).toBe(400);
    expect(getHttpStatus(ErrorCode.INVALID_INPUT)).toBe(400);
    expect(getHttpStatus(ErrorCode.MISSING_REQUIRED_FIELD)).toBe(400);
    expect(getHttpStatus(ErrorCode.INVALID_FORMAT)).toBe(400);
    expect(getHttpStatus(ErrorCode.VALUE_OUT_OF_RANGE)).toBe(400);
    expect(getHttpStatus(ErrorCode.INVALID_DATE_RANGE)).toBe(400);
  });

  it("returns 404 for not-found errors", () => {
    expect(getHttpStatus(ErrorCode.NOT_FOUND)).toBe(404);
    expect(getHttpStatus(ErrorCode.TENANT_NOT_FOUND)).toBe(404);
  });

  it("returns 409 for conflict errors", () => {
    expect(getHttpStatus(ErrorCode.DUPLICATE_ENTRY)).toBe(409);
    expect(getHttpStatus(ErrorCode.ALREADY_EXISTS)).toBe(409);
    expect(getHttpStatus(ErrorCode.CONFLICT)).toBe(409);
    expect(getHttpStatus(ErrorCode.ABSENCE_OVERLAP)).toBe(409);
  });

  it("returns 410 for gone", () => {
    expect(getHttpStatus(ErrorCode.GONE)).toBe(410);
  });

  it("returns 422 for business rule violations", () => {
    expect(getHttpStatus(ErrorCode.INSUFFICIENT_BALANCE)).toBe(422);
    expect(getHttpStatus(ErrorCode.APPROVAL_REQUIRED)).toBe(422);
    expect(getHttpStatus(ErrorCode.CANNOT_MODIFY_APPROVED)).toBe(422);
    expect(getHttpStatus(ErrorCode.CANNOT_DELETE_ACTIVE)).toBe(422);
    expect(getHttpStatus(ErrorCode.INVALID_STATUS_TRANSITION)).toBe(422);
    expect(getHttpStatus(ErrorCode.MANAGER_REQUIRED)).toBe(422);
    expect(getHttpStatus(ErrorCode.CIRCULAR_REFERENCE)).toBe(422);
    expect(getHttpStatus(ErrorCode.INSUFFICIENT_DATA)).toBe(422);
  });

  it("returns 423 for locked resource", () => {
    expect(getHttpStatus(ErrorCode.LOCKED)).toBe(423);
  });

  it("returns 429 for rate-limited/quota errors", () => {
    expect(getHttpStatus(ErrorCode.QUOTA_EXCEEDED)).toBe(429);
    expect(getHttpStatus(ErrorCode.TENANT_LIMIT_EXCEEDED)).toBe(429);
    expect(getHttpStatus(ErrorCode.RATE_LIMITED)).toBe(429);
  });

  it("returns 500 for internal/system errors", () => {
    expect(getHttpStatus(ErrorCode.INTERNAL_ERROR)).toBe(500);
    expect(getHttpStatus(ErrorCode.DATABASE_ERROR)).toBe(500);
    expect(getHttpStatus(ErrorCode.CONFIGURATION_ERROR)).toBe(500);
    expect(getHttpStatus(ErrorCode.FORECAST_FAILED)).toBe(500);
    expect(getHttpStatus(ErrorCode.PREDICTION_ERROR)).toBe(500);
  });

  it("returns 502 for external service error", () => {
    expect(getHttpStatus(ErrorCode.EXTERNAL_SERVICE_ERROR)).toBe(502);
  });

  it("returns 503 for service unavailable errors", () => {
    expect(getHttpStatus(ErrorCode.SERVICE_UNAVAILABLE)).toBe(503);
    expect(getHttpStatus(ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE)).toBe(503);
    expect(getHttpStatus(ErrorCode.MAINTENANCE_MODE)).toBe(503);
    expect(getHttpStatus(ErrorCode.MODEL_NOT_READY)).toBe(503);
  });

  it("returns 504 for external service timeout", () => {
    expect(getHttpStatus(ErrorCode.EXTERNAL_SERVICE_TIMEOUT)).toBe(504);
  });
});

describe("getHttpStatus fallback", () => {
  it("returns 500 for an unknown code not in ErrorHttpStatus", () => {
    // Defensive branch: code exists as ErrorCode type but not in mapping
    const unknownCode = "UNKNOWN_999" as ErrorCode;
    expect(getHttpStatus(unknownCode)).toBe(500);
  });
});

describe("getErrorMessage", () => {
  it("returns fallback message for an unknown code not in ErrorMessages", () => {
    const unknownCode = "UNKNOWN_999" as ErrorCode;
    expect(getErrorMessage(unknownCode)).toBe("An error occurred");
  });

  it("returns a string for all error codes", () => {
    for (const code of Object.values(ErrorCode)) {
      const msg = getErrorMessage(code);
      expect(typeof msg).toBe("string");
      expect(msg.length).toBeGreaterThan(0);
    }
  });

  it("returns specific messages for auth errors", () => {
    expect(getErrorMessage(ErrorCode.UNAUTHORIZED)).toBe(
      "Authentication required",
    );
    expect(getErrorMessage(ErrorCode.TOKEN_EXPIRED)).toBe(
      "Your session has expired, please log in again",
    );
  });

  it("returns specific messages for validation errors", () => {
    expect(getErrorMessage(ErrorCode.MISSING_REQUIRED_FIELD)).toBe(
      "Required field is missing",
    );
  });

  it("returns specific messages for business errors", () => {
    expect(getErrorMessage(ErrorCode.ABSENCE_OVERLAP)).toBe(
      "Absence overlaps with existing absence",
    );
  });
});

describe("ErrorHttpStatus completeness", () => {
  it("has a mapping for every ErrorCode value", () => {
    const allCodes = Object.values(ErrorCode);
    for (const code of allCodes) {
      expect(ErrorHttpStatus[code]).toBeDefined();
      expect(typeof ErrorHttpStatus[code]).toBe("number");
    }
  });

  it("all HTTP status codes are valid (100-599)", () => {
    for (const status of Object.values(ErrorHttpStatus)) {
      expect(status).toBeGreaterThanOrEqual(100);
      expect(status).toBeLessThanOrEqual(599);
    }
  });
});

describe("ErrorMessages completeness", () => {
  it("has a message for every ErrorCode value", () => {
    const allCodes = Object.values(ErrorCode);
    for (const code of allCodes) {
      expect(ErrorMessages[code]).toBeDefined();
      expect(typeof ErrorMessages[code]).toBe("string");
      expect(ErrorMessages[code].length).toBeGreaterThan(0);
    }
  });
});
