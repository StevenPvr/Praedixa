import { permanentRedirect } from "next/navigation";
import { localizedSlugs } from "../../../lib/i18n/config";
import { KnowledgePage } from "../../../components/pages/KnowledgePage";
import {
  generateKnowledgeMetadata,
  resolveLocale,
} from "../../../lib/seo/knowledge";

const PAGE_KEY = "bofuQsr" as const;
const CURRENT_SLUG = "praedixa-quick-service-restaurants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return generateKnowledgeMetadata(params, PAGE_KEY);
}

export default async function KnowledgeRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  const expectedSlug = localizedSlugs[PAGE_KEY][locale];

  if (expectedSlug !== CURRENT_SLUG) {
    permanentRedirect(`/${locale}/${expectedSlug}`);
  }

  return <KnowledgePage locale={locale} pageKey={PAGE_KEY} />;
}
