type SecurityLogPrimitive = string | number | boolean | null | undefined;

function isLocalAddress(value: string): boolean {
  return (
    value.startsWith("127.") ||
    value === "::1" ||
    value === "[::1]" ||
    value.startsWith("localhost")
  );
}

export function redactIpForLogs(ip: string): string {
  const candidate = ip.trim();
  if (!candidate || candidate === "unknown") return "unknown";

  if (candidate.includes(":")) {
    if (isLocalAddress(candidate)) return candidate;
    const parts = candidate.replace(/^\[|\]$/g, "").split(":");
    if (parts.length <= 2) return "redacted-v6";
    return `${parts.slice(0, 2).join(":")}::/64`;
  }

  if (candidate.includes(".")) {
    if (isLocalAddress(candidate)) return candidate;
    const octets = candidate.split(".");
    if (octets.length !== 4) return "redacted-v4";
    return `${octets[0]}.${octets[1]}.${octets[2]}.0/24`;
  }

  return "redacted";
}

export function logSecurityEvent(
  event: string,
  details: Record<string, SecurityLogPrimitive>,
): void {
  if (process.env["NODE_ENV"] === "test") return;
  // eslint-disable-next-line no-console -- centralized security logging sink
  console.warn(`[landing-security] ${event}`, details);
}
