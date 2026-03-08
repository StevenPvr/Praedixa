# `hooks/` - Hooks React du webapp

Les hooks de ce dossier encapsulent l'acces API, les etats de polling et quelques comportements d'UI reutilises dans les pages clientes.

## Hooks exposes

| Hook | Fichier | Role |
| --- | --- | --- |
| `useApiGet`, `useApiGetPaginated`, `useApiPost`, `useApiPatch` | `use-api.ts` | Couche de data-fetching browser-aware avec annulation et gestion d'erreurs |
| `useDecisionConfig` | `use-decision-config.ts` | Lecture de la configuration de decision effective |
| `useLatestForecasts` | `use-latest-forecasts.ts` | Recuperation et normalisation des previsions recentes |
| `useCountUp` | `use-count-up.ts` | Animation numerique cote client |

## Conventions

- Les hooks API passent par le BFF `/api/v1/*`, jamais par un token browser.
- Les hooks metier s'appuient sur `lib/api/endpoints.ts`.
- Les appels longs ou repetes utilisent le polling defini dans `lib/chat-config.ts`.

## Tests

- `__tests__/use-api.test.ts`
- `__tests__/use-decision-config.test.ts`
- `__tests__/use-latest-forecasts.test.ts`
