import React from "react";

/**
 * Factory for next/navigation mocks.
 *
 * Registered on globalThis.__mocks in the vitest setup file.
 *
 * Usage in test files:
 *   vi.mock("next/navigation", () =>
 *     globalThis.__mocks.createNextNavigationMocks({ pathname: "/dashboard" }),
 *   );
 */

export function createNextNavigationMocks(options?: {
  pathname?: string;
  searchParams?: URLSearchParams | Record<string, string>;
}) {
  const pathname = options?.pathname ?? "/";
  const searchParams =
    options?.searchParams instanceof URLSearchParams
      ? options.searchParams
      : new URLSearchParams(options?.searchParams);

  // Use inline function stubs — tests that need to assert on router.push
  // should override useRouter in their own mock or use vi.fn() directly.
  return {
    useRouter: () => ({
      push: () => {},
      replace: () => {},
      back: () => {},
      forward: () => {},
      refresh: () => {},
      prefetch: () => {},
    }),
    usePathname: () => pathname,
    useSearchParams: () => searchParams,
    useParams: () => ({}),
    redirect: () => {},
    notFound: () => {},
    useSelectedLayoutSegment: () => null,
    useSelectedLayoutSegments: () => [],
  };
}

/**
 * Factory for next/image mock.
 */
export function createNextImageMock() {
  return {
    default: (props: Record<string, unknown>) =>
      React.createElement("img", props),
  };
}
