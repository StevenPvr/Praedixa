# `lib/api/` - Client API du webapp

Ce dossier formalise la facon dont React parle au backend Praedixa sans connaitre les details d'auth.

## Fichiers

| Fichier | Role |
| --- | --- |
| `client.ts` | Fonctions HTTP de base (`apiGet`, `apiPost`, etc.) |
| `base-url.ts` | Resolution de la base URL selon contexte browser/server |
| `endpoints.ts` | Barrel export des endpoints typed |
| `endpoints/core.ts` | Routes coeur produit: dashboard, org, forecasts, decisions |
| `endpoints/data.ts` | Routes data/ops: datasets, canonical, coverage alerts, proof packs |
| `endpoints/support.ts` | Conversations et support |
| `endpoints/shared.ts` | Helpers de query string et d'encodage |

## Flux

1. Un hook ou composant appelle une fonction d'endpoint.
2. Cette fonction delegue a `client.ts`.
3. Cote navigateur, `client.ts` vise le BFF Next `/api/v1/*`.
4. Le BFF ajoute le bearer cote serveur et parle au backend.

## Tests

- `__tests__/base-url.test.ts`
- `__tests__/client.test.ts`
- `__tests__/endpoints.test.ts`
