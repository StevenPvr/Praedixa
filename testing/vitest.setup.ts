import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import { MockIntersectionObserver } from "./utils/mocks/intersection-observer";
import { createUiMocks } from "./utils/mocks/ui";
import {
  createNextNavigationMocks,
  createNextImageMock,
} from "./utils/mocks/next";
import { createLucideIconMocks } from "./utils/mocks/icons";

// Register shared mock factories on globalThis so vi.mock() factories can use them.
// vi.mock() calls are hoisted above imports, but globalThis is always available.
(globalThis as Record<string, unknown>).__mocks = {
  createUiMocks,
  createNextNavigationMocks,
  createNextImageMock,
  createLucideIconMocks,
};

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

function createCanvas2DContextMock(canvas: HTMLCanvasElement) {
  return {
    canvas,
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    closePath: vi.fn(),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
  } as unknown as CanvasRenderingContext2D;
}

const originalCanvasGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function getContext(
  this: HTMLCanvasElement,
  contextId: string,
  options?: unknown,
) {
  if (contextId === "2d") {
    return createCanvas2DContextMock(this);
  }

  return originalCanvasGetContext.call(this, contextId, options);
};

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
