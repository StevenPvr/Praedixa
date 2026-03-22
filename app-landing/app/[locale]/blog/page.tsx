import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogIndexPage } from "../../../components/blog/BlogIndexPage";
import { isProductionEnvironment } from "../../../lib/blog/config";
import {
  buildBlogIndexPath,
  getPaginatedBlogPosts,
  parseBlogListSearchParams,
} from "../../../lib/blog/posts";
import { type Locale, isValidLocale } from "../../../lib/i18n/config";
import {
  PRAEDIXA_SOCIAL_IMAGE_HEIGHT,
  PRAEDIXA_SOCIAL_IMAGE_URL,
  PRAEDIXA_SOCIAL_IMAGE_WIDTH,
} from "../../../lib/seo/entity";
import { absoluteUrl } from "../../../lib/seo/metadata";

interface BlogIndexRouteProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function buildBlogListSearch(page: number, tag?: string) {
  return {
    page,
    ...(tag !== undefined ? { tag } : {}),
  };
}

function buildBlogIndexMetadata(
  locale: Locale,
  tag?: string,
  page = 1,
): Metadata {
  const path = buildBlogIndexPath(locale, buildBlogListSearch(page, tag));
  const canonical = absoluteUrl(path);
  const isFilteredVariant = Boolean(tag) || page > 1;
  const title =
    locale === "fr"
      ? tag
        ? `Blog Praedixa | ${tag}`
        : "Blog Praedixa | Décision opérationnelle et performance"
      : tag
        ? `Praedixa Blog | ${tag}`
        : "Praedixa Blog | Operational decision-making";
  const description =
    locale === "fr"
      ? "Articles sur la décision opérationnelle multi-sites, la preuve d'impact et la gouvernance des arbitrages Ops/Finance."
      : "Articles on multi-site operational decisions, impact proof, and Ops/Finance decision governance.";

  return {
    title,
    description,
    alternates: {
      canonical,
      ...(isFilteredVariant
        ? {}
        : {
            languages: {
              "fr-FR": absoluteUrl("/fr/blog"),
              en: absoluteUrl("/en/blog"),
              "x-default": absoluteUrl("/fr/blog"),
            },
          }),
    },
    robots: {
      index: !isFilteredVariant,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Praedixa",
      locale: locale === "fr" ? "fr_FR" : "en_US",
      alternateLocale: locale === "fr" ? "en_US" : "fr_FR",
      type: "website",
      images: [
        {
          url: PRAEDIXA_SOCIAL_IMAGE_URL,
          width: PRAEDIXA_SOCIAL_IMAGE_WIDTH,
          height: PRAEDIXA_SOCIAL_IMAGE_HEIGHT,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [PRAEDIXA_SOCIAL_IMAGE_URL],
    },
  };
}

export async function generateMetadata({
  params,
  searchParams,
}: BlogIndexRouteProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isValidLocale(locale)) {
    return {};
  }

  const parsedSearchParams = parseBlogListSearchParams(await searchParams);
  return buildBlogIndexMetadata(
    locale,
    parsedSearchParams.tag,
    parsedSearchParams.page,
  );
}

export default async function BlogIndexRoute({
  params,
  searchParams,
}: BlogIndexRouteProps) {
  const { locale } = await params;
  if (!isValidLocale(locale)) {
    notFound();
  }

  const parsedSearchParams = parseBlogListSearchParams(await searchParams);
  const includeDrafts = !isProductionEnvironment();
  const result = getPaginatedBlogPosts(locale, parsedSearchParams, {
    includeDrafts,
  });

  if (parsedSearchParams.page > result.totalPages && result.totalPosts > 0) {
    notFound();
  }

  return (
    <BlogIndexPage
      locale={locale}
      search={{
        ...buildBlogListSearch(result.currentPage, parsedSearchParams.tag),
      }}
      result={result}
    />
  );
}
