import Link from "next/link";
import type { Metadata } from "next";
import { siteConfig } from "../../lib/config/site";

export const metadata: Metadata = {
  title: "Mentions légales - Praedixa",
  description: "Mentions légales du site Praedixa.",
  alternates: {
    canonical: "/mentions-legales",
  },
};

export default function MentionsLegalesPage() {
  return (
    <main className="min-h-screen bg-cream py-24">
      <div className="mx-auto max-w-3xl px-6">
        {/* Back Link */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-gray-secondary transition-colors hover:text-charcoal"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Retour à l'accueil
        </Link>

        {/* Title */}
        <h1 className="mb-12 font-serif text-4xl text-charcoal">
          Mentions légales
        </h1>

        {/* Content */}
        <div className="space-y-10 text-gray-secondary">
          <section>
            <h2 className="mb-4 text-xl font-bold text-charcoal">Éditeur</h2>
            <p className="leading-relaxed">
              Praedixa
              <br />
              Entreprise en cours d&apos;immatriculation — France
              <br />
              Contact :{" "}
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="text-amber-600 hover:underline"
              >
                {siteConfig.contact.email}
              </a>
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-charcoal">
              Hébergement
            </h2>
            <p className="leading-relaxed">
              Cloudflare, Inc.
              <br />
              101 Townsend St, San Francisco, CA 94107, USA
              <br />
              <a
                href="https://www.cloudflare.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-600 hover:underline"
              >
                https://www.cloudflare.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-charcoal">
              Propriété intellectuelle
            </h2>
            <p className="leading-relaxed">
              L'ensemble du contenu de ce site (textes, images, graphismes,
              logo, icônes, etc.) est protégé par le droit d'auteur. Toute
              reproduction, représentation, modification, publication,
              adaptation de tout ou partie des éléments du site, quel que soit
              le moyen ou le procédé utilisé, est interdite sauf autorisation
              écrite préalable.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-charcoal">
              Cookies et traceurs
            </h2>
            <p className="leading-relaxed">
              Ce site n'utilise pas de cookies de suivi ou de publicité. Seuls
              des cookies techniques essentiels au fonctionnement du site
              peuvent être utilisés.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
