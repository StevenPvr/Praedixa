"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { useRouter } from "next/navigation";
import type { PaginationMeta } from "@praedixa/shared-types";
import {
  apiGet,
  apiGetPaginated,
  apiPost,
  apiPatch,
  ApiError,
} from "@/lib/api/client";
import { clearAuthSession, getValidAccessToken } from "@/lib/auth/client";

/* v8 ignore start -- internal helper always mocked in tests */
function useAccessToken(): () => Promise<string | null> {
  return useCallback(async () => getValidAccessToken(), []);
}
/* v8 ignore stop */

type RouterLike = Pick<ReturnType<typeof useRouter>, "replace">;
type RetryTimerRef = MutableRefObject<ReturnType<typeof setTimeout> | null>;
type FetchOptions = { silent?: boolean; fromRetry?: boolean };
type QueryOptions = {
  pollInterval?: number;
  autoRetry?: boolean;
  retryDelayMs?: number;
};

const UNEXPECTED_ERROR = "Une erreur inattendue est survenue";
const AUTO_RETRY_DELAY_MS = 1500;

function isRetryableError(err: unknown): boolean {
  if (!(err instanceof ApiError)) {
    return true;
  }
  if (err.status === 408 || err.status === 429) {
    return true;
  }
  return err.status >= 500;
}

function isUnauthorizedError(err: unknown): err is ApiError {
  return err instanceof ApiError && err.status === 401;
}

function getErrorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : UNEXPECTED_ERROR;
}

