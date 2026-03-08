import type {
  ApiResponse,
  ErrorResponse,
  PaginatedResponse,
} from "@praedixa/shared-types";
import {
  ApiError,
  type RequestOptions,
} from "@praedixa/shared-types/api-client";
import { resolveApiBaseUrl } from "@/lib/api/base-url";

type GetAccessToken = () => Promise<string | null>;
const NO_ACCESS_TOKEN: GetAccessToken = async () => null;

function shouldUseSameOriginProxy(path: string): boolean {
  return (
    typeof window !== "undefined" &&
    (path.startsWith("/api/") || path.startsWith("api/"))
  );
}

let cachedBaseUrl: string | null = null;

function getBaseUrl(): string {
  if (cachedBaseUrl) {
    return cachedBaseUrl;
  }
  cachedBaseUrl = resolveApiBaseUrl({ allowTestFallback: true });
  return cachedBaseUrl;
}

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (shouldUseSameOriginProxy(normalizedPath)) {
    return normalizedPath;
  }
  return `${getBaseUrl()}${normalizedPath}`;
}

async function request<T>(
  method: string,
  path: string,
  getAccessToken: GetAccessToken = NO_ACCESS_TOKEN,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const useSameOriginProxy = shouldUseSameOriginProxy(normalizedPath);
  const token = useSameOriginProxy ? null : await getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Request-ID": crypto.randomUUID(),
    ...options?.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(normalizedPath), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: options?.signal,
    credentials: useSameOriginProxy ? "same-origin" : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    let errorData: ErrorResponse | null = null;
    try {
      errorData = (await response.json()) as ErrorResponse;
    } catch {
      // Response body is not JSON
    }

    throw new ApiError(
      errorData?.error?.message ??
        `Request failed with status ${response.status}`,
      response.status,
      errorData?.error?.code,
      errorData?.error?.details,
      errorData?.requestId,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function apiGet<T>(
  path: string,
  getAccessToken?: GetAccessToken,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  return request<ApiResponse<T>>(
    "GET",
    path,
    getAccessToken,
    undefined,
    options,
  );
}

export function apiGetPaginated<T>(
  path: string,
  getAccessToken?: GetAccessToken,
  options?: RequestOptions,
): Promise<PaginatedResponse<T>> {
  return request<PaginatedResponse<T>>(
    "GET",
    path,
    getAccessToken,
    undefined,
    options,
  );
}

export function apiPost<T>(
  path: string,
  body: unknown,
  getAccessToken?: GetAccessToken,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  return request<ApiResponse<T>>("POST", path, getAccessToken, body, options);
}

export function apiPatch<T>(
  path: string,
  body: unknown,
  getAccessToken?: GetAccessToken,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  return request<ApiResponse<T>>("PATCH", path, getAccessToken, body, options);
}

export function apiDelete(
  path: string,
  getAccessToken?: GetAccessToken,
  options?: RequestOptions,
): Promise<void> {
  return request<void>("DELETE", path, getAccessToken, undefined, options);
}

export { ApiError, type RequestOptions };
