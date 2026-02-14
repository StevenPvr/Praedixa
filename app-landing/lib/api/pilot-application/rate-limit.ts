import {
  RATE_LIMIT_WINDOW_MS,
  MAX_REQUESTS_PER_WINDOW,
  MAX_RATE_LIMIT_ENTRIES,
} from "./constants";

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function getClientIp(request: Request): string {
  const cfIp = request.headers.get("cf-connecting-ip");
  const forwardedFor = request.headers.get("x-forwarded-for");
  return cfIp || forwardedFor?.split(",")[0]?.trim() || "unknown";
}

export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    /* v8 ignore next 5 -- eviction requires 10k entries, impractical in unit tests */
    if (rateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES) {
      for (const [key, entry] of rateLimitMap) {
        if (now > entry.resetTime) rateLimitMap.delete(key);
      }
    }
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) return true;

  record.count++;
  return false;
}
