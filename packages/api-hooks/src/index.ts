import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import type { PaginationMeta } from "@praedixa/shared-types";

export type AccessTokenGetter = () => Promise<string | null>;
export type RequestOptions = {
  headers?: Record<string, string>;
  signal?: AbortSignal;
};
export type RouterLike = {
  replace: (href: string) => void;
};
export type UseRouterLike = () => RouterLike;
export type ApiErrorLike = {
  message: string;
  status: number;
  code?: string;
  requestId?: string;
};
export type QueryOptions = {
  pollInterval?: number;
  autoRetry?: boolean;
  retryDelayMs?: number;
};

type RetryTimerRef = MutableRefObject<ReturnType<typeof setTimeout> | null>;
type FetchOptions = { silent?: boolean; fromRetry?: boolean };
type ApiResponseShape<T> = { data: T };
type PaginatedResponseShape<T> = { data: T[]; pagination: PaginationMeta };
type ApiGetAdapter = <T>(
  path: string,
  getAccessToken?: AccessTokenGetter,
  options?: RequestOptions,
) => Promise<ApiResponseShape<T>>;
type ApiGetPaginatedAdapter = <T>(
  path: string,
  getAccessToken?: AccessTokenGetter,
  options?: RequestOptions,
) => Promise<PaginatedResponseShape<T>>;
type ApiMutationAdapter = <T>(
  path: string,
  body: unknown,
  getAccessToken?: AccessTokenGetter,
  options?: RequestOptions,
) => Promise<ApiResponseShape<T>>;

export interface UseApiGetResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export interface UseApiGetPaginatedResult<T> {
  data: T[];
  total: number;
  pagination: PaginationMeta | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export interface UseApiMutationResult<TReq, TRes> {
  mutate: (body: TReq) => Promise<TRes | null>;
  loading: boolean;
  error: string | null;
  data: TRes | null;
  reset: () => void;
}

export interface CreateApiHooksOptions {
  useRouter: UseRouterLike;
  apiGet: ApiGetAdapter;
  apiGetPaginated: ApiGetPaginatedAdapter;
  apiPost: ApiMutationAdapter;
  apiPatch: ApiMutationAdapter;
  getAccessToken?: AccessTokenGetter;
  onUnauthorized: (
    router: RouterLike,
    error?: ApiErrorLike,
  ) => Promise<void> | void;
  unexpectedErrorMessage?: string;
  autoRetryDelayMs?: number;
}

const DEFAULT_UNEXPECTED_ERROR = "Une erreur inattendue est survenue";
const DEFAULT_AUTO_RETRY_DELAY_MS = 1500;

function isApiErrorLike(error: unknown): error is ApiErrorLike {
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { message?: unknown }).message === "string" &&
    typeof (error as { status?: unknown }).status === "number"
  );
}

function isUnauthorizedError(error: unknown): error is ApiErrorLike {
  return isApiErrorLike(error) && error.status === 401;
}

function isRetryableError(error: unknown): boolean {
  if (!isApiErrorLike(error)) {
    return true;
  }
  if (error.status === 408 || error.status === 429) {
    return true;
  }
  return error.status >= 500;
}

function clearRetryTimer(retryTimerRef: RetryTimerRef): void {
  if (!retryTimerRef.current) {
    return;
  }
  clearTimeout(retryTimerRef.current);
  retryTimerRef.current = null;
}

function shouldScheduleRetry(
  error: unknown,
  autoRetryEnabled: boolean,
  pollInterval: number | undefined,
  fetchOptions: FetchOptions | undefined,
): boolean {
  return (
    autoRetryEnabled &&
    ((fetchOptions?.fromRetry ?? false) || !fetchOptions?.silent) &&
    !pollInterval &&
    isRetryableError(error)
  );
}

function scheduleRetry(
  retryTimerRef: RetryTimerRef,
  retryDelayMs: number,
  retry: () => void,
): void {
  clearRetryTimer(retryTimerRef);
  retryTimerRef.current = setTimeout(retry, retryDelayMs);
}

function handleBackgroundPromise(promise: Promise<unknown>): void {
  promise.catch(() => undefined);
}

