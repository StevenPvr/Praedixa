# Packages

Ce dossier contient les packages TypeScript partages par les applications du monorepo.

## Role dans le repo

- `shared-types/` centralise les contrats TypeScript consommes par `app-webapp`, `app-admin`, `app-landing` et `app-api-ts`.
- `ui/` centralise les composants React, les hooks UI et les tokens de marque reutilisables.

Le flux habituel est:

1. Faire evoluer les types dans `packages/shared-types`.
2. Adapter `packages/ui` si l'interface partagee change.
3. Mettre a jour les apps consommatrices.

## Commandes utiles

Depuis la racine du repo:

```bash
pnpm --filter @praedixa/shared-types build
pnpm --filter @praedixa/shared-types test
pnpm --filter @praedixa/ui build
pnpm --filter @praedixa/ui test
```

Pour tout reconstruire dans le bon ordre:

```bash
pnpm build
```

## Conventions

- Ne documenter et modifier que `src/` et les fichiers de config versionnes. `dist/`, `node_modules/` et `.turbo/` sont des sorties generees.
- Garder ces packages sans logique applicative specifique a une app. Les comportements metier restent dans les apps ou services.
- Quand un changement touche une payload API, verifier en meme temps `contracts/openapi/`, `app-api-ts` et les tests qui dependent du contrat.
- Quand un composant UI change, verifier l'impact sur `app-landing`, `app-webapp`, `app-admin` et sur les tests dans `testing/`.

## Lire ensuite

- `packages/shared-types/README.md`
- `packages/shared-types/src/README.md`
- `packages/ui/README.md`
- `packages/ui/src/README.md`
