import type {
  ApiResponse,
  ErrorResponse,
  PaginatedResponse,
} from "./api/responses";

const TEST_BASE_URL = "http://localhost:8000";

function resolveApiBaseUrl(): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (!configuredBaseUrl) {
    if (process.env.NODE_ENV === "test") {
      return TEST_BASE_URL;
    }

    throw new Error(
      "NEXT_PUBLIC_API_URL is required outside test runtime and must be an absolute http(s) URL.",
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(configuredBaseUrl);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_API_URL is invalid: "${configuredBaseUrl}". Expected an absolute http(s) URL.`,
    );
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error(
      `NEXT_PUBLIC_API_URL must use http or https, received "${parsedUrl.protocol}".`,
    );
  }

  return configuredBaseUrl.replace(/\/+$/, "");
}

let cachedBaseUrl: string | null = null;

function getBaseUrl(): string {
  if (cachedBaseUrl) {
    return cachedBaseUrl;
  }
  cachedBaseUrl = resolveApiBaseUrl();
  return cachedBaseUrl;
}

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getBaseUrl()}${normalizedPath}`;
}

/** API error with structured details from the server */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: Record<string, unknown>,
    public requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type GetAccessToken = () => Promise<string | null>;

export interface RequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

async function request<T>(
  method: string,
  path: string,
  getAccessToken: GetAccessToken,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Request-ID": crypto.randomUUID(),
    ...options?.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: options?.signal,
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
  getAccessToken: GetAccessToken,
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
  getAccessToken: GetAccessToken,
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
  getAccessToken: GetAccessToken,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  return request<ApiResponse<T>>("POST", path, getAccessToken, body, options);
}

export function apiPatch<T>(
  path: string,
  body: unknown,
  getAccessToken: GetAccessToken,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  return request<ApiResponse<T>>("PATCH", path, getAccessToken, body, options);
}

export function apiDelete(
  path: string,
  getAccessToken: GetAccessToken,
  options?: RequestOptions,
): Promise<void> {
  return request<void>("DELETE", path, getAccessToken, undefined, options);
}
