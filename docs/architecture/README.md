# Architecture executable

Ce dossier complete `docs/ARCHITECTURE.md` avec un niveau operatoire plus court.
Son but est de repondre vite a quatre questions:

- quel runtime choisir ?
- ou mettre un contrat partage ?
- quels garde-fous multi-tenant appliquer ?
- qui tranche et qui relit ?
- quel terme de domaine utiliser sans ambiguite ?

## Commencer ici

1. Lire `adr/ADR-001-frontiere-runtimes-ts-python.md` avant de creer une nouvelle surface.
2. Lire `adr/ADR-002-contrats-partages-et-packages.md` des qu'une payload ou un type touche plusieurs apps.
3. Lire `adr/ADR-003-isolation-multi-tenant-en-profondeur.md` des qu'une route, une requete SQL ou un job lit des donnees client.
4. Verifier `ownership-matrix.md` avant de lancer un chantier transverse.
5. Ouvrir `placement-guide.md` avant de creer une nouvelle brique ou de deplacer une logique.
6. Ouvrir `domain-vocabulary.md` avant d'introduire un nouveau terme transverse dans le code ou la doc.

## Invariants du repo

- Les surfaces user-facing web, BFF, auth et HTTP operateur vivent en TypeScript dans `app-landing`, `app-webapp`, `app-admin`, `app-api-ts` et `app-connectors`.
- La data platform, l'ingestion, le pipeline medallion, les batch jobs, le forecasting et le ML vivent en Python dans `app-api`.
- `packages/shared-types` porte les types TypeScript partages; `contracts/openapi/` porte le contrat HTTP public; `packages/ui` porte les primitives UI partagees.
- L'isolation multi-tenant est defense-in-depth: claims auth -> scope org/site -> filtres applicatifs -> RLS PostgreSQL.

## Contenu

- `adr/` : registre court des decisions structurantes encore vivantes.
- `ownership-matrix.md` : owner principal par sous-systeme, co-review attendus et sources de verite.
- `placement-guide.md` : arbre de decision pour choisir le bon runtime, package ou script.
- `domain-vocabulary.md` : glossaire canonique pour les primitives produit et les surfaces du socle.

## Garde-fous executables

- `pnpm architecture:dependency-cruiser` bloque les imports interdits entre apps, runtimes et packages.
- `pnpm architecture:knip` bloque la dette de dependances et d'exports morts sur le scope TS.
- `pnpm architecture:ts-guardrails` bloque toute nouvelle derive sur la taille des fichiers et fonctions TS/JS du socle contre une baseline versionnee.

## Quand ajouter ou mettre a jour un ADR

- la frontiere entre runtimes change;
- un nouveau contrat partage ou versionne apparait;
- un mecanisme auth, tenant, site ou cross-org change;
- une nouvelle exception structurelle apparait et doit etre rendue explicite.

Format attendu: contexte, decision, regles d'application, preuves repo, consequences.
