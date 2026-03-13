import {
  assertSafeOutboundUrl,
  collectAllowedHostnames,
} from "../../security/outbound-url";
import type { ContactPayload } from "./validation";

const CONTACT_PERSIST_TIMEOUT_MS = 8_000;
const CONTACT_API_PATH = "/api/v1/public/contact-requests";

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
      body: JSON.stringify({
        locale: data.locale,
        requestType: data.requestType,
        companyName: data.companyName,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        email: data.email,
        phone: data.phone,
        subject: data.subject,
        message: data.message,
        consent: data.consent,
        sourceIp: ip,
        metadataJson: {
          source: "landing-contact-form",
          requestType: data.requestType,
          locale: data.locale,
          userAgent: request.headers.get("user-agent")?.slice(0, 250) ?? "",
          referer: request.headers.get("referer")?.slice(0, 400) ?? "",
          forwardedFor:
            request.headers.get("x-forwarded-for")?.slice(0, 250) ?? "",
          submittedAt: new Date().toISOString(),
        },
      }),
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
  const baseUrl = process.env.CONTACT_API_BASE_URL?.trim();
  const token = process.env.CONTACT_API_INGEST_TOKEN?.trim();

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

  if (parsedBaseUrl.protocol !== "https:" && !isLocalHttp) {
    throw new Error(
      "CONTACT_API_BASE_URL must use HTTPS in non-local environments",
    );
  }
  if (parsedBaseUrl.username || parsedBaseUrl.password) {
    throw new Error("CONTACT_API_BASE_URL must not include credentials");
  }

  assertSafeOutboundUrl(parsedBaseUrl, {
    allowedHosts: collectAllowedHostnames(
      process.env.CONTACT_API_ALLOWED_HOSTS,
    ),
  });

  return { baseUrl: parsedBaseUrl.toString(), token };
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
