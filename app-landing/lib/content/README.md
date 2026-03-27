# `lib/content/`

Contenu structure et versionne du landing hors dictionnaires UI.

## Zones majeures

- `knowledge-pages*.ts`: pages knowledge/piliers
- `value-prop/*.ts`: source de verite FR/EN pour la promesse publique, les CTA, le descripteur d'offre dans la hero, le comparatif homepage, la page offre, la page contact et la preuve sur historique
- `serp-resources-fr*.ts`: ressources SEO FR publiees sous `/fr/ressources/[slug]`
- `serp-briefs-fr*.ts`: briefs SEO internes et derives
- `serp-asset-downloads.ts`: assets telechargeables lies aux ressources
- `legal.ts`: contenus legaux
- `pilot-form-options.ts`: options serveur/partagees pour le formulaire de deploiement
- `sector-pages.ts`: facade publique des pages verticales HCR et logistique/transport/retail
- `sector-pages-data/`: contrats, routes, contenu FR/EN et copy partagee des verticales

## Idee generale

Ici vivent les contenus longs, structures ou semi-editorialises que les pages consomment. On garde les donnees proches de leur domaine, pas dans les composants.

## Regles pratiques

- ajouter un nouveau contenu SEO dans les modules `serp-*` plutot que de coder en dur dans la page
- garder les cles partagees dans `knowledge-pages-shared.ts`
- si une page a besoin d'un contrat fort, exporter types + acces centralises depuis ce dossier
- la facade `sector-pages.ts` sert d'entree unique pour les routes, composants, sitemap et llms
- la promesse publique canonique doit vivre dans `value-prop/*` et etre referencee par les pages, pas recopidee librement dans plusieurs dictionnaires ou composants
- la promesse publique actuelle de la homepage vise d'abord les franchisés et reseaux de restauration rapide multi-sites; tout nouveau copy homepage/contact/preuve doit rester aligne sur cet ICP tant qu'un autre repositionnement n'a pas ete approuve
- pour cet ICP QSR, le wording hero/homepage doit d'abord parler prediction de la demande et des besoins d'effectifs; le service, la marge ou le delivery viennent ensuite comme consequences metier, pas comme la promesse principale
- les modules `sector-pages*` consomment le contrat `Locale` depuis `lib/i18n/locale.ts`, pas depuis un module de redirects qui reimporte cette facade
- la copy partagee des verticales reste dans `sector-pages-data/shared.ts`, pas dans `SectorPage.tsx`
- les pages sectorielles exposent aussi un helper de deduplication des sources affichees pour garder une liste de references propre par URL
- les verticales doivent expliciter a la fois les `KPIs` que Praedixa peut predire et les `decisions` que la plateforme peut optimiser pour le secteur
- chaque verticale doit faire ressortir au moins un levier metier non limite au seul headcount, pour montrer la largeur produit sans refaire une promesse floue de "tout"
- les contenus knowledge et sectoriels doivent rester alignes sur la promesse publique actuelle: risques business, arbitrages, impact. Ne pas retomber ni dans un jargon de categorie, ni dans cinq verticales qui racontent toutes la meme histoire de staffing.
- si un contenu mentionne le machine learning ou l'optimisation, l'ancrer dans la qualite de l'arbitrage et la preuve methologique; ne pas le faire glisser vers une promesse de conseil IA generique.
- si un contenu EN mentionne econometrics, constrained optimization, or forecasting, l'ancrer a l'attribution d'impact et a la decision quality, pas a un discours hype sur AI.
- quand l'offre publique change de vocabulaire approuve (`exemple concret`, `deploiement`, `preuve sur historique`), realigner dans la meme passe les assertions des tests knowledge/services au lieu de laisser un ancien wording DecisionOps, pilote ou protocole derivant.
- sur la homepage FR visible, preferer `preuve de ROI` dans les CTA et blocs preuve; garder `preuve sur historique` pour la page de detail et les flux qui qualifient cette lecture.
- quand la copy homepage compare Praedixa a un ERP, expliciter la difference de methode (`Data Science + Machine Learning + IA` cote Praedixa, regles / historiques / moyennes cote ERP) plutot que de rester sur une promesse vague d'IA.
- les contenus legaux publics doivent reprendre le fournisseur et la localisation d'hebergement réellement exposes en production; ne pas laisser survivre un ancien provider de preview ou de transition dans `legal.ts`.
- ne jamais laisser passer de note editoriale interne ou commentaire de travail dans un contenu public versionne; les modules `knowledge-pages*` doivent rester publiables tels quels.

## Tests

- `__tests__/knowledge-pages-en.test.ts`
- `__tests__/knowledge-pages-fr.test.ts`
- `__tests__/serp-asset-downloads.test.ts`
- `__tests__/serp-briefs-fr.test.ts`
- `__tests__/serp-resources-fr.test.ts`
- `__tests__/sector-pages.test.ts`
