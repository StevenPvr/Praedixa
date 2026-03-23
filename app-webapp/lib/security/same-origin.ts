import type { NextRequest } from "next/server";
import {
  type SameOriginRequestOptions,
  isAllowedSameOriginRequest,
  normalizeHttpOrigin,
  resolveAuthAppOrigin,
} from "@/lib/auth/origin";

export function isSameOriginBrowserRequest(
  request: NextRequest,
  options: SameOriginRequestOptions = {},
): boolean {
  let expectedOrigin: string | null = null;
  try {
    expectedOrigin = resolveAuthAppOrigin(request);
  } catch {
    expectedOrigin =
      process.env.NODE_ENV === "production"
        ? null
        : normalizeHttpOrigin(request.nextUrl.origin);
  }

  return isAllowedSameOriginRequest(request, expectedOrigin, options);
}
