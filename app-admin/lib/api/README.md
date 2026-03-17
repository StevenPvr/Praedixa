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
- Integrations, tests de connexion, sync runs et raw events
- Surfaces DecisionOps (`approval-inbox`, `approvals/:id/decision`, `action-dispatches/:id`, `action-dispatches/:id/decision`, `action-dispatches/:id/fallback`, `ledgers/:id`, `ledgers/:id/decision`)
- Gouvernance `DecisionContract` globale (`decision-contract-templates`, `decision-contract-templates/instantiate-preview`, `decision-compatibility/evaluate`)
- Contract Studio runtime par organisation (`decision-contracts`, detail de version, `transition`, `fork`, `rollback-candidates`, `rollback`)

## Usage

- Les pages utilisent `hooks/use-api.ts`.
- Les hooks appellent les chemins definis dans `ADMIN_ENDPOINTS`.
- Le navigateur passe ensuite par `app/api/v1/[...path]/route.ts`.
- Les operations connecteurs passent aussi par ce catalogue:
  - `.../integrations/connections/:connectionId/test`
  - `.../integrations/connections/:connectionId/sync`
  - `.../integrations/sync-runs`

## Tests

- `__tests__/client.test.ts`
- `__tests__/endpoints.test.ts`
