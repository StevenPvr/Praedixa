# `components/pages/`

Composants orientes pages ou parcours metier.

## Ce qu'on trouve ici

- pages legal/corporate: `LegalStaticPage.tsx`
- pages resources/knowledge: `KnowledgePage.tsx`, `SerpResourcePage.tsx`
- page services: `ServicesPage.tsx`
- page verticale: `SectorPage.tsx`
- parcours contact: `ContactPageClient.tsx`, `ContactPageForm.tsx`, `ContactPageAside.tsx`, `ContactPageSuccessState.tsx`
- parcours deploiement: `DeploymentRequestPageClient.tsx`, `DeploymentRequestForm.tsx`, `DeploymentRequestAside.tsx`, `DeploymentRequestStates.tsx`
- helpers/types de formulaire: `contact-page.*`, `deployment-request.*`

## Regle de decoupage

- `*PageClient.tsx`: orchestration client, soumission, transitions d'etat
- `*Form.tsx`: champs et ergonomie du formulaire
- `*Aside.tsx`: contenu lateral, reassurance, preuves
- `*State*`: succes / empty / etats derives
- `*.helpers.ts` et `*.types.ts`: transformations et contrats locaux

## APIs locales consommees

- contact -> `POST /api/contact`
- demande de deploiement -> `POST /api/deployment-request`
- les copies de select/options viennent de `lib/content/pilot-form-options.ts`

## Conventions

- laisser les validations serveur dans `lib/api/*`; garder ici seulement la logique d'UI
- ne pas dupliquer les listes d'options si elles existent deja dans `lib/content`
- les pages knowledge doivent lire le contenu depuis `lib/content/knowledge-pages*.ts`
- les pages knowledge, services et contact qui servent de pages piliers doivent afficher une breadcrumb visible et emettre un `WebPage` + `BreadcrumbList` JSON-LD coherents
- les pages sectorielles lisent leur contenu, leurs sources et leurs cartes partagees depuis `lib/content/sector-pages.ts`
- pour l'affichage, les sources sectorielles sont dedupliquees par URL avant rendu pour eviter les collisions React et la redondance visuelle
- dans les pages sectorielles, preferer des cartes larges et lisibles plutot que des cartes etroites en colonnes quand le texte devient dense
- ne pas recoder de copy sectorielle ou de copy partagee dans `SectorPage.tsx`; la page ne doit faire que du rendu
- `SectorPage.tsx` doit afficher separement les KPIs predicitifs du secteur et les decisions optimisables, puis garder le CTA/sources dans un bloc distinct
- pour les badges et pictos marketing de ces pages, reutiliser le set SVG `components/shared/icons/` au lieu de reintroduire des icones decoratives generiques
- le parcours public doit rester coherent avec l'entree `exemple concret -> deploiement -> preuve sur historique si besoin`; eviter de reintroduire une offre publique parallele via un ancien `pilote ROI` ou un vieux `protocole`
