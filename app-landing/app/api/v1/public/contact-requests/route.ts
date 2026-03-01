import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

const INGEST_TOKEN_HEADER = "x-contact-ingest-token";

function hasValidIngestToken(
  expectedToken: string | undefined,
  providedToken: string | null,
): boolean {
  if (!expectedToken || !providedToken) return false;

  const expected = Buffer.from(expectedToken.trim(), "utf8");
  const provided = Buffer.from(providedToken.trim(), "utf8");

  if (expected.length === 0 || expected.length !== provided.length) {
    return false;
  }

  return timingSafeEqual(expected, provided);
}

export async function POST(request: Request) {
  const responseHeaders = { "Cache-Control": "no-store" };
  const expectedToken = process.env.CONTACT_API_INGEST_TOKEN;
  if (!expectedToken?.trim()) {
    return NextResponse.json(
      { error: "Contact ingest unavailable." },
      { status: 503, headers: responseHeaders },
    );
  }

  const providedToken = request.headers.get(INGEST_TOKEN_HEADER);
  if (!hasValidIngestToken(expectedToken, providedToken)) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401, headers: responseHeaders },
    );
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return NextResponse.json(
      { error: "Unsupported media type." },
      { status: 415, headers: responseHeaders },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON." },
      { status: 400, headers: responseHeaders },
    );
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json(
      { error: "Invalid payload." },
      { status: 400, headers: responseHeaders },
    );
  }

  const requestId = request.headers.get("x-request-id")?.trim() || "unknown";

  return NextResponse.json(
    {
      id: `contact-ingest-${requestId}`,
      status: "received",
    },
    { status: 201, headers: responseHeaders },
  );
}
