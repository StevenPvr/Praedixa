"use client";

import { useRouter } from "next/navigation";
import {
  buildReauthUrl,
  createApiHooks,
  type QueryOptions,
} from "@praedixa/api-hooks";
import { apiGet, apiGetPaginated, apiPost, apiPatch } from "@/lib/api/client";
import { clearAuthSession } from "@/lib/auth/client";

async function redirectToReauth(
  router: Pick<ReturnType<typeof useRouter>, "replace">,
  error?: { code?: string; requestId?: string },
): Promise<void> {
  router.replace(buildReauthUrl(error));
  void clearAuthSession();
}

const hooks = createApiHooks({
  useRouter,
  apiGet,
  apiGetPaginated,
  apiPost,
  apiPatch,
  onUnauthorized: redirectToReauth,
});

export const useApiGet = hooks.useApiGet;

export function useApiGetPaginated<T>(
  url: string | null,
  page: number,
  limit: number,
  options?: QueryOptions,
) {
  return hooks.useApiGetPaginated<T>(url, page, limit, options);
}

export const useApiPost = hooks.useApiPost;
export const useApiPatch = hooks.useApiPatch;
