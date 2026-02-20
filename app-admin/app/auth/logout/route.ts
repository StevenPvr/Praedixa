import { type NextRequest, NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth/oidc";

export async function POST(_request: NextRequest) {
  const response = NextResponse.json({ success: true }, { status: 200 });
  clearAuthCookies(response);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
