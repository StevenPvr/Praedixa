import type { TelemetryCorrelationContext } from "@praedixa/telemetry";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
export type RoutePermissionMode = "all" | "any";
export type RateLimitScope = "ip" | "principal";

export type UserRole =
  | "super_admin"
  | "org_admin"
  | "hr_manager"
  | "manager"
  | "employee"
  | "viewer";

export interface JWTPayload {
  userId: string;
  email: string;
  organizationId: string;
  role: UserRole;
  siteIds: string[];
  permissions: string[];
}

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
  requestId?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
  timestamp: string;
  requestId?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedSuccess<T = unknown> extends ApiSuccess<T[]> {
  pagination: PaginationMeta;
}

export interface RouteContext {
  method: HttpMethod;
  path: string;
  query: URLSearchParams;
  requestId: string;
  telemetry: TelemetryCorrelationContext;
  clientIp: string | null;
  userAgent: string | null;
  params: Record<string, string>;
  body: unknown;
  user: JWTPayload | null;
}

export interface RouteResult {
  statusCode: number;
  payload: ApiSuccess | PaginatedSuccess | ApiErrorResponse;
}

export type RouteHandler = (
  ctx: RouteContext,
) => RouteResult | Promise<RouteResult>;

export interface RouteRateLimit {
  maxRequests: number;
  scope: RateLimitScope;
  windowMs: number;
}

export interface RouteDefinition {
  method: HttpMethod;
  template: string;
  authRequired: boolean;
  allowedRoles: readonly UserRole[] | null;
  requiredPermissions: readonly string[] | null;
  permissionMode: RoutePermissionMode;
  rateLimit: RouteRateLimit | null;
  handler: RouteHandler;
}

export interface CompiledRoute {
  method: HttpMethod;
  template: string;
  authRequired: boolean;
  allowedRoles: readonly UserRole[] | null;
  requiredPermissions: readonly string[] | null;
  permissionMode: RoutePermissionMode;
  rateLimit: RouteRateLimit | null;
  paramNames: string[];
  regex: RegExp;
  handler: RouteHandler;
}

export interface AppConfig {
  port: number;
  nodeEnv: "development" | "staging" | "production";
  trustProxy: boolean;
  corsOrigins: readonly string[];
  databaseUrl: string | null;
  connectors: {
    runtimeUrl: string;
    runtimeAllowedHosts: readonly string[];
    runtimeToken: string | null;
  };
  jwt: {
    issuerUrl: string;
    audience: string;
    jwksUrl: string;
    algorithms: readonly string[];
  };
}
