import { NextResponse } from "next/server";

export async function GET() {
  // Check required services without revealing WHICH specific variables
  // are present or missing. This prevents information disclosure that
  // would help an attacker fingerprint the deployment.
  const requiredHealthy = !!process.env.RESEND_API_KEY;

  return NextResponse.json(
    {
      status: requiredHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
    },
    { status: requiredHealthy ? 200 : 503 },
  );
}
