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

export function useApiGet<T>(url: string | null): UseApiGetResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const getAccessToken = useAccessToken();
  const fetchIdRef = useRef(0);

  const fetchData = useCallback(
    async (signal: AbortSignal) => {
      if (!url) {
        setLoading(false);
        return;
      }

      const id = ++fetchIdRef.current;
      setLoading(true);
      setError(null);

      try {
        const response = await apiGet<T>(url, getAccessToken, { signal });
        if (id === fetchIdRef.current) {
          setData(response.data);
        }
      } catch (err) {
        if (signal.aborted) return;
        /* v8 ignore next -- stale fetch race guard */
        if (id !== fetchIdRef.current) return;

        if (err instanceof ApiError && err.status === 401) {
          await redirectToReauth(router);
          return;
        }

        setError(
          err instanceof ApiError
            ? err.message
            : "Une erreur inattendue est survenue",
        );
      } finally {
        if (id === fetchIdRef.current && !signal.aborted) {
          setLoading(false);
        }
      }
    },
    [url, getAccessToken, router],
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

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
): UseApiGetPaginatedResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const getAccessToken = useAccessToken();
  const fetchIdRef = useRef(0);

  const separator = url.includes("?") ? "&" : "?";
  const fullUrl = `${url}${separator}page=${page}&pageSize=${limit}`;

  const fetchData = useCallback(
    async (signal: AbortSignal) => {
      const id = ++fetchIdRef.current;
      setLoading(true);
      setError(null);

      try {
        const response = await apiGetPaginated<T>(fullUrl, getAccessToken, {
          signal,
        });
        if (id === fetchIdRef.current) {
          setData(response.data);
          setTotal(response.pagination.total);
          setPagination(response.pagination);
        }
      } catch (err) {
        if (signal.aborted) return;
        /* v8 ignore next -- stale fetch race guard */
        if (id !== fetchIdRef.current) return;

        if (err instanceof ApiError && err.status === 401) {
          await redirectToReauth(router);
          return;
        }

        setError(
          err instanceof ApiError
            ? err.message
            : "Une erreur inattendue est survenue",
        );
      } finally {
        if (id === fetchIdRef.current && !signal.aborted) {
          setLoading(false);
        }
      }
    },
    [fullUrl, getAccessToken, router],
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

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

export function useApiPost<TReq, TRes>(
  url: string,
): UseApiMutationResult<TReq, TRes> {
  const [data, setData] = useState<TRes | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const getAccessToken = useAccessToken();
  const abortRef = useRef<AbortController | null>(null);

  const mutate = useCallback(
    async (body: TReq): Promise<TRes | null> => {
      /* v8 ignore next */
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const response = await apiPost<TRes>(url, body, getAccessToken, {
          signal: controller.signal,
        });
        setData(response.data);
        return response.data;
      } catch (err) {
        /* v8 ignore next */
        if (controller.signal.aborted) return null;

        if (err instanceof ApiError && err.status === 401) {
          await redirectToReauth(router);
          return null;
        }

        const message =
          err instanceof ApiError
            ? err.message
            : "Une erreur inattendue est survenue";
        setError(message);
        return null;
        /* v8 ignore next 4 */
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [url, getAccessToken, router],
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return { mutate, loading, error, data, reset };
}

export function useApiPatch<TReq, TRes>(
  url: string,
): UseApiMutationResult<TReq, TRes> {
  const [data, setData] = useState<TRes | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const getAccessToken = useAccessToken();
  const abortRef = useRef<AbortController | null>(null);

  const mutate = useCallback(
    async (body: TReq): Promise<TRes | null> => {
      /* v8 ignore next */
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const response = await apiPatch<TRes>(url, body, getAccessToken, {
          signal: controller.signal,
        });
        setData(response.data);
        return response.data;
      } catch (err) {
        /* v8 ignore next */
        if (controller.signal.aborted) return null;

        if (err instanceof ApiError && err.status === 401) {
          await redirectToReauth(router);
          return null;
        }

        const message =
          err instanceof ApiError
            ? err.message
            : "Une erreur inattendue est survenue";
        setError(message);
        return null;
        /* v8 ignore next 4 */
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [url, getAccessToken, router],
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return { mutate, loading, error, data, reset };
}
