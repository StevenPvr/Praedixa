import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Politique de confidentialité - Praedixa",
  description: "Politique de confidentialité de Praedixa.",
  alternates: {
    canonical: "/fr/confidentialite",
  },
};

export default function ConfidentialitePage() {
  permanentRedirect("/fr/confidentialite");
}
