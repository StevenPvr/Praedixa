# Contracts

Ce dossier regroupe les contrats versionnes partages entre runtimes, apps et tests.

## Role dans le repo

- rendre visibles en diff les interfaces structurantes;
- separer clairement contrat public HTTP, contrats admin internes, schemas d'evenements et primitives DecisionOps;
- poser une base build-ready pour aligner runtime, docs et types partages sans toucher au contrat OpenAPI public existant.

## Sous-dossiers

- `openapi/` contient le contrat HTTP public versionne. `contracts/openapi/public.yaml` reste la source de verite pour la surface publique et ne doit pas contenir de paths admin internes.
- `openapi/` couvre uniquement la surface non-admin versionnee de `app-api-ts`. Les routes `/api/v1/admin/*` en sont exclues par design.
- `admin/` documente la frontiere des contrats admin internes, distincts du public.
- `events/` contient l'enveloppe evenementielle versionnee pour les flux asynchrones et webhooks internes.
- `decisionops/` contient les primitives de domaine versionnees: contrat de decision, graph, approval, dispatch et ledger.

## Conventions de versioning

- Chaque payload versionne porte un `kind` stable et un `schema_version`.
- Les versions metier restent separees des versions de schema. Exemple: `contract_version` pour la revision d'un contrat, `schema_version` pour la structure JSON.
- Les changements additifs restent dans le meme major de schema. Un changement cassant doit ouvrir un nouveau major documente avant migration runtime.
- Les schemas de ce dossier ne modifient pas automatiquement le contrat HTTP public. Si une interface publique evolue, il faut mettre a jour `contracts/openapi/public.yaml` separement.

## Politique de compatibilite publique

- `contracts/openapi/public.yaml` est la source de verite versionnee pour les paths, methodes et `operationId` non-admin exposes par `app-api-ts`.
- Les payloads mutating du contrat public doivent pointer vers des composants schemas nommes; pas de `type: object` inline permissif pour les request bodies ecrits.
- Les ajouts additifs compatibles restent dans le major courant du contrat public.
- Un changement cassant doit ouvrir un nouveau major du contrat public avant suppression ou redefinition du comportement precedent.
- Une operation publique depreciee doit annoncer un remplacant explicite, exposer les headers `Deprecation` et `Sunset`, et respecter un preavis minimal de 90 jours avant retrait.
- Il n'y a pas de mode legacy cache: si une operation n'est plus supportee, la spec, les types partages et le runtime doivent etre alignes dans le meme chantier.
- Le catalogue type partage des operations publiques vit dans `packages/shared-types/src/api/public-contract.ts`; les tests comparent donc `runtime <-> spec <-> types` au lieu de laisser ces frontieres diverger.
- La lecture structurelle de `public.yaml` utilise le helper Node `@praedixa/shared-types/public-contract-node`; on n'accepte plus de parsing regex artisanal de la spec dans les suites critiques.

## Workflow recommande

Quand une interface critique change:

1. Mettre a jour le schema cible dans `contracts/`.
2. Aligner le runtime concerne (`app-api-ts`, `app-admin`, `app-webapp`, `app-api`, `app-connectors`) et, si besoin, `packages/shared-types`.
3. Ajouter ou adapter les tests de compatibilite concernes.
4. Rejouer au minimum le typecheck/build de la surface touchee.

Le garde-fou minimum de parite spec/runtime vit dans `app-api-ts/src/__tests__/openapi-public-contract.test.ts`: tout ajout ou retrait d'une route publique non-admin doit donc passer par le contrat versionne.
Le garde-fou spec/types partages vit dans `packages/shared-types/src/__tests__/public-contract.test.ts`.

## Commandes utiles

```bash
pnpm --filter @praedixa/api-ts typecheck
pnpm --filter @praedixa/shared-types build
pnpm test
```
