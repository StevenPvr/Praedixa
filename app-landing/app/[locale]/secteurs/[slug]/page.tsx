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
  return listSectorPages("fr").map((entry) => ({
    locale: "fr",
    slug: entry.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (locale !== "fr") return {};

  const entry = getSectorPageBySlug("fr", slug);
  if (!entry) return {};

  return buildLocaleMetadata({
    locale: "fr",
    paths: getSectorAlternatePaths(entry.id),
    title: entry.metaTitle,
    description: entry.metaDescription,
    ogTitle: entry.metaTitle,
    ogDescription: entry.metaDescription,
  });
}

export default async function SectorDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (locale !== "fr") notFound();

  const entry = getSectorPageBySlug("fr", slug);
  if (!entry) notFound();

  return <SectorPage locale="fr" entry={entry} />;
}
