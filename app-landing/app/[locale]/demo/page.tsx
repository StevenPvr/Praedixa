import type { Metadata } from "next";
import { DemoApp } from "@/components/demo/demo-app";
import { localizedSlugs } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { resolveLocale } from "@/lib/seo/knowledge";
import { buildLocaleMetadata, localePathMap } from "@/lib/seo/metadata";

const FR_PATH = `/fr/${localizedSlugs.demo.fr}`;
const EN_PATH = `/en/${localizedSlugs.demo.en}`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const dict = await getDictionary(locale);

  const metadata = buildLocaleMetadata({
    locale,
    paths: localePathMap(FR_PATH, EN_PATH),
    title: `Praedixa | ${dict.demo.title}`,
    description: dict.demo.subtitle,
    noindex: true,
  });

  return {
    ...metadata,
    robots: {
      index: false,
      follow: false,
      noarchive: true,
      nocache: true,
    },
  };
}

export default async function DemoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  const dict = await getDictionary(locale);

  return <DemoApp dict={dict} locale={locale} />;
}
