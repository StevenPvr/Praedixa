import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { SerpResourcePage } from "../../../../components/pages/SerpResourcePage";
import {
  getSerpResourceBySlug,
  getSerpResourceSlugs,
} from "../../../../lib/content/serp-resources-fr";
import { isValidLocale } from "../../../../lib/i18n/config";
import { absoluteUrl } from "../../../../lib/seo/metadata";

interface RouteParams {
  locale: string;
  slug: string;
}

function buildPageMetadata(
  slug: string,
  title: string,
  description: string,
): Metadata {
  const canonical = absoluteUrl(`/fr/ressources/${slug}`);
  return {
    title: `Praedixa | ${title}`,
    description,
    alternates: {
      canonical,
      languages: {
        "fr-FR": canonical,
        "x-default": canonical,
      },
    },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Praedixa",
      locale: "fr_FR",
      type: "article",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-image.png"],
    },
  };
}

export function generateStaticParams() {
  return getSerpResourceSlugs().map((slug) => ({ locale: "fr", slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isValidLocale(locale)) return {};

  const resource = getSerpResourceBySlug(slug);
  if (!resource) return {};

  if (locale !== "fr") {
    return { robots: { index: false, follow: false } };
  }

  return buildPageMetadata(slug, resource.title, resource.description);
}

export default async function SerpResourceRoute({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { locale, slug } = await params;
  if (!isValidLocale(locale)) notFound();

  const resource = getSerpResourceBySlug(slug);
  if (!resource) notFound();

  if (locale !== "fr") {
    permanentRedirect(`/fr/ressources/${slug}`);
  }

  return <SerpResourcePage locale="fr" entry={resource} />;
}
