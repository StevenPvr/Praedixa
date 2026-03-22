import type {
  ApiErrorResponse,
  ApiSuccess,
  PaginatedSuccess,
  RouteResult,
} from "./types.js";

export function success<T>(
  data: T,
  requestId: string,
  message?: string,
  statusCode = 200,
): RouteResult {
  const payload: ApiSuccess<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    requestId,
  };

  if (message != null) {
    payload.message = message;
  }

  return { statusCode, payload };
}

export function paginated<T>(
  items: T[],
  page: number,
  pageSize: number,
  total: number,
  requestId: string,
): RouteResult {
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const payload: PaginatedSuccess<T> = {
    success: true,
    data: items,
    pagination: {
      total,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
    timestamp: new Date().toISOString(),
    requestId,
  };

  return { statusCode: 200, payload };
}

export function failure(
  code: string,
  message: string,
  requestId: string,
  statusCode: number,
  details?: Record<string, unknown>,
): RouteResult {
  const payload: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
    timestamp: new Date().toISOString(),
    requestId,
  };

  return {
    statusCode,
    payload,
  };
}
