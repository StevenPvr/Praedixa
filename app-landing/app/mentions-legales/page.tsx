import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Mentions légales - Praedixa",
  description: "Mentions légales du site Praedixa.",
  alternates: {
    canonical: "/fr/mentions-legales",
  },
};

export default function MentionsLegalesPage() {
  permanentRedirect("/fr/mentions-legales");
}
