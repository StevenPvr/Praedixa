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

Le listing admin des `raw events` doit rester un resume metadata-only. Les apercus de payload et le contenu brut ne doivent pas transiter dans cette table, et la surface HTTP admin n'expose plus de route de payload brut pour ces evenements.

En developpement local, `integrations-section.tsx` reste maintenant fail-close par defaut tant que `NEXT_PUBLIC_ADMIN_INTEGRATIONS_WORKSPACE=1` n'est pas active en meme temps qu'un runtime connecteurs vraiment configure. Cela evite de spammer des `500` garantis sur `/integrations/connections` quand `CONNECTORS_RUNTIME_TOKEN` manque encore.

## Tests

- `__tests__/page.test.tsx`
