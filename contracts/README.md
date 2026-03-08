# Contracts

Ce dossier regroupe les contrats versionnes que plusieurs parties du systeme doivent partager explicitement.

## Role dans le repo

- Aligner le backend TypeScript, les clients frontend et les tests sur une meme definition publique.
- Rendre les changements d'API visibles en diff, au-dela des types internes.

## Sous-dossiers

- `openapi/` contient le contrat HTTP public actuellement versionne.

## Workflow recommande

Quand une route publique change:

1. Mettre a jour le contrat dans `contracts/openapi/`.
2. Mettre a jour `app-api-ts` et, si besoin, `packages/shared-types`.
3. Adapter les tests de route, de client et les E2E concernes.
4. Refaire au minimum le typecheck/build de la surface touchee.

## Commandes utiles

```bash
pnpm --filter @praedixa/api-ts typecheck
pnpm --filter @praedixa/shared-types build
pnpm test
```
