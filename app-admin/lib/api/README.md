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
- `client.ts` reste en mode `proxy` par defaut; quand `NEXT_PUBLIC_ADMIN_API_MODE=direct`, il appelle `NEXT_PUBLIC_API_URL` et attend qu'un bearer navigateur valide soit fourni par `lib/auth/client.ts`.
- En mode `direct`, le bearer provient exclusivement de `GET /auth/session?include_access_token=1`; il ne doit pas etre rederive ailleurs ni remplace par un fallback cookie-only.
- Les operations connecteurs passent aussi par ce catalogue:
  - `.../integrations/connections/:connectionId/test`
  - `.../integrations/connections/:connectionId/sync`
  - `.../integrations/sync-runs`
  - `.../integrations/connections/:connectionId/raw-events` ne doit remonter qu'un resume metadata-only; le payload brut n'est plus expose sur la surface admin

## Tests

- `__tests__/client.test.ts`
- `__tests__/endpoints.test.ts`
