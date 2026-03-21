# `src/__tests__/` - Tests Vitest du runtime connecteurs

## Role

Valider le control plane connecteurs sans passer par les frontends.

## Fichiers

- `config.test.ts` : parsing env, scopes, rejet des alias legacy et separation des allowlists `production` / `sandbox`.
- `router.test.ts` : hardening du routeur et robustesse du matching.
- `routes.test.ts` : validation des handlers HTTP et reponses.
- `server.test.ts` : auth service token, CORS, surface serveur et confiance proxy/IP.
- `activation-readiness.test.ts` : prerequis d'activation standardises par vendor/auth mode, sans intervention dev.
- `service.test.ts` : logique metier de `ConnectorService`, OAuth, validation des URLs sortantes, queue runtime `sync_runs` et chemins internes `provider access-context` / `provider-events`.
- `persistent-store.test.ts` : persistance Postgres du control plane.

## Commande

```bash
pnpm --dir app-connectors test
```
