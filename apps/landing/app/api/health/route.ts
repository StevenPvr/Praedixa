import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export async function GET() {
  // Check required services without revealing WHICH specific variables
  // are present or missing. This prevents information disclosure that
  // would help an attacker fingerprint the deployment.
  // Required services (Sentry is optional — monitoring only)
  const requiredHealthy = !!process.env.RESEND_API_KEY;
  const optionalHealthy = !!process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!requiredHealthy) {
    Sentry.captureMessage("Health check degraded: required service missing", {
      level: "warning",
      extra: { resendApiKey: false },
    });
  } else if (!optionalHealthy) {
    Sentry.captureMessage("Health check: optional service missing", {
      level: "info",
      extra: { sentryDsn: false },
    });
  }

  return NextResponse.json(
    {
      status: requiredHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
    },
    { status: requiredHealthy ? 200 : 503 },
  );
}
