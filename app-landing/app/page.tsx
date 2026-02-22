import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { detectRequestLocale } from "../lib/i18n/request-locale";

export const metadata: Metadata = {
  title: "Praedixa",
  description: "Praedixa official website in French and English.",
  alternates: {
    canonical: "/",
    languages: {
      "fr-FR": "/fr",
      en: "/en",
      "x-default": "/en",
    },
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootPage() {
  const requestHeaders = await headers();
  const locale = detectRequestLocale(requestHeaders);
  redirect(`/${locale}`);
}
