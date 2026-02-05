export const faqCategories = [
  "Comprendre Praedixa",
  "Programme pilote & tarification",
  "Technologie & données",
] as const;

export type FaqCategory = (typeof faqCategories)[number];

export const landingFaq = [
  // ── Comprendre Praedixa ───────────────────────────────────────────────
  {
    question: "Praedixa, c'est quoi ?",
    answer:
      "Praedixa est un logiciel B2B qui aide les PME/ETI multi-sites à piloter la couverture terrain. La solution couvre le cycle complet : standardisation des données, prédictions par machine learning, notifications informatives présentant des options chiffrées, et suivi des KPIs économiques. L'objectif : anticiper les écarts capacité vs charge et décider en confiance avec une preuve économique auditable.",
    category: "Comprendre Praedixa" as const,
  },
  {
    question: "À qui s'adresse Praedixa ?",
    answer:
      "Praedixa s'adresse aux PME et ETI multi-sites qui gèrent plus de 100 collaborateurs terrain. Les secteurs les plus concernés : logistique, transport, santé, distribution, industrie et BTP. Le point commun de nos clients : des équipes réparties sur plusieurs sites, un planning complexe et un besoin de visibilité sur l'adéquation capacité/charge.",
    category: "Comprendre Praedixa" as const,
  },
  {
    question: "Qu'est-ce que je reçois en 48h ?",
    answer:
      "Un plan de couverture actionnable : carte de sous-couverture, coût évitable estimé, options chiffrées et 3 actions prioritaires. Les hypothèses (coûts unitaires, règles) sont explicites et validables.",
    category: "Comprendre Praedixa" as const,
  },
  {
    question: "Quelle différence avec un SIRH ou un logiciel de planning ?",
    answer:
      "Un SIRH gère les processus RH (paie, congés, contrats). Un logiciel de planning gère les rotations et les affectations au quotidien. Praedixa fait autre chose : il prévoit l'écart entre votre capacité terrain et la charge réelle, chiffre le coût des trous de planning et propose des actions correctives avec leur ROI. C'est un outil de décision, pas un outil de gestion.",
    category: "Comprendre Praedixa" as const,
  },
  {
    question: "Que se passe-t-il après le diagnostic ?",
    answer:
      "Le diagnostic est votre point d'entrée. Pour les entreprises pilotes, il débouche sur la solution complète de pilotage prédictif : standardisation continue des données, prédictions multi-horizon (J+7, J+14, J+30+), notifications informatives avec options chiffrées, et suivi des gains économiques. Vous passez d'un diagnostic ponctuel à un pilotage continu, sans changer vos outils existants.",
    category: "Comprendre Praedixa" as const,
  },
  {
    question: "Praedixa donne-t-il des conseils ?",
    answer:
      "Non. Praedixa ne donne pas de conseil. Praedixa présente des options avec leur impact économique chiffré. Quand un écart est détecté, le système génère des notifications informatives présentant les scénarios possibles (heures supplémentaires, intérim, réallocation inter-sites, dégradation acceptée), chacun avec son coût estimé. La décision reste entièrement celle de l'entreprise.",
    category: "Comprendre Praedixa" as const,
  },
  {
    question: "Qu'est-ce qu'une notification informative ?",
    answer:
      "Exemple concret : « Site Lille, semaine 12 — risque de sous-couverture de 3 ETP détecté. Option A : 2 intérimaires + 1 réallocation depuis Nantes (coût estimé : 4 200 €). Option B : heures supplémentaires équipe actuelle (coût estimé : 3 800 €, contrainte : accord syndical requis). Option C : dégradation acceptée sur 2 lignes non critiques (coût estimé : 1 500 € de pénalités). » Praedixa informe et présente les options. La décision vous appartient.",
    category: "Comprendre Praedixa" as const,
  },
  // ── Programme pilote & tarification ───────────────────────────────────
  {
    question: "Combien coûte Praedixa ?",
    answer:
      "Le diagnostic initial est gratuit pour les entreprises pilotes. Les entreprises qui rejoignent le programme pilote bénéficient d'un tarif préférentiel pendant 1 an et d'un support premium pendant 1 an. Ensuite, la tarification dépend du nombre de sites et de collaborateurs suivis. Contactez-nous pour obtenir un devis adapté.",
    category: "Programme pilote & tarification" as const,
  },
  {
    question: "Qu'est-ce que le programme pilote ?",
    answer:
      "Le programme pilote est un partenariat. Vous bénéficiez d'avantages exclusifs (diagnostic gratuit, tarif préférentiel 1 an, support premium 1 an, accès prioritaire aux nouvelles fonctionnalités) et en échange, vous nous aidez à construire la meilleure solution de pilotage des opérations terrain. L'objectif est de déployer la boucle complète : données → prédictions → notifications informatives → KPIs économiques.",
    category: "Programme pilote & tarification" as const,
  },
  {
    question: "Comment mesurez-vous le ROI ?",
    answer:
      "Praedixa mesure les gains réalisés après chaque action : coûts évités, comparaison prévisions vs réel, KPIs économiques continus. Ces données sont auditables et présentables en CODIR ou au DAF. Chaque cycle de mesure alimente aussi la boucle de feedback pour affiner les prédictions futures.",
    category: "Programme pilote & tarification" as const,
  },
  // ── Technologie & données ─────────────────────────────────────────────
  {
    question: "Quelles données faut-il pour démarrer ?",
    answer:
      "On démarre avec des exports que vous avez déjà : planning, activité/volumes et absences (format CSV/Excel). On s'adapte à vos outils et à votre niveau de maturité data. L'objectif est de produire un diagnostic actionnable sans projet d'intégration.",
    category: "Technologie & données" as const,
  },
  {
    question: "Faut-il une intégration IT ?",
    answer:
      "Non pour le diagnostic initial. Des exports simples suffisent (CSV, Excel), sans connecteur à installer. Pour le programme pilote et le pilotage continu, Praedixa peut intégrer progressivement vos flux de données pour alimenter les prédictions, les notifications et le suivi des KPIs en temps réel.",
    category: "Technologie & données" as const,
  },
  {
    question: "RGPD : est-ce que vous utilisez des données individuelles ?",
    answer:
      "Le diagnostic est conçu privacy-by-design : on travaille au niveau agrégé (équipe/site) et on limite les données au strict nécessaire. Les données sont hébergées en France.",
    category: "Technologie & données" as const,
  },
  {
    question: "Comment fonctionnent les prédictions ?",
    answer:
      "Praedixa combine des modèles de machine learning et d'économétrie pour estimer les risques de sous-couverture à différents horizons (J+7, J+14, J+30+). Les modèles intègrent vos données historiques d'absences, de turnover, de demande client et de capacité fournisseurs. Toutes les prédictions sont agrégées au niveau équipe ou site — aucune prédiction individuelle.",
    category: "Technologie & données" as const,
  },
  {
    question: "Les prédictions sont-elles individuelles ?",
    answer:
      "Non, jamais. Toutes les prédictions sont agrégées au niveau équipe ou site. Praedixa ne fait aucune prédiction sur un individu. C'est un choix de conception fondamental, pas un simple paramètre. Conformité RGPD native et by design.",
    category: "Technologie & données" as const,
  },
] as const;

export type LandingFaqItem = (typeof landingFaq)[number];
