# `lib/content/`

Contenu structure et versionne du landing hors dictionnaires UI.

## Zones majeures

- `knowledge-pages*.ts`: pages knowledge/piliers
- `serp-resources-fr*.ts`: ressources SEO FR publiees sous `/fr/ressources/[slug]`
- `serp-briefs-fr*.ts`: briefs SEO internes et derives
- `serp-asset-downloads.ts`: assets telechargeables lies aux ressources
- `legal.ts`: contenus legaux
- `pilot-form-options.ts`: options serveur/partagees pour le formulaire pilote
- `sector-pages.ts`: facade publique des pages verticales HCR, enseignement supérieur, logistique/transport/retail et automobile
- `sector-pages-data/`: contrats, routes, contenu FR/EN et copy partagee des verticales

## Idee generale

Ici vivent les contenus longs, structures ou semi-editorialises que les pages consomment. On garde les donnees proches de leur domaine, pas dans les composants.

## Regles pratiques

- ajouter un nouveau contenu SEO dans les modules `serp-*` plutot que de coder en dur dans la page
- garder les cles partagees dans `knowledge-pages-shared.ts`
- si une page a besoin d'un contrat fort, exporter types + acces centralises depuis ce dossier
- la facade `sector-pages.ts` sert d'entree unique pour les routes, composants, sitemap et llms
- les modules `sector-pages*` consomment le contrat `Locale` depuis `lib/i18n/locale.ts`, pas depuis un module de redirects qui reimporte cette facade
- la copy partagee des verticales reste dans `sector-pages-data/shared.ts`, pas dans `SectorPage.tsx`
- les pages sectorielles exposent aussi un helper de deduplication des sources affichees pour garder une liste de references propre par URL
- les verticales doivent expliciter a la fois les `KPIs` que Praedixa peut predire et les `decisions` que la plateforme peut optimiser pour le secteur
- chaque verticale doit faire ressortir au moins un levier metier non limite au seul headcount, pour montrer la largeur produit sans refaire une promesse floue de "tout"
- les contenus knowledge et sectoriels doivent rester alignes sur la promesse publique actuelle: risques business, arbitrages, impact. Ne pas retomber ni dans un jargon de categorie, ni dans quatre verticales qui racontent toutes la meme histoire de staffing.
- si un contenu mentionne le machine learning ou l'optimisation, l'ancrer dans la qualite de l'arbitrage et la preuve methologique; ne pas le faire glisser vers une promesse de conseil IA generique.
- si un contenu EN mentionne econometrics, constrained optimization, or forecasting, l'ancrer a l'attribution d'impact et a la decision quality, pas a un discours hype sur AI.
- quand l'offre publique change de vocabulaire approuve (`preuve sur historique`, `deploiement`, `abonnement`), realigner dans la meme passe les assertions des tests knowledge/services au lieu de laisser un ancien wording DecisionOps ou pilote derivant.
- ne jamais laisser passer de note editoriale interne ou commentaire de travail dans un contenu public versionne; les modules `knowledge-pages*` doivent rester publiables tels quels.

## Tests

- `__tests__/knowledge-pages-en.test.ts`
- `__tests__/knowledge-pages-fr.test.ts`
- `__tests__/serp-asset-downloads.test.ts`
- `__tests__/serp-briefs-fr.test.ts`
- `__tests__/serp-resources-fr.test.ts`
- `__tests__/sector-pages.test.ts`
