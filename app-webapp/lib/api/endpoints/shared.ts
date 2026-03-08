import type { ApiResponse, PaginatedResponse } from "@praedixa/shared-types";
import { apiGet, apiGetPaginated, apiPatch, apiPost } from "../client";

export type GetAccessToken = () => Promise<string | null>;

const NO_AUTH: GetAccessToken = async () => null;

export function qs(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(([, value]) => value != null);
  if (entries.length === 0) return "";
  return (
    "?" +
    new URLSearchParams(
      entries.map(([key, value]) => [key, String(value)]),
    ).toString()
  );
}

export function encodePathSegment(value: string): string {
  return encodeURIComponent(value);
}

export function getPublicData<T>(path: string): Promise<T> {
  return apiGet<T>(path, NO_AUTH).then((response) => response.data);
}

export function getEndpoint<T>(
  path: string,
  token: GetAccessToken,
): Promise<ApiResponse<T>> {
  return apiGet<T>(path, token);
}

export function getPaginatedEndpoint<T>(
  path: string,
  token: GetAccessToken,
): Promise<PaginatedResponse<T>> {
  return apiGetPaginated<T>(path, token);
}

export function postEndpoint<T>(
  path: string,
  body: unknown,
  token: GetAccessToken,
): Promise<ApiResponse<T>> {
  return apiPost<T>(path, body, token);
}

export function patchEndpoint<T>(
  path: string,
  body: unknown,
  token: GetAccessToken,
): Promise<ApiResponse<T>> {
  return apiPatch<T>(path, body, token);
}
