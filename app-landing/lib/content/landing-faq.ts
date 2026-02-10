export const faqCategories = [
  "Comprendre Praedixa",
  "Diagnostic & tarification",
  "Technologie & donnees",
] as const;

export type FaqCategory = (typeof faqCategories)[number];

export const landingFaq = [
  // ── Comprendre Praedixa ───────────────────────────────────────────────
  {
    question: "Praedixa, c'est quoi ?",
    answer:
      "Praedixa est une couche d'intelligence de couverture pour les entreprises multi-sites. On predit les risques de sous-couverture par site, equipe et competence, on chiffre le cout de l'inaction vs le cout des options, puis on suit l'impact pour produire une preuve economique auditable. En resume : anticipation, arbitrage economique, preuve d'impact.",
    category: "Comprendre Praedixa" as const,
  },
  {
    question: "A qui s'adresse Praedixa ?",
    answer:
      "Praedixa s'adresse aux Dir. d'exploitation, responsables Ops et DAF d'entreprises multi-sites qui gerent des equipes terrain. Le secteur d'entree : logistique, entrepots et transport. Le point commun : une charge qui fluctue, une capacite terrain qui ne suit pas, et des couts d'urgence qui explosent sans visibilite.",
    category: "Comprendre Praedixa" as const,
  },
  {
    question: "Que reçoit une entreprise pilote ?",
    answer:
      "Une carte des risques de sous-couverture par site et équipe, les facteurs explicatifs de chaque risque (pourquoi il existe, pas juste qu'il va arriver), le chiffrage du coût de l'inaction, un playbook d'actions prioritaires avec arbitrage économique, et des hypothèses explicites et validables. Le tout sans intégration IT : des exports simples suffisent. En tant que pilote, vous participez activement à la calibration du système sur vos contraintes métier.",
    category: "Comprendre Praedixa" as const,
  },
  {
    question: "Quelle difference avec un SIRH ou un outil de planification ?",
    answer:
      "On ne fait pas le planning. On se branche dessus. Un SIRH gere les processus RH (paie, conges, contrats). Un outil de planification gere les rotations et les affectations. Praedixa fait autre chose : on predit l'ecart entre la capacite terrain et la charge reelle, on chiffre le cout de chaque scenario et on propose un playbook d'actions avec leur impact economique. C'est un outil de decision, pas un outil de gestion.",
    category: "Comprendre Praedixa" as const,
  },
  {
    question: "Ce que Praedixa n'est PAS",
    answer:
      "Praedixa n'est pas un outil de planification, pas un dashboard RH, pas \"juste de la prediction\" et pas un projet d'integration de 6 mois. C'est une couche d'early-warning operationnelle qui se branche sur vos outils existants via des exports simples, et qui repond a la question que votre outil actuel ne traite pas : ou est-ce qu'on va etre sous-couverts, a quel point, et combien ca va couter si on ne fait rien ?",
    category: "Comprendre Praedixa" as const,
  },
  {
    question: "Qu'est-ce qu'un playbook d'actions ?",
    answer:
      "Quand un risque de sous-couverture est detecte, Praedixa genere un playbook : les scenarios possibles avec leur cout chiffre. Exemple : heures supplementaires equipe actuelle (cout estime : 3 800 EUR), interim 2 postes (cout estime : 4 200 EUR), reallocation depuis un autre site (cout estime : 1 100 EUR), priorisation des lignes critiques, ou acceptation controlee d'une degradation sur les lignes non critiques (cout estime des penalites : 1 500 EUR). Chaque option est chiffree. La decision reste la votre.",
    category: "Comprendre Praedixa" as const,
  },
  {
    question: "Praedixa donne-t-il des conseils ?",
    answer:
      "Non. Praedixa ne donne pas de conseil. Praedixa presente des options avec leur impact economique chiffre. Quand un ecart capacite vs charge est detecte, le systeme genere des options chiffrees. La decision appartient entierement a l'entreprise. Chaque decision est tracee pour alimenter la preuve economique.",
    category: "Comprendre Praedixa" as const,
  },
  {
    question: "Que signifie 'interprétabilité native' ?",
    answer:
      "Chaque prévision de Praedixa est accompagnée de ses facteurs explicatifs : pourquoi tel site risque d'être sous-couvert à tel horizon. Ce n'est pas une boîte noire. Vous voyez les causes (pic de charge, absences récurrentes, turnover élevé) et vous pouvez agir dessus. C'est un cercle vertueux : comprendre les causes, agir, les problèmes diminuent, les prévisions s'affinent.",
    category: "Comprendre Praedixa" as const,
  },
  // ── Diagnostic & tarification ───────────────────────────────────────
  {
    question: "Combien coute Praedixa ?",
    answer:
      "Le diagnostic initial est gratuit. Les entreprises qui rejoignent le programme pilote beneficient d'un tarif preferentiel et d'un support premium pendant 1 an. Ensuite, la tarification depend du nombre de sites et d'equipes suivis. Contactez-nous pour un devis adapte.",
    category: "Diagnostic & tarification" as const,
  },
  {
    question: "Comment se déroule le partenariat pilote ?",
    answer:
      "Étape 1 : vous envoyez vos exports existants (capacité, charge, absences — format CSV ou Excel). Étape 2 : Praedixa calcule le risque de sous-couverture par site, équipe et compétence, identifie les facteurs explicatifs et chiffre le coût de l'inaction vs le coût des options. Étape 3 : vous recevez une carte des risques avec causes identifiées, un playbook d'actions prioritaires et des hypothèses validables. On itère ensemble pour calibrer le système sur vos contraintes réelles.",
    category: "Diagnostic & tarification" as const,
  },
  {
    question: "Comment mesurez-vous le ROI ?",
    answer:
      "Chaque decision est tracee dans un decision log. Praedixa mesure l'avant/apres : couts evites, ecart prevision vs reel, impact economique de chaque action. Ces donnees sont auditables et presentables en CODIR ou au DAF. C'est une preuve economique, pas une estimation.",
    category: "Diagnostic & tarification" as const,
  },
  // ── Technologie & données ─────────────────────────────────────────────
  {
    question: "Quelles donnees faut-il pour demarrer ?",
    answer:
      "On demarre avec des exports que vous avez deja : capacite, charge/volumes et absences (format CSV ou Excel). On s'adapte a vos outils et a votre niveau de maturite data. L'objectif est de produire un diagnostic actionnable sans projet d'integration.",
    category: "Technologie & donnees" as const,
  },
  {
    question: "Faut-il une integration IT ?",
    answer:
      "Non pour le diagnostic initial. Des exports simples suffisent (CSV, Excel), sans connecteur a installer. Pour le pilotage continu, Praedixa peut integrer progressivement vos flux de donnees pour alimenter les predictions et le suivi des KPIs en temps reel.",
    category: "Technologie & donnees" as const,
  },
  {
    question: "RGPD : est-ce que vous utilisez des donnees individuelles ?",
    answer:
      "Non. Le diagnostic est concu privacy-by-design : on travaille au niveau agrege (equipe/site) et on limite les donnees au strict necessaire. Aucune prediction individuelle, aucun traitement nominatif. Les donnees sont hebergees en France.",
    category: "Technologie & donnees" as const,
  },
  {
    question: "Comment fonctionnent les predictions ?",
    answer:
      "Praedixa combine des modeles de machine learning et d'econometrie pour estimer le risque de sous-couverture a differents horizons : 3, 7 et 14 jours selon vos besoins. Les modeles integrent vos donnees historiques de capacite, de charge, de turnover et de demande. Toutes les predictions sont agregees au niveau equipe ou site.",
    category: "Technologie & donnees" as const,
  },
  {
    question: "Les predictions sont-elles individuelles ?",
    answer:
      "Non, jamais. Toutes les predictions sont agregees au niveau equipe ou site. Praedixa ne fait aucune prediction sur un individu. C'est un choix de conception fondamental, pas un simple parametre. Conformite RGPD native et by design.",
    category: "Technologie & donnees" as const,
  },
] as const;

export type LandingFaqItem = (typeof landingFaq)[number];
