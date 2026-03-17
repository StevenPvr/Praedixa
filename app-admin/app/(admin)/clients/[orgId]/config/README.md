# Config

## Role

La page `config/page.tsx` orchestre les operations admin qui pilotent encore le socle par organisation:

- `decision-config` read/write;
- recompute scenario sur une alerte;
- surfaces integrations/connecteurs;
- proof packs read-only.

Le detail de rendu et des mutations est maintenant decoupe par domaine:

- `cost-params-section.tsx` et `proof-packs-section.tsx` pour les tableaux read-only;
- `decision-config-section.tsx` + `decision-config-card.tsx` pour le moteur de recommandation et ses versions;
- `integrations-section.tsx` + `integrations-section-*.tsx` pour les connecteurs, credentials, sync runs et evenements;
- `config-operations.ts` pour les mutations partagees et les helpers de format.

## Integrations

La section integrations ne se limite plus aux credentials et raw events:

- elle permet maintenant de tester une connexion via `POST /api/v1/admin/organizations/:orgId/integrations/connections/:connectionId/test`;
- elle permet aussi de declencher un run `manual`, `replay` ou `backfill` via `POST /api/v1/admin/organizations/:orgId/integrations/connections/:connectionId/sync`;
- elle lit les runs existants via `GET /api/v1/admin/organizations/:orgId/integrations/sync-runs?connectionId=...`.

Les mutations integrations doivent etre gardees par `admin:integrations:write`, pas par le simple droit `admin:org:write`.

## Tests

- `__tests__/page.test.tsx`
