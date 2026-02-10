import type { Page, Request } from "@playwright/test";

type QueryParams = Record<string, string>;

type WaitForApiRequestOptions = {
  pathname: string;
  query?: QueryParams;
  method?: string;
  timeout?: number;
};

export function waitForApiRequest(
  page: Page,
  options: WaitForApiRequestOptions,
): Promise<Request> {
  const { pathname, query = {}, method = "GET", timeout = 10_000 } = options;

  return page.waitForRequest(
    (request) => {
      if (request.method() !== method) {
        return false;
      }

      const url = new URL(request.url());
      if (url.pathname !== pathname) {
        return false;
      }

      return Object.entries(query).every(
        ([key, value]) => url.searchParams.get(key) === value,
      );
    },
    { timeout },
  );
}
