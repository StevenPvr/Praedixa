import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation - Praedixa",
  description: "Conditions générales d'utilisation du site Praedixa.",
  alternates: {
    canonical: "/fr/cgu",
  },
};

export default function CGUPage() {
  permanentRedirect("/fr/cgu");
}
