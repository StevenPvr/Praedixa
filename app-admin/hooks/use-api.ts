"use client";

import { useRouter } from "next/navigation";
import {
  buildReauthUrl,
  createApiHooks,
  type AccessTokenGetter,
} from "@praedixa/api-hooks";
import { apiGet, apiGetPaginated, apiPost, apiPatch } from "@/lib/api/client";
import { clearAuthSession, getValidAccessToken } from "@/lib/auth/client";

const getAccessToken: AccessTokenGetter = async () => getValidAccessToken();
const fallbackAccessToken: AccessTokenGetter = async () => null;

async function redirectToReauth(
  router: Pick<ReturnType<typeof useRouter>, "replace">,
  error?: { code?: string; requestId?: string },
): Promise<void> {
  router.replace(buildReauthUrl(error));
  await clearAuthSession();
}

const hooks = createApiHooks({
  useRouter,
  apiGet: (path, accessToken, options) =>
    apiGet(path, accessToken ?? fallbackAccessToken, options),
  apiGetPaginated: (path, accessToken, options) =>
    apiGetPaginated(path, accessToken ?? fallbackAccessToken, options),
  apiPost: (path, body, accessToken, options) =>
    apiPost(path, body, accessToken ?? fallbackAccessToken, options),
  apiPatch: (path, body, accessToken, options) =>
    apiPatch(path, body, accessToken ?? fallbackAccessToken, options),
  getAccessToken,
  onUnauthorized: redirectToReauth,
});

export const useApiGet = hooks.useApiGet;
export const useApiGetPaginated = hooks.useApiGetPaginated;
export const useApiPost = hooks.useApiPost;
export const useApiPatch = hooks.useApiPatch;
