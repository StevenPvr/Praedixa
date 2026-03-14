import { permanentRedirect } from "next/navigation";
import {
  buildContactIntentHref,
  localizedSlugs,
} from "../../../lib/i18n/config";
import { resolveLocale } from "../../../lib/seo/knowledge";

export default async function DeploymentRequestPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  const expected = localizedSlugs.deployment[locale];

  if (expected !== "deploiement") {
    permanentRedirect(`/${locale}/${expected}`);
  }

  permanentRedirect(buildContactIntentHref(locale, "deployment"));
}
