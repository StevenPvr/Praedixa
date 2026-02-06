import { vi } from "vitest";

const cookieStore = new Map<string, string>();

export const mockCookieGet = vi.fn((name: string) => {
  const value = cookieStore.get(name);
  return value !== undefined ? { name, value } : undefined;
});

export const mockCookieGetAll = vi.fn(() =>
  Array.from(cookieStore.entries()).map(([name, value]) => ({ name, value })),
);

export const mockCookieSet = vi.fn(
  (name: string, value: string, _options?: Record<string, unknown>) => {
    cookieStore.set(name, value);
  },
);

export const mockCookieDelete = vi.fn((name: string) => {
  cookieStore.delete(name);
});

export const mockCookieHas = vi.fn((name: string) => cookieStore.has(name));

export function setCookie(name: string, value: string) {
  cookieStore.set(name, value);
}

export function resetCookies() {
  cookieStore.clear();
  mockCookieGet.mockClear();
  mockCookieGetAll.mockClear();
  mockCookieSet.mockClear();
  mockCookieDelete.mockClear();
  mockCookieHas.mockClear();
}

const headerStore = new Map<string, string>();

export const mockHeaderGet = vi.fn(
  (name: string) => headerStore.get(name) ?? null,
);
export const mockHeaderHas = vi.fn((name: string) => headerStore.has(name));

export function setHeader(name: string, value: string) {
  headerStore.set(name, value);
}

export function resetHeaders() {
  headerStore.clear();
  mockHeaderGet.mockClear();
  mockHeaderHas.mockClear();
}

export function resetAll() {
  resetCookies();
  resetHeaders();
}

export function createNextHeadersMock() {
  return {
    cookies: vi.fn(() =>
      Promise.resolve({
        get: mockCookieGet,
        getAll: mockCookieGetAll,
        set: mockCookieSet,
        delete: mockCookieDelete,
        has: mockCookieHas,
      }),
    ),
    headers: vi.fn(() =>
      Promise.resolve({
        get: mockHeaderGet,
        has: mockHeaderHas,
        entries: () => headerStore.entries(),
        forEach: (cb: (value: string, key: string) => void) =>
          headerStore.forEach(cb),
      }),
    ),
  };
}
