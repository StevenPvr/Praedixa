"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

async function redirectToReauth(router: RouterLike): Promise<void> {
  await clearAuthSession();
  router.replace("/login?reauth=1");
}

interface UseApiGetResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApiGet<T>(
  url: string | null,
  options?: { pollInterval?: number; autoRetry?: boolean; retryDelayMs?: number },
): UseApiGetResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const getAccessToken = useAccessToken();
  const fetchIdRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRetryEnabled = options?.autoRetry ?? true;
  const retryDelayMs = options?.retryDelayMs ?? AUTO_RETRY_DELAY_MS;

  const fetchData = useCallback(
    async (
      signal: AbortSignal,
      fetchOptions?: { silent?: boolean; fromRetry?: boolean },
    ) => {
      if (!url) {
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
          retryTimerRef.current = null;
        }
        setLoading(false);
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
          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
          }
        }
      } catch (err) {
        if (signal.aborted) return;
        /* v8 ignore next -- stale fetch race guard; exercised in concurrent scenarios but non-deterministic under StrictMode */
        if (id !== fetchIdRef.current) return;

        if (err instanceof ApiError && err.status === 401) {
          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
          }
          if (fetchOptions?.silent) return;
          await redirectToReauth(router);
          return;
        }

        if (!fetchOptions?.silent) {
          setError(err instanceof ApiError ? err.message : UNEXPECTED_ERROR);
        }

        if (
          autoRetryEnabled &&
          ((fetchOptions?.fromRetry ?? false) || !fetchOptions?.silent) &&
          !options?.pollInterval &&
          isRetryableError(err)
        ) {
          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
          }
          retryTimerRef.current = setTimeout(() => {
            const controller = new AbortController();
            void fetchData(controller.signal, { silent: true, fromRetry: true });
          }, retryDelayMs);
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
      getAccessToken,
      options?.pollInterval,
      retryDelayMs,
      router,
      url,
    ],
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchData(controller.signal);
    return () => {
      controller.abort();
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [fetchData]);

  // Polling: silently refetch at a regular interval (skip cycle on 401)
  useEffect(() => {
    const interval = options?.pollInterval;
    if (!interval || !url) return;
    let pollController: AbortController | null = null;
    const id = setInterval(() => {
      pollController?.abort();
      pollController = new AbortController();
      void fetchData(pollController.signal, { silent: true });
    }, interval);
    return () => {
      clearInterval(id);
      pollController?.abort();
    };
  }, [options?.pollInterval, url, fetchData]);

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
  url: string,
  page: number,
  limit: number,
  options?: { pollInterval?: number; autoRetry?: boolean; retryDelayMs?: number },
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
  const retryDelayMs = options?.retryDelayMs ?? AUTO_RETRY_DELAY_MS;

  const separator = url.includes("?") ? "&" : "?";
  const fullUrl = `${url}${separator}page=${page}&page_size=${limit}`;

  const fetchData = useCallback(
    async (
      signal: AbortSignal,
      fetchOptions?: { silent?: boolean; fromRetry?: boolean },
    ) => {
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
          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
          }
        }
      } catch (err) {
        if (signal.aborted) return;
        /* v8 ignore next -- stale fetch race guard; exercised in concurrent scenarios but non-deterministic under StrictMode */
        if (id !== fetchIdRef.current) return;

        if (err instanceof ApiError && err.status === 401) {
          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
          }
          if (fetchOptions?.silent) return;
          await redirectToReauth(router);
          return;
        }

        if (!fetchOptions?.silent) {
          setError(err instanceof ApiError ? err.message : UNEXPECTED_ERROR);
        }

        if (
          autoRetryEnabled &&
          ((fetchOptions?.fromRetry ?? false) || !fetchOptions?.silent) &&
          !options?.pollInterval &&
          isRetryableError(err)
        ) {
          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
          }
          retryTimerRef.current = setTimeout(() => {
            const controller = new AbortController();
            void fetchData(controller.signal, {
              silent: true,
              fromRetry: true,
            });
          }, retryDelayMs);
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
      getAccessToken,
      options?.pollInterval,
      retryDelayMs,
      router,
    ],
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchData(controller.signal);
    return () => {
      controller.abort();
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [fetchData]);

  useEffect(() => {
    const interval = options?.pollInterval;
    if (!interval) return;
    let pollController: AbortController | null = null;
    const id = setInterval(() => {
      pollController?.abort();
      pollController = new AbortController();
      void fetchData(pollController.signal, { silent: true });
    }, interval);
    return () => {
      clearInterval(id);
      pollController?.abort();
    };
  }, [options?.pollInterval, fetchData]);

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

        if (err instanceof ApiError && err.status === 401) {
          await redirectToReauth(router);
          return null;
        }

        setError(err instanceof ApiError ? err.message : UNEXPECTED_ERROR);
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
