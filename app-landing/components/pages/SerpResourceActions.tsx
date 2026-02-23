"use client";

import Link from "next/link";
import { ArrowUpRight, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { EVENTS, trackEvent } from "../../lib/analytics/events";
import type {
  SerpIntent,
  SerpResourceAsset,
} from "../../lib/content/serp-resources-fr";
import type { Locale } from "../../lib/i18n/config";

interface SerpResourceActionsProps {
  locale: Locale;
  slug: string;
  query: string;
  intent: SerpIntent;
  asset: SerpResourceAsset;
  assetHref: string;
  pilotHref: string;
}

function buildEventParams({
  locale,
  slug,
  query,
  intent,
  assetType,
}: {
  locale: Locale;
  slug: string;
  query: string;
  intent: SerpIntent;
  assetType: SerpResourceAsset["type"];
}) {
  return {
    source: "seo_resource",
    locale,
    seo_slug: slug,
    seo_query: query,
    seo_intent: intent,
    asset_type: assetType,
  };
}

export function SerpResourceActions({
  locale,
  slug,
  query,
  intent,
  asset,
  assetHref,
  pilotHref,
}: SerpResourceActionsProps) {
  const eventParams = buildEventParams({
    locale,
    slug,
    query,
    intent,
    assetType: asset.type,
  });

  function handleAssetDownload() {
    trackEvent(EVENTS.SEO_RESOURCE_ASSET_DOWNLOAD, eventParams);
  }

  function handlePilotClick() {
    trackEvent(EVENTS.SEO_RESOURCE_PILOT_CTA_CLICK, eventParams);
  }

  return (
    <div className="mt-4 flex flex-wrap gap-3">
      <Link href={pilotHref} className="btn-primary" onClick={handlePilotClick}>
        Demander un pilote prevision effectifs
        <ArrowUpRight size={15} weight="bold" />
      </Link>
      <a
        href={assetHref}
        className="btn-secondary capitalize"
        onClick={handleAssetDownload}
      >
        <DownloadSimple size={15} weight="bold" />
        Telecharger asset ({asset.type})
      </a>
    </div>
  );
}
