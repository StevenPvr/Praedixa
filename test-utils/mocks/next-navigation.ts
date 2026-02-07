import { vi } from "vitest";

export const mockPush = vi.fn();
export const mockReplace = vi.fn();
export const mockBack = vi.fn();
export const mockForward = vi.fn();
export const mockRefresh = vi.fn();
export const mockPrefetch = vi.fn();
export const mockRedirect = vi.fn();

let currentPathname = "/";
let currentSearchParams = new URLSearchParams();
let currentParams: Record<string, string> = {};

export function setPathname(pathname: string) {
  currentPathname = pathname;
}

export function setSearchParams(
  params: URLSearchParams | Record<string, string>,
) {
  currentSearchParams =
    params instanceof URLSearchParams ? params : new URLSearchParams(params);
}

export function setParams(params: Record<string, string>) {
  currentParams = params;
}

export function resetNavigation() {
  mockPush.mockReset();
  mockReplace.mockReset();
  mockBack.mockReset();
  mockForward.mockReset();
  mockRefresh.mockReset();
  mockPrefetch.mockReset();
  mockRedirect.mockReset();
  currentPathname = "/";
  currentSearchParams = new URLSearchParams();
  currentParams = {};
}

export function createNextNavigationMock() {
  return {
    useRouter: () => ({
      push: mockPush,
      replace: mockReplace,
      back: mockBack,
      forward: mockForward,
      refresh: mockRefresh,
      prefetch: mockPrefetch,
    }),
    usePathname: () => currentPathname,
    useSearchParams: () => currentSearchParams,
    useParams: () => currentParams,
    redirect: mockRedirect,
    notFound: vi.fn(),
    useSelectedLayoutSegment: () => null,
    useSelectedLayoutSegments: () => [],
  };
}
