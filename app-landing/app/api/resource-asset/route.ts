import { NextResponse } from "next/server";
import { getClientIp } from "../../../lib/api/deployment-request/rate-limit";
import { getSerpAssetDownloadBySlug } from "../../../lib/content/serp-asset-downloads";
import { isValidLocale } from "../../../lib/i18n/config";
import {
  logSecurityEvent,
  redactIpForLogs,
} from "../../../lib/security/audit-log";
import {
  hasTrustedFormOrigin,
  isCrossSiteRequest,
} from "../../../lib/security/request-origin";
import {
  consumeSecurityRateLimit,
  SecurityStoreUnavailableError,
} from "../../../lib/security/security-store";
import { buildSignedResourceAssetHref } from "../../../lib/security/signed-resource-asset";

const MAX_DOWNLOAD_GATEWAY_REQUESTS = 8;
const DOWNLOAD_GATEWAY_WINDOW_MS = 60_000;

function buildNoStoreHeaders(): Headers {
  return new Headers({
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
  });
}

function jsonError(message: string, status: number): Response {
  return NextResponse.json(
    { error: message },
    { status, headers: buildNoStoreHeaders() },
  );
}

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const ip = getClientIp(request);
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale");
  const slug = url.searchParams.get("slug");

  if (locale == null || slug == null) {
    return jsonError("Asset request is incomplete.", 400);
  }

  if (
    isCrossSiteRequest(request) ||
    !hasTrustedFormOrigin(request, { requireSource: true })
  ) {
    logSecurityEvent("resource_asset.origin_rejected", {
      requestId,
      ip: redactIpForLogs(ip),
      locale,
      slug,
    });
    return jsonError("Origine de requete non autorisee.", 403);
  }

  try {
    const rateLimitResult = await consumeSecurityRateLimit(request, {
      scope: "landing-resource-asset",
      max: MAX_DOWNLOAD_GATEWAY_REQUESTS,
      windowMs: DOWNLOAD_GATEWAY_WINDOW_MS,
    });

    if (!rateLimitResult.allowed) {
      logSecurityEvent("resource_asset.rate_limited", {
        requestId,
        ip: redactIpForLogs(ip),
        locale,
        slug,
      });
      const headers = buildNoStoreHeaders();
      headers.set("Retry-After", String(rateLimitResult.retryAfterSeconds));
      return NextResponse.json(
        { error: "Trop de requetes. Veuillez reessayer plus tard." },
        { status: 429, headers },
      );
    }
  } catch (error) {
    if (!(error instanceof SecurityStoreUnavailableError)) {
      throw error;
    }

    logSecurityEvent("resource_asset.security_store_unavailable", {
      requestId,
      ip: redactIpForLogs(ip),
    });
    return jsonError("Service temporairement indisponible.", 503);
  }

  if (!isValidLocale(locale) || locale !== "fr") {
    return jsonError("Not found.", 404);
  }

  if (!getSerpAssetDownloadBySlug(slug)) {
    return jsonError("Not found.", 404);
  }

  const signedHref = buildSignedResourceAssetHref(locale, slug);
  if (!signedHref) {
    logSecurityEvent("resource_asset.signing_unavailable", {
      requestId,
      ip: redactIpForLogs(ip),
      locale,
      slug,
    });
    return jsonError("Asset signing unavailable.", 503);
  }

  const response = NextResponse.redirect(new URL(signedHref, request.url), 307);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set(
    "X-Robots-Tag",
    "noindex, nofollow, noarchive, nosnippet",
  );
  return response;
}