function buildPaginatedUrl(
  url: string | null,
  page: number,
  limit: number,
): string | null {
  if (!url) {
    return null;
  }
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}page=${page}&page_size=${limit}`;
}

export function buildReauthUrl(
  error?: Pick<ApiErrorLike, "code" | "requestId">,
): string {
  const params = new URLSearchParams({ reauth: "1" });
  params.set("reason", "api_unauthorized");

  const errorCode = error?.code?.trim();
  if (errorCode) {
    params.set("error_code", errorCode);
  }

  const requestId = error?.requestId?.trim();
  if (requestId) {
    params.set("request_id", requestId);
  }

  return `/login?${params.toString()}`;
}

export function createApiHooks(options: CreateApiHooksOptions) {
  const unexpectedErrorMessage =
    options.unexpectedErrorMessage ?? DEFAULT_UNEXPECTED_ERROR;
  const autoRetryDelayMs =
    options.autoRetryDelayMs ?? DEFAULT_AUTO_RETRY_DELAY_MS;

  function getErrorMessage(error: unknown): string {
    return isApiErrorLike(error) ? error.message : unexpectedErrorMessage;
  }

  function useApiGet<T>(
    url: string | null,
    queryOptions?: QueryOptions,
  ): UseApiGetResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = options.useRouter();
    const fetchIdRef = useRef(0);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const unauthorizedHandledRef = useRef(false);
    const autoRetryEnabled = queryOptions?.autoRetry ?? true;
    const pollInterval = queryOptions?.pollInterval;
    const retryDelayMs = queryOptions?.retryDelayMs ?? autoRetryDelayMs;

    const resetState = useCallback(() => {
      setData((current) => (current === null ? current : null));
      setError((current) => (current === null ? current : null));
      setLoading(false);
    }, []);

    const handleUnauthorized = useCallback(
      async (caughtError: ApiErrorLike) => {
        clearRetryTimer(retryTimerRef);
        resetState();

        if (unauthorizedHandledRef.current) {
          return;
        }

        unauthorizedHandledRef.current = true;
        await options.onUnauthorized(router, caughtError);
      },
      [resetState, router],
    );

    const fetchData = useCallback(
      async (signal: AbortSignal, fetchOptions?: FetchOptions) => {
        if (!url) {
          clearRetryTimer(retryTimerRef);
          unauthorizedHandledRef.current = false;
          resetState();
          return;
        }

        const id = ++fetchIdRef.current;
        if (!fetchOptions?.silent) {
          setLoading(true);
          setError(null);
        }

        try {
          const response = await options.apiGet<T>(
            url,
            options.getAccessToken,
            {
              signal,
            },
          );
          if (id === fetchIdRef.current) {
            unauthorizedHandledRef.current = false;
            setData(response.data);
            setError(null);
            clearRetryTimer(retryTimerRef);
          }
        } catch (caughtError) {
          if (signal.aborted || id !== fetchIdRef.current) {
            return;
          }

          if (isUnauthorizedError(caughtError)) {
            await handleUnauthorized(caughtError);
            return;
          }

          if (!fetchOptions?.silent) {
            setError(getErrorMessage(caughtError));
          }

          if (
            shouldScheduleRetry(
              caughtError,
              autoRetryEnabled,
              pollInterval,
              fetchOptions,
            )
          ) {
            scheduleRetry(retryTimerRef, retryDelayMs, () => {
              const controller = new AbortController();
              handleBackgroundPromise(
                fetchData(controller.signal, {
                  silent: true,
                  fromRetry: true,
                }),
              );
            });
          }
        } finally {
          if (
            id === fetchIdRef.current &&
            !signal.aborted &&
            !fetchOptions?.silent
          ) {
            setLoading(false);
          }
        }
      },
      [
        autoRetryEnabled,
        handleUnauthorized,
        pollInterval,
        resetState,
        retryDelayMs,
        url,
      ],
    );

    useEffect(() => {
      const controller = new AbortController();
      handleBackgroundPromise(fetchData(controller.signal));

      return () => {
        controller.abort();
        clearRetryTimer(retryTimerRef);
      };
    }, [fetchData]);

    useEffect(() => {
      if (!pollInterval || !url) {
        return;
      }

      let pollController: AbortController | null = null;
      const intervalId = setInterval(() => {
        pollController?.abort();
        pollController = new AbortController();
        handleBackgroundPromise(
          fetchData(pollController.signal, { silent: true }),
        );
      }, pollInterval);

      return () => {
        clearInterval(intervalId);
        pollController?.abort();
      };
    }, [fetchData, pollInterval, url]);

    const refetch = useCallback(() => {
      const controller = new AbortController();
      handleBackgroundPromise(fetchData(controller.signal));
    }, [fetchData]);

    return { data, loading, error, refetch };
  }

  function useApiGetPaginated<T>(
    url: string | null,
    page: number,
    limit: number,
    queryOptions?: QueryOptions,
  ): UseApiGetPaginatedResult<T> {
    const [data, setData] = useState<T[]>([]);
    const [total, setTotal] = useState(0);
    const [pagination, setPagination] = useState<PaginationMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = options.useRouter();
    const fetchIdRef = useRef(0);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const unauthorizedHandledRef = useRef(false);
    const autoRetryEnabled = queryOptions?.autoRetry ?? true;
    const pollInterval = queryOptions?.pollInterval;
    const retryDelayMs = queryOptions?.retryDelayMs ?? autoRetryDelayMs;
    const fullUrl = buildPaginatedUrl(url, page, limit);

    const resetState = useCallback(() => {
      setData((current) => (current.length === 0 ? current : []));
      setTotal((current) => (current === 0 ? current : 0));
      setPagination((current) => (current === null ? current : null));
      setError((current) => (current === null ? current : null));
      setLoading(false);
    }, []);

    const handleUnauthorized = useCallback(
      async (caughtError: ApiErrorLike) => {
        clearRetryTimer(retryTimerRef);
        resetState();

        if (unauthorizedHandledRef.current) {
          return;
        }

        unauthorizedHandledRef.current = true;
        await options.onUnauthorized(router, caughtError);
      },
      [resetState, router],
    );

    const fetchData = useCallback(
      async (signal: AbortSignal, fetchOptions?: FetchOptions) => {
        if (!fullUrl) {
          clearRetryTimer(retryTimerRef);
          unauthorizedHandledRef.current = false;
          resetState();
          return;
        }

        const id = ++fetchIdRef.current;
        if (!fetchOptions?.silent) {
          setLoading(true);
          setError(null);
        }

        try {
          const response = await options.apiGetPaginated<T>(
            fullUrl,
            options.getAccessToken,
            { signal },
          );
          if (id === fetchIdRef.current) {
            unauthorizedHandledRef.current = false;
            setData(response.data);
            setTotal(response.pagination.total);
            setPagination(response.pagination);
            setError(null);
            clearRetryTimer(retryTimerRef);
          }
        } catch (caughtError) {
          if (signal.aborted || id !== fetchIdRef.current) {
            return;
          }

          if (isUnauthorizedError(caughtError)) {
            await handleUnauthorized(caughtError);
            return;
          }

          if (!fetchOptions?.silent) {
            setError(getErrorMessage(caughtError));
          }

          if (
            shouldScheduleRetry(
              caughtError,
              autoRetryEnabled,
              pollInterval,
              fetchOptions,
            )
          ) {
            scheduleRetry(retryTimerRef, retryDelayMs, () => {
              const controller = new AbortController();
              handleBackgroundPromise(
                fetchData(controller.signal, {
                  silent: true,
                  fromRetry: true,
                }),
              );
            });
          }
        } finally {
          if (
            id === fetchIdRef.current &&
            !signal.aborted &&
            !fetchOptions?.silent
          ) {
            setLoading(false);
          }
        }
      },
      [
        autoRetryEnabled,
        fullUrl,
        handleUnauthorized,
        pollInterval,
        resetState,
        retryDelayMs,
      ],
    );

    useEffect(() => {
      const controller = new AbortController();
      handleBackgroundPromise(fetchData(controller.signal));

      return () => {
        controller.abort();
        clearRetryTimer(retryTimerRef);
      };
    }, [fetchData]);

    useEffect(() => {
      if (!pollInterval || !fullUrl) {
        return;
      }

      let pollController: AbortController | null = null;
      const intervalId = setInterval(() => {
        pollController?.abort();
        pollController = new AbortController();
        handleBackgroundPromise(
          fetchData(pollController.signal, { silent: true }),
        );
      }, pollInterval);

      return () => {
        clearInterval(intervalId);
        pollController?.abort();
      };
    }, [fetchData, fullUrl, pollInterval]);

    const refetch = useCallback(() => {
      const controller = new AbortController();
      handleBackgroundPromise(fetchData(controller.signal));
    }, [fetchData]);

    return { data, total, pagination, loading, error, refetch };
  }

  function useApiMutation<TReq, TRes>(
    url: string,
    method: "POST" | "PATCH",
  ): UseApiMutationResult<TReq, TRes> {
    const [data, setData] = useState<TRes | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = options.useRouter();
    const abortRef = useRef<AbortController | null>(null);
    const urlRef = useRef(url);
    urlRef.current = url;

    const mutate = useCallback(
      async (body: TReq): Promise<TRes | null> => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        setError(null);

        try {
          const request =
            method === "POST"
              ? options.apiPost<TRes>(
                  urlRef.current,
                  body,
                  options.getAccessToken,
                  { signal: controller.signal },
                )
              : options.apiPatch<TRes>(
                  urlRef.current,
                  body,
                  options.getAccessToken,
                  { signal: controller.signal },
                );
          const response = await request;
          setData(response.data);
          return response.data;
        } catch (caughtError) {
          if (controller.signal.aborted) {
            return null;
          }

          if (isUnauthorizedError(caughtError)) {
            await options.onUnauthorized(router, caughtError);
            return null;
          }

          setError(getErrorMessage(caughtError));
          return null;
        } finally {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        }
      },
      [method, router],
    );

    const reset = useCallback(() => {
      setData(null);
      setError(null);
      setLoading(false);
    }, []);

    useEffect(() => {
      abortRef.current?.abort();
      setData(null);
      setError(null);
      setLoading(false);
    }, [url]);

    useEffect(() => {
      return () => abortRef.current?.abort();
    }, []);

    return { mutate, loading, error, data, reset };
  }

  function useApiPost<TReq, TRes>(
    url: string,
  ): UseApiMutationResult<TReq, TRes> {
    return useApiMutation<TReq, TRes>(url, "POST");
  }

  function useApiPatch<TReq, TRes>(
    url: string,
  ): UseApiMutationResult<TReq, TRes> {
    return useApiMutation<TReq, TRes>(url, "PATCH");
  }

  return {
    useApiGet,
    useApiGetPaginated,
    useApiPost,
    useApiPatch,
  };
}
