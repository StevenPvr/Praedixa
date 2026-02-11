import { type NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/lib/auth/middleware";
import { generateNonce, buildCspHeader } from "@/lib/security/csp";

export async function middleware(request: NextRequest) {
  // Generate a per-request nonce for CSP
  const nonce = generateNonce();
  const cspHeader = buildCspHeader(nonce);

  // Pass nonce to Server Components via request header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  // Run auth middleware
  const response = await updateSession(request);

  // Apply CSP to the response (auth middleware may return a redirect or next())
  response.headers.set("Content-Security-Policy", cspHeader);

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
