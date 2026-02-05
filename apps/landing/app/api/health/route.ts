import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  // Check required services without revealing WHICH specific variables
  // are present or missing. This prevents information disclosure that
  // would help an attacker fingerprint the deployment.
  const allHealthy =
    !!process.env.RESEND_API_KEY && !!process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!allHealthy) {
    // Log degraded state to Sentry for operators -- never expose details to clients
    Sentry.captureMessage("Health check degraded", {
      level: "warning",
      extra: {
        resendApiKey: !!process.env.RESEND_API_KEY,
        sentryDsn: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
      },
    });
  }

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
    },
    { status: allHealthy ? 200 : 503 },
  );
}
