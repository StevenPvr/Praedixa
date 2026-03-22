import { NextResponse } from "next/server";
import {
  getOidcEnv,
  getTrustedOidcEndpoints,
  isMissingOidcEnvError,
} from "@/lib/auth/oidc";

function jsonResponse(body: Record<string, unknown>, status: number) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function describeProviderStatusError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function GET() {
  try {
    const { issuerUrl } = getOidcEnv();
    await getTrustedOidcEndpoints(issuerUrl);
    return jsonResponse({ healthy: true }, 200);
  } catch (error) {
    const code = isMissingOidcEnvError(error)
      ? "oidc_config_missing"
      : "oidc_provider_untrusted";

    if (code === "oidc_provider_untrusted") {
      process.emitWarning(
        `[admin-auth-provider-status] OIDC provider check failed: ${describeProviderStatusError(error)}`,
      );
    }

    return jsonResponse({ healthy: false, code }, 503);
  }
}
