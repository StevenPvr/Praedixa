import "@testing-library/jest-dom/vitest";

// Global test setup for Vitest
// This file is loaded before each test file

// Mock Next.js router if needed
// vi.mock('next/navigation', () => ({
//   useRouter: () => ({
//     push: vi.fn(),
//     replace: vi.fn(),
//     back: vi.fn(),
//   }),
//   usePathname: () => '/',
//   useSearchParams: () => new URLSearchParams(),
// }))

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
