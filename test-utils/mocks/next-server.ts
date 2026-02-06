import { vi } from "vitest";

interface MockRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | null;
  cookies?: Record<string, string>;
}

class MockNextURL {
  pathname: string;
  searchParams: URLSearchParams;
  origin: string;
  href: string;

  constructor(url: string) {
    const parsed = new URL(url, "http://localhost:3000");
    this.pathname = parsed.pathname;
    this.searchParams = parsed.searchParams;
    this.origin = parsed.origin;
    this.href = parsed.href;
  }
}

class MockCookies {
  private store = new Map<string, string>();

  constructor(initial?: Record<string, string>) {
    if (initial) {
      Object.entries(initial).forEach(([k, v]) => this.store.set(k, v));
    }
  }

  get(name: string) {
    const value = this.store.get(name);
    return value !== undefined ? { name, value } : undefined;
  }

  getAll() {
    return Array.from(this.store.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }

  set(name: string, value: string) {
    this.store.set(name, value);
  }

  delete(name: string) {
    this.store.delete(name);
  }

  has(name: string) {
    return this.store.has(name);
  }
}

export function createMockNextRequest(
  url: string,
  opts: MockRequestOptions = {},
) {
  const { method = "GET", headers = {}, body = null, cookies = {} } = opts;
  const nextUrl = new MockNextURL(url);
  const mockCookies = new MockCookies(cookies);

  return {
    url: nextUrl.href,
    method,
    nextUrl,
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
      has: (name: string) => name.toLowerCase() in headers,
      entries: () => Object.entries(headers),
      forEach: (cb: (value: string, key: string) => void) =>
        Object.entries(headers).forEach(([k, v]) => cb(v, k)),
    },
    cookies: mockCookies,
    text: vi.fn(() => Promise.resolve(body ?? "")),
    json: vi.fn(() => Promise.resolve(body ? JSON.parse(body) : null)),
  };
}

export function createMockNextResponse() {
  const responseCookies = new MockCookies();

  return {
    next: vi.fn((_opts?: unknown) => ({
      cookies: responseCookies,
      headers: new Map<string, string>(),
    })),
    redirect: vi.fn((url: string | URL) => ({
      status: 307,
      headers: { location: typeof url === "string" ? url : url.toString() },
      cookies: responseCookies,
    })),
    json: vi.fn((body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
      json: () => Promise.resolve(body),
    })),
  };
}
