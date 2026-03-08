const TEST_BASE_URL = "http://localhost:8000";

interface ResolveApiBaseUrlOptions {
  allowTestFallback?: boolean;
}

function isLoopbackHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
}

export function resolveApiBaseUrl(
  options: ResolveApiBaseUrlOptions = {},
): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (!configuredBaseUrl) {
    if (options.allowTestFallback && process.env.NODE_ENV === "test") {
      return TEST_BASE_URL;
    }

    throw new Error(
      "NEXT_PUBLIC_API_URL is required outside test runtime and must be an absolute http(s) URL.",
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(configuredBaseUrl);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_API_URL is invalid: "${configuredBaseUrl}". Expected an absolute http(s) URL.`,
    );
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error(
      `NEXT_PUBLIC_API_URL must use http or https, received "${parsedUrl.protocol}".`,
    );
  }

  if (parsedUrl.protocol === "http:") {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `NEXT_PUBLIC_API_URL must use https in production, received "${configuredBaseUrl}".`,
      );
    }

    if (!isLoopbackHostname(parsedUrl.hostname)) {
      throw new Error(
        `NEXT_PUBLIC_API_URL must use https or a loopback http URL in development, received "${configuredBaseUrl}".`,
      );
    }
  }

  return configuredBaseUrl.replace(/\/+$/, "");
}
