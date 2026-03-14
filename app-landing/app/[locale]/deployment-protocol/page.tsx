import { notFound, permanentRedirect } from "next/navigation";
import {
  getLocalizedPath,
  isValidLocale,
  localizedSlugs,
} from "../../../lib/i18n/config";

export default async function DeploymentProtocolPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  if (localizedSlugs.deploymentProtocol[locale] !== "deployment-protocol") {
    notFound();
  }

  permanentRedirect(getLocalizedPath(locale, "services"));
}
