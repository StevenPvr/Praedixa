import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectorPage } from "../../../../components/pages/SectorPage";
import {
  getSectorAlternatePaths,
  getSectorPageBySlug,
  listSectorPages,
} from "../../../../lib/content/sector-pages";
import { buildLocaleMetadata } from "../../../../lib/seo/metadata";

export async function generateStaticParams() {
  return listSectorPages("en").map((entry) => ({
    locale: "en",
    slug: entry.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (locale !== "en") return {};

  const entry = getSectorPageBySlug("en", slug);
  if (!entry) return {};

  return buildLocaleMetadata({
    locale: "en",
    paths: getSectorAlternatePaths(entry.id),
    title: entry.metaTitle,
    description: entry.metaDescription,
    ogTitle: entry.metaTitle,
    ogDescription: entry.metaDescription,
  });
}

export default async function IndustryDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (locale !== "en") notFound();

  const entry = getSectorPageBySlug("en", slug);
  if (!entry) notFound();

  return <SectorPage locale="en" entry={entry} />;
}
