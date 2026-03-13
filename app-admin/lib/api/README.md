# `lib/api/` - Client API de l'admin

Ce dossier centralise les chemins et le client HTTP utilises par la console super-admin.

## Fichiers

| Fichier        | Role                                           |
| -------------- | ---------------------------------------------- |
| `client.ts`    | Fonctions HTTP generiques et `ApiError`        |
| `endpoints.ts` | Catalogue complet des routes `/api/v1/admin/*` |

## Families d'endpoints

- Monitoring plateforme
- Organisations et overview par tenant
- Utilisateurs, roles et invitations
- Billing et changement de plan
- Audit log
- Onboarding
- Data operationnelle par organisation
- Conversations et demandes de contact
- Integrations et raw events
- Surfaces DecisionOps (`approval-inbox`, `approvals/:id/decision`, `action-dispatches/:id`, `ledgers/:id`)

## Usage

- Les pages utilisent `hooks/use-api.ts`.
- Les hooks appellent les chemins definis dans `ADMIN_ENDPOINTS`.
- Le navigateur passe ensuite par `app/api/v1/[...path]/route.ts`.

## Tests

- `__tests__/client.test.ts`
- `__tests__/endpoints.test.ts`
