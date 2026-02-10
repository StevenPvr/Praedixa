import Link from "next/link";
import type { Metadata } from "next";
import { siteConfig } from "../../lib/config/site";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation - Praedixa",
  description:
    "Conditions générales d'utilisation du site et des services Praedixa.",
  alternates: {
    canonical: "/cgu",
  },
};

export default function CGUPage() {
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
          Conditions Générales d'Utilisation
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
          {/* 1. Objet */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-charcoal">1. Objet</h2>
            <p className="leading-relaxed">
              Les présentes Conditions Générales d'Utilisation (CGU) définissent
              les modalités d'accès et d'utilisation du site praedixa.com, de la
              plateforme Praedixa et du programme "Entreprise Pilote". En
              accédant au Service, le Client accepte sans réserve les présentes
              CGU.
            </p>
          </section>

          {/* 2. Définitions */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-charcoal">
              2. Définitions
            </h2>
            <ul className="list-disc space-y-3 pl-6 leading-relaxed">
              <li>
                <strong className="text-charcoal">Service :</strong> La
                plateforme Praedixa de pilotage de la couverture terrain
                (capacité vs charge) et d&apos;anticipation de la
                sous-couverture, accessible via le site praedixa.com, incluant
                l&apos;ensemble des fonctionnalités proposées.
              </li>
              <li>
                <strong className="text-charcoal">Client :</strong> Toute
                personne morale (entreprise, association, collectivité) ayant
                souscrit au Service ou participant au programme Entreprise
                Pilote.
              </li>
              <li>
                <strong className="text-charcoal">Utilisateur :</strong> Toute
                personne physique autorisée par le Client à utiliser le Service
                pour son compte.
              </li>
              <li>
                <strong className="text-charcoal">Données Client :</strong>{" "}
                L'ensemble des données importées, saisies ou générées par le
                Client et ses Utilisateurs dans le cadre de l'utilisation du
                Service.
              </li>
              <li>
                <strong className="text-charcoal">Praedixa :</strong> La société
                éditrice du Service, dont les coordonnées figurent dans les{" "}
                <Link
                  href="/mentions-legales"
                  className="text-amber-600 hover:underline"
                >
                  mentions légales
                </Link>
                .
              </li>
            </ul>
          </section>

          {/* 3. Programme Entreprise Pilote */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-charcoal">
              3. Programme Entreprise Pilote
            </h2>
            <div className="space-y-4 leading-relaxed">
              <p>
                Le programme "Entreprise Pilote" permet aux entreprises
                sélectionnées de tester Praedixa en avant-première et de
                bénéficier d'un rabais exclusif lors du déploiement du Service.
              </p>
              <p>
                <strong className="text-charcoal">
                  Avantages du programme :
                </strong>
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li>Accès prioritaire à la plateforme</li>
                <li>Rabais exclusif au déploiement</li>
                <li>Accompagnement personnalisé</li>
                <li>Participation à la co-construction des fonctionnalités</li>
              </ul>
              <p>
                <strong className="text-charcoal">
                  Engagements de l'entreprise pilote :
                </strong>
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  Fournir des retours réguliers sur l'utilisation du produit
                </li>
                <li>
                  Participer à des sessions de feedback (environ 1h par mois)
                </li>
                <li>
                  Autoriser Praedixa à utiliser le nom de l'entreprise comme
                  référence (avec accord préalable écrit)
                </li>
              </ul>
            </div>
          </section>

          {/* 4. Accès au Service */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-charcoal">
              4. Accès au Service
            </h2>
            <div className="space-y-4 leading-relaxed">
              <p>
                <strong className="text-charcoal">Éligibilité :</strong> Le
                Service est exclusivement destiné aux professionnels (B2B). Le
                Client garantit agir dans le cadre de son activité
                professionnelle.
              </p>
              <p>
                <strong className="text-charcoal">Compte utilisateur :</strong>{" "}
                Le Client est responsable de la confidentialité des identifiants
                de connexion de ses Utilisateurs et de toute activité réalisée
                via ces comptes.
              </p>
              <p>
                <strong className="text-charcoal">Usages interdits :</strong> Il
                est strictement interdit de :
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  Utiliser le Service à des fins illicites ou contraires aux
                  présentes CGU
                </li>
                <li>
                  Tenter d'accéder aux données d'autres Clients ou de contourner
                  les mesures de sécurité
                </li>
                <li>
                  Revendre, sous-licencier ou mettre à disposition le Service à
                  des tiers
                </li>
                <li>
                  Procéder à de l'ingénierie inverse ou tenter d'extraire le
                  code source
                </li>
                <li>
                  Surcharger intentionnellement l'infrastructure du Service
                </li>
              </ul>
            </div>
          </section>

          {/* 5. Collecte et utilisation des données */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-charcoal">
              5. Collecte et utilisation des données
            </h2>
            <div className="space-y-4 leading-relaxed">
              <p>
                Lors de votre candidature au programme Entreprise Pilote, nous
                collectons :
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li>Le nom de votre entreprise</li>
                <li>Votre adresse email professionnelle</li>
                <li>Votre numéro de téléphone (optionnel)</li>
                <li>La taille de votre entreprise (tranche d'effectif)</li>
                <li>Votre secteur d'activité</li>
              </ul>
              <p>Ces données sont utilisées exclusivement pour :</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>Évaluer votre candidature au programme pilote</li>
                <li>Vous contacter pour discuter de votre projet</li>
                <li>Vous informer de l'avancement du programme</li>
              </ul>
              <p>
                Vos données ne sont jamais revendues ni partagées avec des tiers
                à des fins commerciales. Consultez notre{" "}
                <Link
                  href="/confidentialite"
                  className="text-amber-600 hover:underline"
                >
                  politique de confidentialité
                </Link>{" "}
                pour plus de détails sur le traitement de vos données
                personnelles.
              </p>
            </div>
          </section>

          {/* 6. Disponibilité et maintenance */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-charcoal">
              6. Disponibilité et maintenance
            </h2>
            <div className="space-y-4 leading-relaxed">
              <p>
                <strong className="text-charcoal">
                  Objectif de disponibilité :
                </strong>{" "}
                Praedixa s'efforce de maintenir le Service accessible 24h/24 et
                7j/7, avec un objectif de disponibilité de 99,5% hors
                maintenances programmées.
              </p>
              <p>
                <strong className="text-charcoal">
                  Maintenances programmées :
                </strong>{" "}
                Les opérations de maintenance planifiées seront notifiées au
                Client avec un préavis raisonnable (minimum 48h sauf urgence) et
                seront effectuées, dans la mesure du possible, en dehors des
                heures ouvrées.
              </p>
              <p>
                <strong className="text-charcoal">Incidents :</strong> En cas
                d'incident majeur affectant la disponibilité du Service,
                Praedixa informera le Client dans les meilleurs délais et mettra
                en œuvre les moyens nécessaires pour rétablir le Service.
              </p>
              <p>
                <strong className="text-charcoal">Exclusions :</strong> Ne sont
                pas considérés comme des indisponibilités : les interruptions
                dues à des cas de force majeure, les dysfonctionnements du
                réseau Internet, ou les actions du Client ou de tiers non
                autorisées.
              </p>
            </div>
          </section>

          {/* 7. Sécurité */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-charcoal">
              7. Sécurité
            </h2>
            <div className="space-y-4 leading-relaxed">
              <p>
                <strong className="text-charcoal">Mesures techniques :</strong>{" "}
                Praedixa met en œuvre des mesures de sécurité conformes aux
                standards de l'industrie pour protéger les Données Client :
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li>Chiffrement des données en transit (HTTPS/TLS)</li>
                <li>Chiffrement des données au repos</li>
                <li>Authentification sécurisée des Utilisateurs</li>
                <li>Sauvegardes régulières et géographiquement distribuées</li>
                <li>Surveillance et détection des intrusions</li>
              </ul>
              <p>
                <strong className="text-charcoal">Hébergement :</strong> Les
                services web sont hébergés sur l'infrastructure Cloudflare.
              </p>
              <p>
                <strong className="text-charcoal">
                  Notification des incidents :
                </strong>{" "}
                En cas de violation de données personnelles susceptible
                d'engendrer un risque pour les droits et libertés des personnes
                concernées, Praedixa notifiera le Client dans un délai de 72
                heures conformément au RGPD.
              </p>
            </div>
          </section>

          {/* 8. Réversibilité des données */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-charcoal">
              8. Réversibilité des données
            </h2>
            <div className="space-y-4 leading-relaxed">
              <p>
                Conformément au Data Act européen, le Client dispose d'un droit
                de récupération de ses Données Client en fin de contrat.
              </p>
              <p>
                <strong className="text-charcoal">Formats d'export :</strong>{" "}
                Les données seront mises à disposition dans un format standard
                et réutilisable (CSV, JSON ou format équivalent documenté).
              </p>
              <p>
                <strong className="text-charcoal">Délai :</strong> Praedixa
                s'engage à mettre les données à disposition du Client dans un
                délai de 30 jours suivant la demande.
              </p>
              <p>
                <strong className="text-charcoal">Frais :</strong> Conformément
                au Data Act, aucun frais de transfert de données ne sera facturé
                jusqu'au 12 janvier 2027.
              </p>
              <p>
                <strong className="text-charcoal">Suppression :</strong> Après
                confirmation de la bonne réception des données par le Client et
                à l'expiration du délai de conservation légal, Praedixa
                procédera à la suppression définitive des Données Client de ses
                systèmes.
              </p>
            </div>
          </section>

          {/* 9. Confidentialité */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-charcoal">
              9. Confidentialité
            </h2>
            <div className="space-y-4 leading-relaxed">
              <p>
                Chaque partie s'engage à maintenir confidentielles les
                informations de l'autre partie auxquelles elle aurait accès dans
                le cadre de l'exécution des présentes CGU, notamment :
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li>Les Données Client</li>
                <li>Les informations techniques sur le Service</li>
                <li>Les conditions commerciales négociées</li>
                <li>
                  Toute information expressément désignée comme confidentielle
                </li>
              </ul>
              <p>
                Cette obligation de confidentialité perdure pendant toute la
                durée du contrat et pendant une période de trois (3) ans après
                son terme.
              </p>
              <p>
                <strong className="text-charcoal">Exceptions :</strong> Ne sont
                pas concernées les informations déjà publiques, légalement
                obtenues d'un tiers, ou dont la divulgation est requise par la
                loi ou une autorité compétente.
              </p>
            </div>
          </section>

          {/* 10. Propriété intellectuelle */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-charcoal">
              10. Propriété intellectuelle
            </h2>
            <div className="space-y-4 leading-relaxed">
              <p>
                L'ensemble des éléments du Service et du site (textes, images,
                logos, graphismes, logiciels, algorithmes, bases de données)
                sont la propriété exclusive de Praedixa ou de ses partenaires.
                Toute reproduction, représentation ou exploitation non autorisée
                est strictement interdite.
              </p>
              <p>
                Le Client conserve l'intégralité des droits de propriété
                intellectuelle sur ses Données Client. En utilisant le Service,
                le Client accorde à Praedixa une licence limitée d'utilisation
                de ces données aux seules fins d'exécution du Service.
              </p>
            </div>
          </section>

          {/* 11. Responsabilité */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-charcoal">
              11. Responsabilité
            </h2>
            <div className="space-y-4 leading-relaxed">
              <p>
                <strong className="text-charcoal">
                  Limitation de responsabilité :
                </strong>{" "}
                La responsabilité totale de Praedixa au titre des présentes CGU
                est limitée au montant des sommes effectivement versées par le
                Client au cours des douze (12) derniers mois précédant le fait
                générateur.
              </p>
              <p>
                <strong className="text-charcoal">
                  Exclusion des dommages indirects :
                </strong>{" "}
                Praedixa ne saurait être tenue responsable des dommages
                indirects, incluant notamment : perte de chiffre d'affaires,
                perte de données, perte d'opportunités commerciales, atteinte à
                l'image ou préjudice d'exploitation.
              </p>
              <p>
                <strong className="text-charcoal">Exceptions légales :</strong>{" "}
                Les limitations ci-dessus ne s'appliquent pas en cas de dol,
                faute lourde, ou atteinte aux personnes, conformément aux
                dispositions d'ordre public du droit français.
              </p>
              <p>
                <strong className="text-charcoal">
                  Obligations du Client :
                </strong>{" "}
                Le Client est seul responsable de l'utilisation du Service par
                ses Utilisateurs et des Données Client qu'il importe dans le
                Service.
              </p>
            </div>
          </section>

          {/* 12. Force majeure */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-charcoal">
              12. Force majeure
            </h2>
            <div className="space-y-4 leading-relaxed">
              <p>
                Aucune partie ne sera tenue responsable d'un manquement à ses
                obligations contractuelles si ce manquement résulte d'un cas de
                force majeure au sens de l'article 1218 du Code civil.
              </p>
              <p>
                Sont notamment considérés comme cas de force majeure : les
                catastrophes naturelles, les actes de guerre ou de terrorisme,
                les grèves générales, les épidémies, les pannes majeures de
                réseau Internet, ou toute décision gouvernementale empêchant
                l'exécution du contrat.
              </p>
              <p>
                En cas de force majeure d'une durée supérieure à trois (3) mois,
                chaque partie pourra résilier le contrat sans indemnité, sous
                réserve d'un préavis écrit de quinze (15) jours.
              </p>
            </div>
          </section>

          {/* 13. Résiliation */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-charcoal">
              13. Résiliation
            </h2>
            <div className="space-y-4 leading-relaxed">
              <p>
                <strong className="text-charcoal">
                  Résiliation par le Client :
                </strong>{" "}
                Le Client peut résilier son abonnement à tout moment, avec un
                préavis de trente (30) jours avant la fin de la période de
                facturation en cours.
              </p>
              <p>
                <strong className="text-charcoal">
                  Résiliation par Praedixa :
                </strong>{" "}
                Praedixa peut suspendre ou résilier l'accès au Service en cas de
                manquement grave du Client à ses obligations (notamment
                non-paiement, usage abusif, violation des CGU), après mise en
                demeure restée sans effet pendant quinze (15) jours.
              </p>
              <p>
                <strong className="text-charcoal">
                  Effets de la résiliation :
                </strong>
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  L'accès au Service sera désactivé à la date effective de
                  résiliation
                </li>
                <li>
                  Le Client pourra récupérer ses données conformément à
                  l'article 8 (Réversibilité)
                </li>
                <li>
                  Les sommes déjà versées ne sont pas remboursables, sauf
                  résiliation pour faute de Praedixa
                </li>
              </ul>
            </div>
          </section>

          {/* 14. Modification des CGU */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-charcoal">
              14. Modification des CGU
            </h2>
            <div className="space-y-4 leading-relaxed">
              <p>
                Praedixa se réserve le droit de modifier les présentes CGU à
                tout moment. En cas de modification substantielle, le Client
                sera informé par email avec un préavis minimum de trente (30)
                jours avant l'entrée en vigueur des nouvelles conditions.
              </p>
              <p>
                Si le Client n'accepte pas les nouvelles CGU, il pourra résilier
                son abonnement sans pénalité avant l'entrée en vigueur des
                modifications, en adressant une notification écrite à Praedixa.
              </p>
              <p>
                La poursuite de l'utilisation du Service après l'entrée en
                vigueur des nouvelles CGU vaut acceptation de celles-ci.
              </p>
            </div>
          </section>

          {/* 15. Droit applicable */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-charcoal">
              15. Droit applicable et juridiction
            </h2>
            <div className="space-y-4 leading-relaxed">
              <p>Les présentes CGU sont régies par le droit français.</p>
              <p>
                En cas de litige relatif à l'interprétation ou l'exécution des
                présentes CGU, les parties s'efforceront de trouver une solution
                amiable. À défaut d'accord amiable dans un délai de trente (30)
                jours, les tribunaux de Paris seront seuls compétents.
              </p>
            </div>
          </section>

          {/* 16. Contact */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-charcoal">
              16. Contact
            </h2>
            <p className="leading-relaxed">
              Pour toute question concernant ces CGU :{" "}
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
