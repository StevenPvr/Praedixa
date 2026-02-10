import Link from "next/link";
import type { Metadata } from "next";
import { siteConfig } from "../../lib/config/site";

export const metadata: Metadata = {
  title: "Politique de confidentialité - Praedixa",
  description:
    "Politique de confidentialité et protection des données Praedixa.",
  alternates: {
    canonical: "/confidentialite",
  },
};

export default function ConfidentialitePage() {
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
          Politique de confidentialité
        </h1>

        <p className="mb-8 text-sm text-gray-muted">
          Dernière mise à jour :{" "}
          {new Date().toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>

        {/* Content */}
        <div className="space-y-10 text-gray-secondary">
          <section>
            <h2 className="mb-4 text-xl font-bold text-charcoal">
              1. Responsable du traitement
            </h2>
            <p className="leading-relaxed">
              Le responsable du traitement des données collectées sur ce site
              est :<br />
              Praedixa
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
              2. Données collectées
            </h2>
            <div className="space-y-4 leading-relaxed">
              <p>
                <strong className="text-charcoal">
                  Via le formulaire "Entreprise Pilote" :
                </strong>
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li>Nom de l'entreprise</li>
                <li>Adresse email professionnelle</li>
                <li>Numéro de téléphone (optionnel)</li>
                <li>Tranche d'effectif</li>
                <li>Secteur d'activité</li>
              </ul>
              <p>
                <strong className="text-charcoal">Base légale :</strong>{" "}
                Consentement explicite (case à cocher lors de l'envoi du
                formulaire) et intérêt légitime pour le traitement des
                candidatures.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-charcoal">
              3. Finalités du traitement
            </h2>
            <p className="leading-relaxed">
              Les données collectées sont utilisées pour :
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-6">
              <li>Traiter votre candidature au programme Entreprise Pilote</li>
              <li>
                Vous contacter par email ou téléphone pour discuter de votre
                projet
              </li>
              <li>Vous informer de l'avancement du programme Praedixa</li>
              <li>Améliorer nos services en fonction de vos retours</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-charcoal">
              4. Durée de conservation
            </h2>
            <p className="leading-relaxed">
              Vos données sont conservées pendant une durée de 3 ans à compter
              de votre dernière interaction avec nous, sauf si vous demandez
              leur suppression avant ce délai. Les données des entreprises
              devenues clientes sont conservées pendant la durée de la relation
              commerciale.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-charcoal">
              5. Destinataires des données
            </h2>
            <div className="space-y-4 leading-relaxed">
              <p>
                Vos données sont accessibles uniquement à l'équipe Praedixa et
                aux prestataires techniques suivants :
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  <strong>Resend</strong> - Service d'envoi d'emails (pour les
                  confirmations de candidature)
                </li>
                <li>
                  <strong>Cloudflare</strong> - Hébergement des services web
                </li>
              </ul>
              <p>
                <strong className="text-charcoal">
                  Vos données ne sont jamais revendues ni partagées avec des
                  tiers à des fins commerciales ou publicitaires.
                </strong>
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-charcoal">
              6. Hébergement
            </h2>
            <p className="leading-relaxed">
              Les services web sont hébergés sur l'infrastructure Cloudflare.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-charcoal">
              7. Vos droits
            </h2>
            <div className="space-y-4 leading-relaxed">
              <p>
                Conformément au Règlement Général sur la Protection des Données
                (RGPD), vous disposez des droits suivants :
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  <strong>Droit d'accès :</strong> obtenir une copie de vos
                  données
                </li>
                <li>
                  <strong>Droit de rectification :</strong> corriger des données
                  inexactes
                </li>
                <li>
                  <strong>Droit à l'effacement :</strong> demander la
                  suppression de vos données
                </li>
                <li>
                  <strong>Droit à la portabilité :</strong> recevoir vos données
                  dans un format structuré
                </li>
                <li>
                  <strong>Droit d'opposition :</strong> vous opposer au
                  traitement de vos données
                </li>
                <li>
                  <strong>Droit de retrait du consentement :</strong> retirer
                  votre consentement à tout moment
                </li>
              </ul>
              <p>
                Pour exercer ces droits, contactez-nous à :{" "}
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="text-amber-600 hover:underline"
                >
                  {siteConfig.contact.email}
                </a>
              </p>
              <p>
                Vous pouvez également introduire une réclamation auprès de la
                CNIL (Commission Nationale de l'Informatique et des Libertés) :{" "}
                <a
                  href="https://www.cnil.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-600 hover:underline"
                >
                  www.cnil.fr
                </a>
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-charcoal">8. Cookies</h2>
            <p className="leading-relaxed">
              Ce site n'utilise pas de cookies de suivi ou de publicité. Seuls
              des cookies techniques essentiels au fonctionnement du site
              peuvent être utilisés (aucun cookie tiers, aucun tracking).
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-charcoal">
              9. Sécurité
            </h2>
            <p className="leading-relaxed">
              Nous mettons en œuvre des mesures techniques et organisationnelles
              appropriées pour protéger vos données contre tout accès non
              autorisé, modification, divulgation ou destruction. Les
              communications sont chiffrées via HTTPS.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-charcoal">
              10. Modification de la politique
            </h2>
            <p className="leading-relaxed">
              Cette politique de confidentialité peut être mise à jour à tout
              moment. La date de dernière mise à jour est indiquée en haut de
              cette page. Nous vous encourageons à consulter régulièrement cette
              page.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-charcoal">
              11. Contact
            </h2>
            <p className="leading-relaxed">
              Pour toute question relative à cette politique de confidentialité
              ou au traitement de vos données :{" "}
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="text-amber-600 hover:underline"
              >
                {siteConfig.contact.email}
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