function buildReauthUrl(error?: ApiError): string {
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

async function redirectToReauth(
  router: RouterLike,
  error?: ApiError,
): Promise<void> {
  router.replace(buildReauthUrl(error));
  void clearAuthSession();
}

function clearRetryTimer(retryTimerRef: RetryTimerRef): void {
  if (!retryTimerRef.current) {
    return;
  }

  clearTimeout(retryTimerRef.current);
  retryTimerRef.current = null;
}

function shouldScheduleRetry(
  err: unknown,
  autoRetryEnabled: boolean,
  pollInterval: number | undefined,
  fetchOptions: FetchOptions | undefined,
): boolean {
  return (
    autoRetryEnabled &&
    ((fetchOptions?.fromRetry ?? false) || !fetchOptions?.silent) &&
    !pollInterval &&
    isRetryableError(err)
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

interface UseApiGetResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApiGet<T>(
  url: string | null,
  options?: QueryOptions,
): UseApiGetResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const getAccessToken = useAccessToken();
  const fetchIdRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRetryEnabled = options?.autoRetry ?? true;
  const pollInterval = options?.pollInterval;
  const retryDelayMs = options?.retryDelayMs ?? AUTO_RETRY_DELAY_MS;

  const fetchData = useCallback(
    async (signal: AbortSignal, fetchOptions?: FetchOptions) => {
      if (!url) {
        clearRetryTimer(retryTimerRef);
        setData((current) => (current === null ? current : null));
        setError((current) => (current === null ? current : null));
        setLoading((current) => (current ? false : current));
        return;
      }

      const id = ++fetchIdRef.current;
      if (!fetchOptions?.silent) {
        setLoading(true);
        setError(null);
      }

      try {
        const response = await apiGet<T>(url, getAccessToken, { signal });
        if (id === fetchIdRef.current) {
          setData(response.data);
          setError(null);
          clearRetryTimer(retryTimerRef);
        }
      } catch (err) {
        if (signal.aborted) return;
        /* v8 ignore next -- stale fetch race guard; exercised in concurrent scenarios but non-deterministic under StrictMode */
        if (id !== fetchIdRef.current) return;

        if (isUnauthorizedError(err)) {
          clearRetryTimer(retryTimerRef);
          if (fetchOptions?.silent) return;
          await redirectToReauth(router, err);
          return;
        }

        if (!fetchOptions?.silent) {
          setError(getErrorMessage(err));
        }

        if (shouldScheduleRetry(err, autoRetryEnabled, pollInterval, fetchOptions)) {
          scheduleRetry(retryTimerRef, retryDelayMs, () => {
            const controller = new AbortController();
            void fetchData(controller.signal, { silent: true, fromRetry: true });
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
    [autoRetryEnabled, getAccessToken, pollInterval, retryDelayMs, router, url],
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchData(controller.signal);

    return () => {
      controller.abort();
      clearRetryTimer(retryTimerRef);
    };
  }, [fetchData]);

  useEffect(() => {
    if (!pollInterval || !url) return;

    let pollController: AbortController | null = null;
    const id = setInterval(() => {
      pollController?.abort();
      pollController = new AbortController();
      void fetchData(pollController.signal, { silent: true });
    }, pollInterval);

    return () => {
      clearInterval(id);
      pollController?.abort();
    };
  }, [fetchData, pollInterval, url]);

  const refetch = useCallback(() => {
    const controller = new AbortController();
    void fetchData(controller.signal);
  }, [fetchData]);

  return { data, loading, error, refetch };
}

interface UseApiGetPaginatedResult<T> {
  data: T[];
  total: number;
  pagination: PaginationMeta | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApiGetPaginated<T>(
  url: string | null,
  page: number,
  limit: number,
  options?: QueryOptions,
): UseApiGetPaginatedResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const getAccessToken = useAccessToken();
  const fetchIdRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRetryEnabled = options?.autoRetry ?? true;
  const pollInterval = options?.pollInterval;
  const retryDelayMs = options?.retryDelayMs ?? AUTO_RETRY_DELAY_MS;
  const fullUrl = buildPaginatedUrl(url, page, limit);

  const fetchData = useCallback(
    async (signal: AbortSignal, fetchOptions?: FetchOptions) => {
      if (!fullUrl) {
        clearRetryTimer(retryTimerRef);
        setData((current) => (current.length === 0 ? current : []));
        setTotal((current) => (current === 0 ? current : 0));
        setPagination((current) => (current === null ? current : null));
        setError((current) => (current === null ? current : null));
        setLoading((current) => (current ? false : current));
        return;
      }

      const id = ++fetchIdRef.current;
      if (!fetchOptions?.silent) {
        setLoading(true);
        setError(null);
      }

      try {
        const response = await apiGetPaginated<T>(fullUrl, getAccessToken, {
          signal,
        });
        if (id === fetchIdRef.current) {
          setData(response.data);
          setTotal(response.pagination.total);
          setPagination(response.pagination);
          setError(null);
          clearRetryTimer(retryTimerRef);
        }
      } catch (err) {
        if (signal.aborted) return;
        /* v8 ignore next -- stale fetch race guard; exercised in concurrent scenarios but non-deterministic under StrictMode */
        if (id !== fetchIdRef.current) return;

        if (isUnauthorizedError(err)) {
          clearRetryTimer(retryTimerRef);
          if (fetchOptions?.silent) return;
          await redirectToReauth(router, err);
          return;
        }

        if (!fetchOptions?.silent) {
          setError(getErrorMessage(err));
        }

        if (shouldScheduleRetry(err, autoRetryEnabled, pollInterval, fetchOptions)) {
          scheduleRetry(retryTimerRef, retryDelayMs, () => {
            const controller = new AbortController();
            void fetchData(controller.signal, { silent: true, fromRetry: true });
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
    [autoRetryEnabled, fullUrl, getAccessToken, pollInterval, retryDelayMs, router],
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchData(controller.signal);

    return () => {
      controller.abort();
      clearRetryTimer(retryTimerRef);
    };
  }, [fetchData]);

  useEffect(() => {
    if (!pollInterval || !fullUrl) return;

    let pollController: AbortController | null = null;
    const id = setInterval(() => {
      pollController?.abort();
      pollController = new AbortController();
      void fetchData(pollController.signal, { silent: true });
    }, pollInterval);

    return () => {
      clearInterval(id);
      pollController?.abort();
    };
  }, [fetchData, fullUrl, pollInterval]);

  const refetch = useCallback(() => {
    const controller = new AbortController();
    void fetchData(controller.signal);
  }, [fetchData]);

  return { data, total, pagination, loading, error, refetch };
}

interface UseApiMutationResult<TReq, TRes> {
  mutate: (body: TReq) => Promise<TRes | null>;
  loading: boolean;
  error: string | null;
  data: TRes | null;
  reset: () => void;
}

function useApiMutation<TReq, TRes>(
  url: string,
  method: "POST" | "PATCH",
): UseApiMutationResult<TReq, TRes> {
  const [data, setData] = useState<TRes | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const getAccessToken = useAccessToken();
  const abortRef = useRef<AbortController | null>(null);
  const urlRef = useRef(url);
  urlRef.current = url;

  const mutate = useCallback(
    async (body: TReq): Promise<TRes | null> => {
      /* v8 ignore next */
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const request =
          method === "POST"
            ? apiPost<TRes>(urlRef.current, body, getAccessToken, {
                signal: controller.signal,
              })
            : apiPatch<TRes>(urlRef.current, body, getAccessToken, {
                signal: controller.signal,
              });
        const response = await request;
        setData(response.data);
        return response.data;
      } catch (err) {
        /* v8 ignore next */
        if (controller.signal.aborted) return null;

        if (isUnauthorizedError(err)) {
          await redirectToReauth(router, err);
          return null;
        }

        setError(getErrorMessage(err));
        return null;
        /* v8 ignore next 4 */
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [getAccessToken, method, router],
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return { mutate, loading, error, data, reset };
}

export function useApiPost<TReq, TRes>(
  url: string,
): UseApiMutationResult<TReq, TRes> {
  return useApiMutation<TReq, TRes>(url, "POST");
}

export function useApiPatch<TReq, TRes>(
  url: string,
): UseApiMutationResult<TReq, TRes> {
  return useApiMutation<TReq, TRes>(url, "PATCH");
}
