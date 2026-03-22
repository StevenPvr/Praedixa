# `hooks/` - Hooks React du webapp

Hooks locaux relies surtout au fetch browser-aware et a deux besoins metier recurrents.

## Hooks exposes

| Hook                 | Fichier                   | Role reel                                                                                |
| -------------------- | ------------------------- | ---------------------------------------------------------------------------------------- |
| `useApiGet`          | `use-api.ts`              | GET avec abort, polling optionnel, auto-retry et reauth fail-close sur tout `401`        |
| `useApiGetPaginated` | `use-api.ts`              | variante paginee de `useApiGet`                                                          |
| `useApiPost`         | `use-api.ts`              | mutation POST qui annule la requete precedente du meme hook et force la reauth sur `401` |
| `useApiPatch`        | `use-api.ts`              | mutation PATCH sur le meme contrat                                                       |
| `useDecisionConfig`  | `use-decision-config.ts`  | lecture de la config de decision effective                                               |
| `useLatestForecasts` | `use-latest-forecasts.ts` | lecture/normalisation des previsions recentes                                            |

## Comportements utiles de `use-api.ts`

- les hooks GET passent par `lib/api/client.ts`, donc par le BFF same-origin
- `useApiGet` remet son state a vide si l'URL devient `null`
- un `401` sur un poll silencieux purge aussi le state stale avant la reauth, pour qu'une page live n'affiche plus de donnees apres expiration de session
- les retries automatiques ne couvrent que les erreurs retryables (`408`, `429`, `5xx`) hors polling
- les mutations exposent `reset()` et annulent leur requete precedente au prochain `mutate()`
- le fichier garde maintenant le contrat public webapp mais s'appuie sur `@praedixa/api-hooks` pour le coeur partage retry/polling/mutations
