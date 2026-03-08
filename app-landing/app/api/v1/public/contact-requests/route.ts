import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  readTextBodyWithLimit,
} from "../../../../../lib/security/request-body";

const INGEST_TOKEN_HEADER = "x-contact-ingest-token";
const MAX_REQUEST_BODY_LENGTH = 20_000;
const MAX_METADATA_DEPTH = 2;
const MAX_STRING_LENGTH = 2_000;
const ALLOWED_PAYLOAD_KEYS = new Set([
  "locale",
  "requestType",
  "companyName",
  "firstName",
  "lastName",
  "role",
  "email",
  "phone",
  "subject",
  "message",
  "consent",
  "sourceIp",
  "metadataJson",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidStringField(
  value: unknown,
  {
    required = false,
    maxLength = MAX_STRING_LENGTH,
  }: { required?: boolean; maxLength?: number } = {},
): boolean {
  if (value === undefined || value === null) {
    return !required;
  }

  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (required && trimmed.length === 0) return false;
  return trimmed.length <= maxLength;
}

function hasSafeMetadataShape(value: unknown, depth = 0): boolean {
  if (!isPlainObject(value) || depth > MAX_METADATA_DEPTH) {
    return false;
  }

  return Object.values(value).every((entry) => {
    if (entry === null) return true;
    if (typeof entry === "boolean" || typeof entry === "number") return true;
    if (typeof entry === "string") return entry.length <= MAX_STRING_LENGTH;
    if (Array.isArray(entry)) return false;
    return hasSafeMetadataShape(entry, depth + 1);
  });
}

function hasValidIngestPayload(payload: Record<string, unknown>): boolean {
  if (Object.keys(payload).some((key) => !ALLOWED_PAYLOAD_KEYS.has(key))) {
    return false;
  }

  if (
    !isValidStringField(payload.locale, { required: true, maxLength: 8 }) ||
    !isValidStringField(payload.requestType, {
      required: true,
      maxLength: 40,
    }) ||
    !isValidStringField(payload.companyName, {
      required: true,
      maxLength: 100,
    }) ||
    !isValidStringField(payload.email, { required: true, maxLength: 254 }) ||
    !isValidStringField(payload.subject, {
      required: true,
      maxLength: 120,
    }) ||
    !isValidStringField(payload.message, {
      required: true,
      maxLength: 800,
    }) ||
    !isValidStringField(payload.sourceIp, {
      required: true,
      maxLength: 128,
    })
  ) {
    return false;
  }

  if (
    !isValidStringField(payload.firstName, { maxLength: 80 }) ||
    !isValidStringField(payload.lastName, { maxLength: 80 }) ||
    !isValidStringField(payload.role, { maxLength: 80 }) ||
    !isValidStringField(payload.phone, { maxLength: 30 })
  ) {
    return false;
  }

  if (payload.consent !== true) {
    return false;
  }

  if (
    payload.metadataJson !== undefined &&
    !hasSafeMetadataShape(payload.metadataJson)
  ) {
    return false;
  }

  return true;
}

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

  const contentLength = request.headers.get("content-length");
  if (
    contentLength &&
    Number.parseInt(contentLength, 10) > MAX_REQUEST_BODY_LENGTH
  ) {
    return NextResponse.json(
      { error: "Payload too large." },
      { status: 413, headers: responseHeaders },
    );
  }

  let rawText: string;
  try {
    rawText = await readTextBodyWithLimit(request, MAX_REQUEST_BODY_LENGTH);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { error: "Payload too large." },
        { status: 413, headers: responseHeaders },
      );
    }
    throw error;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawText);
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

  if (!hasValidIngestPayload(payload as Record<string, unknown>)) {
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
