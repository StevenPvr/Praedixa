# `src/__tests__/` - Tests Vitest du runtime connecteurs

## Role

Valider le control plane connecteurs sans passer par les frontends.

## Fichiers

- `config.test.ts` : parsing env, scopes et compatibilite legacy token.
- `router.test.ts` : hardening du routeur et robustesse du matching.
- `routes.test.ts` : validation des handlers HTTP et reponses.
- `server.test.ts` : auth service token, CORS et surface serveur.
- `service.test.ts` : logique metier de `ConnectorService`.
- `persistent-store.test.ts` : persistance Postgres du control plane.

## Commande

```bash
pnpm --dir app-connectors test
```
