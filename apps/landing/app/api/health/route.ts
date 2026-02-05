import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  const checks = {
    resendApiKey: !!process.env.RESEND_API_KEY,
    sentryDsn: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  };

  const allHealthy = Object.values(checks).every(Boolean);

  if (!allHealthy) {
    Sentry.captureMessage("Health check degraded", {
      level: "warning",
      extra: { checks },
    });
  }

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      service: "landing",
      checks,
    },
    { status: allHealthy ? 200 : 503 },
  );
}
