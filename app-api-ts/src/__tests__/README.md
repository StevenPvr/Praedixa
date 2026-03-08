# `src/__tests__/` - Tests Vitest API TS

## Role

Les tests de ce dossier couvrent le runtime API TS sans passer par les frontends.

## Couverture actuelle

- `auth.test.ts` : JWT, claims, audience et garde-fous auth.
- `server.test.ts` : comportement serveur, erreurs transport, headers et guards.
- `config.test.ts` : parsing env et validation des variables runtime.
- `routes.contracts.test.ts` : comportement contractuel des routes et des fallbacks.
- `realm-audience-mapper.test.ts` : compatibilite audience/realm OIDC.
- `persistence.test.ts` : garde-fous DB et compatibilite UUID.
- `operational-data.test.ts` : requetes SQL et mappings live/admin.
- `gold-explorer.test.ts` : surface Gold persistante.
- `admin-monitoring.test.ts` : KPI et vues monitoring admin.

## Commande

```bash
pnpm --filter @praedixa/api-ts test
```

## Conseils de lecture

- Commencer par `config.test.ts` et `auth.test.ts` pour comprendre les invariants.
- Lire ensuite `routes.contracts.test.ts` pour la surface HTTP.
- Finir par les tests de services pour la persistance.
