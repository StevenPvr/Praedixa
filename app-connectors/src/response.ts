import type { ApiErrorResponse, ApiSuccess, RouteResult } from "./types.js";

function nowIso(): string {
  return new Date().toISOString();
}

export function success<T>(
  data: T,
  requestId?: string,
  message?: string,
  statusCode = 200,
): RouteResult {
  const payload: ApiSuccess<T> = {
    success: true,
    data,
    timestamp: nowIso(),
    ...(message ? { message } : {}),
    ...(requestId ? { requestId } : {}),
  };

  return { statusCode, payload };
}

export function failure(
  code: string,
  message: string,
  requestId?: string,
  statusCode = 400,
  details?: Record<string, unknown>,
): RouteResult {
  const payload: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
    timestamp: nowIso(),
    ...(requestId ? { requestId } : {}),
  };
  return { statusCode, payload };
}
