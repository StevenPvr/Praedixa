import type { NextRequest } from "next/server";
import {
  type SameOriginRequestOptions,
  getConfiguredAuthAppOrigin,
  isAllowedSameOriginRequest,
  normalizeHttpOrigin,
} from "@/lib/auth/origin";

export function isSameOriginBrowserRequest(
  request: NextRequest,
  options: SameOriginRequestOptions = {},
): boolean {
  const configuredOrigin = getConfiguredAuthAppOrigin();
  const expectedOrigin =
    configuredOrigin ||
    (process.env.NODE_ENV === "production"
      ? null
      : normalizeHttpOrigin(request.nextUrl.origin));

  return isAllowedSameOriginRequest(request, expectedOrigin, options);
}
