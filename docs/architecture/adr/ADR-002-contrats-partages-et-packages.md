# ADR-002 - Contrats partages et packages de reference

- Statut: accepted
- Date: 2026-03-12

## Contexte

Le repo partage des types, des payloads HTTP et des primitives UI entre plusieurs apps.
Sans point de reference explicite, le risque est de dupliquer les shapes ou de faire diverger front, API et tests.

## Decision

Praedixa garde trois points de reference distincts:

- `packages/shared-types` pour les types TypeScript partages entre apps;
- `contracts/openapi/` pour le contrat HTTP public versionne;
- `packages/ui` pour les primitives UI partagees, sans logique metier propre a une app.
- `packages/shared-types` reste un package leaf: il ne depend pas de `packages/ui`.
- `app-api-ts` et `app-connectors` ne dependent pas de `packages/ui`.

## Regles d'application

- Un concept metier transverse va dans `packages/shared-types/src/domain/`.
- Une requete/reponse HTTP partagee va dans `packages/shared-types/src/api/` et dans `contracts/openapi/` si la surface est publique.
- Une variante UI commune va dans `packages/ui`.
- Un type strictement local a une app reste dans cette app.
- Ordre de changement recommande: `contracts/openapi` si public -> `packages/shared-types` -> `app-api-ts` -> apps consommatrices -> tests.
- Les garde-fous executables `.dependency-cruiser*.cjs` bloquent les imports `packages/shared-types -> packages/ui` et `app-api-ts/app-connectors -> packages/ui`.

## Preuves repo

- `packages/README.md` definit `shared-types` comme contrat TS partage et `ui` comme librairie UI partagee.
- `packages/shared-types/src/README.md` definit `api/`, `domain/` et le workflow de changement.
- `contracts/README.md` impose l'alignement entre contrat public, `app-api-ts`, frontends et tests.
- `app-webapp/package.json`, `app-admin/package.json` et `app-landing/package.json` consomment `@praedixa/shared-types` et `@praedixa/ui` en workspace.
- `package.json` et `tsconfig.json` montrent un ordre de build et de references qui place `shared-types` et `ui` avant les apps.
- Plusieurs modeles Python documentent leur alignement semantique avec `shared-types`, par exemple `app-api/app/models/organization.py` et `app-api/app/models/decision.py`.

## Consequences

- Les diffs de contrat deviennent visibles et relisibles.
- Les apps eviten de redefinir les memes shapes a plusieurs endroits.
- Le couplage entre UI partagee et logique metier reste limite.
- Le placement d'un nouveau code transverse doit rester lisible meme quand le repo grossit.
