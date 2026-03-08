# `hooks/` - Hooks React de l'admin

L'admin garde volontairement peu de hooks locaux: ils encapsulent surtout l'acces API et les notifications.

## Hooks exposes

| Hook | Fichier | Role |
| --- | --- | --- |
| `useApiGet`, `useApiGetPaginated`, `useApiPost`, `useApiPatch` | `use-api.ts` | Couche de data-fetching admin avec annulation, pagination et mutations |
| `useToast` | `use-toast.ts` | Acces au systeme de toast monte par `ToastProvider` |

## Conventions

- Les endpoints consommes viennent de `lib/api/endpoints.ts`.
- Les appels browser passent par le BFF `/api/v1/*`.
- Les vues admin s'appuient sur ces hooks au lieu de fetcher directement dans les composants.

## Tests

- `__tests__/use-api-get-behavior.test.ts`
- `__tests__/use-api-get-core.test.ts`
- `__tests__/use-api-paginated-and-mutations.test.ts`
- `__tests__/use-toast.test.ts`
