import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { DecisionProofPage } from "../../../components/pages/DecisionProofPage";
import { localizedSlugs } from "../../../lib/i18n/config";
import { getValuePropContent } from "../../../lib/content/value-prop";
import { resolveLocale } from "../../../lib/seo/knowledge";
import { buildLocaleMetadata, localePathMap } from "../../../lib/seo/metadata";

const FR_PATH = `/fr/${localizedSlugs.decisionLogProof.fr}`;
const EN_PATH = `/en/${localizedSlugs.decisionLogProof.en}`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const content = getValuePropContent(locale);

  return buildLocaleMetadata({
    locale,
    paths: localePathMap(FR_PATH, EN_PATH),
    title: content.proofMeta.title,
    description: content.proofMeta.description,
    ogTitle: content.proofMeta.ogTitle,
    ogDescription: content.proofMeta.ogDescription,
  });
}

export default async function KnowledgeRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  const expectedSlug = localizedSlugs.decisionLogProof[locale];

  if (expectedSlug !== "decision-log-preuve-roi") {
    permanentRedirect("/" + locale + "/" + expectedSlug);
  }

  return <DecisionProofPage locale={locale} />;
}
