import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import { MockIntersectionObserver } from "./utils/mocks/intersection-observer";

// Global test setup for Vitest
// This file is loaded before each test file

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: () => false,
  }),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver with controllable triggers
global.IntersectionObserver =
  MockIntersectionObserver as unknown as typeof IntersectionObserver;

// JSDOM does not implement full document navigation.
// Prevent default anchor navigation during tests to avoid noisy console errors.
document.addEventListener(
  "click",
  (event) => {
    const target = event.target as Element | null;
    const anchor = target?.closest?.("a[href]");
    if (anchor) {
      event.preventDefault();
    }
  },
  true,
);

// Polyfill crypto.randomUUID if absent in jsdom
if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, "crypto", {
    value: {
      ...globalThis.crypto,
      randomUUID: () =>
        "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
          (
            Number(c) ^
            (Math.floor(Math.random() * 16) >> (Number(c) / 4))
          ).toString(16),
        ),
    },
    writable: true,
  });
}
