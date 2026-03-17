# `lib/auth/` - Auth, session et permissions admin

Le back-office n'est pas seulement protege par un role; il applique aussi des permissions fines par route. Ce dossier porte la resolution de session, les permissions metier et les garde-fous d'acces directs.

## Fichiers principaux

| Fichier                   | Role                                                                         |
| ------------------------- | ---------------------------------------------------------------------------- |
| `admin-route-policies.ts` | Source de verite typée des pages admin, tabs workspace et policies API proxy |
| `middleware.ts`           | Garde des requetes Next, redirections login/unauthorized                     |
| `request-session.ts`      | Resolution centralisee de la session admin                                   |
| `server.ts`               | Helpers serveur pour lire l'utilisateur                                      |
| `client.ts`               | Lecture client de la session via `/auth/session`                             |
| `permissions.ts`          | Normalisation des permissions et acces console                               |
| `route-access.ts`         | Facade de compatibilite qui re-exporte la matrice de policies                |
| `oidc.ts`                 | Sous-systeme OIDC admin (cookies, JWT, refresh, session)                     |

## Regles importantes

- Acces console reserve a `canAccessAdminConsole(...)`.
- Les routes `/api/*` ne sont pas gerees par le middleware de page; elles gardent leur propre contrat JSON.
- `admin-route-policies.ts` protege les URL directes du workspace client, la navigation UI et le proxy same-origin `/api/v1/[...path]`.
- Les pages detail read-only (`approvals`, `dispatches/[actionId]`, `ledgers/[ledgerId]`) et les surfaces de gouvernance runtime comme `/clients/[orgId]/contrats` doivent etre declarees dans `admin-route-policies.ts` en meme temps que leurs endpoints API, sinon middleware, navigation et proxy divergent.
- Les endpoints globaux de gouvernance (`decision-contract-templates`, preview d'instanciation, evaluation de compatibilite`) et les endpoints org-scoped du Contract Studio (`decision-contracts`, `transition`, `fork`, `rollback\*`) doivent aussi etre declares ici pour rester visibles a `route-access.ts` et au proxy admin.
- Les operations connecteurs visibles depuis `/clients/[orgId]/config` (`connections/:connectionId/test`, `connections/:connectionId/sync`, `integrations/sync-runs`) doivent rester synchronisees ici avec leurs permissions `admin:integrations:*`.
- Tout chemin admin ou proxy admin sans policy explicite est refuse par defaut.
- Les JWT admin n'acceptent plus que les claims top-level canoniques `sub`, `email`, `role`, `organization_id`, `site_id` et `permissions`; aucune permission n'est derivee depuis `profiles` ou `roles`.
- En production, le callback admin exige aussi un claim `amr` conforme a `AUTH_ADMIN_REQUIRED_AMR` avant de creer la session console.

## Tests

- `__tests__/admin-route-policies.test.ts`
- `__tests__/client.test.ts`
- `__tests__/middleware.test.ts`
- `__tests__/oidc.test.ts`
- `__tests__/permissions.test.ts`
- `__tests__/route-access.test.ts`
- `__tests__/server.test.ts`
