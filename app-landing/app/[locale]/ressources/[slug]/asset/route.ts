import { getSerpAssetDownloadBySlug } from "../../../../../lib/content/serp-asset-downloads";
import { isValidLocale } from "../../../../../lib/i18n/config";
import { logSecurityEvent } from "../../../../../lib/security/audit-log";
import { verifySignedResourceAssetRequest } from "../../../../../lib/security/signed-resource-asset";

interface RouteContext {
  params: Promise<{ locale: string; slug: string }>;
}

function buildNotFoundResponse(): Response {
  return new Response("Not found", {
    status: 404,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
    },
  });
}

export async function GET(request: Request, context: RouteContext) {
  const { locale, slug } = await context.params;

  if (!isValidLocale(locale) || locale !== "fr") {
    return buildNotFoundResponse();
  }

  const asset = getSerpAssetDownloadBySlug(slug);
  if (!asset) {
    return buildNotFoundResponse();
  }

  const url = new URL(request.url);
  const verification = verifySignedResourceAssetRequest({
    locale,
    slug,
    expiresAt: url.searchParams.get("exp"),
    signature: url.searchParams.get("sig"),
  });
  if (!verification.valid) {
    logSecurityEvent("resource_asset.signature_rejected", {
      path: url.pathname,
      reason: verification.reason,
      slug,
    });
    return buildNotFoundResponse();
  }

  return new Response(asset.body, {
    status: 200,
    headers: {
      "Content-Type": asset.contentType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
        asset.fileName,
      )}`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
    },
  });
}
