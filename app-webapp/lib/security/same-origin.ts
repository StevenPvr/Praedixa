import type { NextRequest } from "next/server";
import { isAllowedSameOriginRequest } from "@/lib/auth/origin";

export function isSameOriginBrowserRequest(request: NextRequest): boolean {
  return isAllowedSameOriginRequest(request);
}
