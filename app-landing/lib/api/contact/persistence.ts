import {
  assertSafeOutboundUrl,
  collectAllowedHostnames,
} from "../../security/outbound-url";
import { siteConfig } from "../../config/site";
import type { ContactPayload } from "./validation";
import { requestIntentValue } from "./validation";

const CONTACT_PERSIST_TIMEOUT_MS = 8_000;
const CONTACT_API_PATH = "/api/v1/public/contact-requests";

function buildContactPersistenceBody(
  data: ContactPayload,
  request: Request,
  ip: string,
) {
  return {
    locale: data.locale,
    requestType: requestIntentValue(data.intent),
    companyName: data.companyName,
    role: data.role,
    email: data.email,
    subject: data.subject,
    message: data.mainTradeOff,
    consent: data.consent,
    sourceIp: ip,
    metadataJson: {
      source: "landing-contact-form",
      intent: data.intent,
      locale: data.locale,
      siteCount: data.siteCount,
      sector: data.sector,
      timeline: data.timeline,
      currentStack: data.currentStack,
      mainTradeOff: data.mainTradeOff,
      message: data.message,
      userAgent: sanitizeHeaderValue(request.headers.get("user-agent"), 160),
      referer: sanitizeStoredReferer(request.headers.get("referer")),
      submittedAt: new Date().toISOString(),
    },
  };
}

export async function persistContactRequest(
  data: ContactPayload,
  request: Request,
  ip: string,
  requestId: string,
): Promise<void> {
  const { baseUrl, token } = readContactApiConfig();
  const endpoint = new URL(CONTACT_API_PATH, baseUrl).toString();
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    CONTACT_PERSIST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Contact-Ingest-Token": token,
        "X-Request-ID": requestId,
      },
      body: JSON.stringify(buildContactPersistenceBody(data, request, ip)),
      signal: controller.signal,
      redirect: "error",
    });

    if (!response.ok) {
      throw new Error(
        `contact persistence failed: ${await extractApiErrorMessage(response)}`,
      );
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("contact persistence timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function readContactApiConfig(): { baseUrl: string; token: string } {
  const baseUrl = process.env["CONTACT_API_BASE_URL"]?.trim();
  const token = process.env["CONTACT_API_INGEST_TOKEN"]?.trim();

  if (!baseUrl) {
    throw new Error("CONTACT_API_BASE_URL is not configured");
  }
  if (!token) {
    throw new Error("CONTACT_API_INGEST_TOKEN is not configured");
  }

  const parsedBaseUrl = new URL(baseUrl);
  const isLocalHttp =
    parsedBaseUrl.protocol === "http:" &&
    parsedBaseUrl.hostname === "localhost";
  const allowedHosts = collectAllowedHostnames(
    process.env["CONTACT_API_ALLOWED_HOSTS"],
  );

  if (parsedBaseUrl.protocol !== "https:" && !isLocalHttp) {
    throw new Error(
      "CONTACT_API_BASE_URL must use HTTPS in non-local environments",
    );
  }
  if (parsedBaseUrl.username || parsedBaseUrl.password) {
    throw new Error("CONTACT_API_BASE_URL must not include credentials");
  }
  if (
    process.env["NODE_ENV"] === "production" &&
    !isLocalHttp &&
    allowedHosts.size === 0
  ) {
    throw new Error(
      "CONTACT_API_ALLOWED_HOSTS must be configured in production",
    );
  }

  assertSafeOutboundUrl(parsedBaseUrl, {
    allowedHosts,
  });

  return { baseUrl: parsedBaseUrl.toString(), token };
}

function sanitizeHeaderValue(value: string | null, maxLength: number): string {
  if (!value) {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function sanitizeStoredReferer(value: string | null): string {
  if (!value) {
    return "";
  }

  try {
    const parsed = new URL(value);
    const publicOrigin = new URL(siteConfig.url).origin;

    if (parsed.origin === publicOrigin) {
      return `${parsed.origin}${parsed.pathname}`.slice(0, 300);
    }

    return parsed.origin.slice(0, 160);
  } catch {
    return "";
  }
}

async function extractApiErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as {
      error?: { message?: string } | string;
      message?: string;
    };

    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error;
    }
    if (
      payload.error &&
      typeof payload.error === "object" &&
      typeof payload.error.message === "string" &&
      payload.error.message.trim()
    ) {
      return payload.error.message;
    }
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }
  } catch {
    return `HTTP ${response.status}`;
  }

  return `HTTP ${response.status}`;
}
