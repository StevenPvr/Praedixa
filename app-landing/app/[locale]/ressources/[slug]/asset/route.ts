import { getSerpAssetDownloadBySlug } from "../../../../../lib/content/serp-asset-downloads";
import { isValidLocale } from "../../../../../lib/i18n/config";

interface RouteContext {
  params:
    | Promise<{ locale: string; slug: string }>
    | { locale: string; slug: string };
}

export async function GET(_request: Request, context: RouteContext) {
  const { locale, slug } = await Promise.resolve(context.params);

  if (!isValidLocale(locale) || locale !== "fr") {
    return new Response("Not found", { status: 404 });
  }

  const asset = getSerpAssetDownloadBySlug(slug);
  if (!asset) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(asset.body, {
    status: 200,
    headers: {
      "Content-Type": asset.contentType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
        asset.fileName,
      )}`,
      "Cache-Control": "public, max-age=0, s-maxage=86400",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
