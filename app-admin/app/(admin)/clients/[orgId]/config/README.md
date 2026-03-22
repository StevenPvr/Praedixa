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
- `decision-config-card-sections.tsx` porte maintenant le detail des blocs resume/controles pour garder `decision-config-card.tsx` sur un role de composition;
- `integrations-section.tsx` + `integrations-section-*.tsx` pour les connecteurs, credentials, sync runs et evenements;
- `integrations-section-ops.tsx` garde les primitives de champs et les actions du panneau operations connecteur, sans repliquer la meme structure de formulaire entre selection, trigger et fenetres source;
- `config-operations.ts` pour les mutations partagees, le runner d'etat commun (`loading/error/success`) et les helpers de format.
- `async-data-table-block.tsx`, `config-readonly-notice.tsx`, `cost-params-section.tsx`, `proof-packs-section.tsx`, `decision-config-card*.tsx`, `integrations-section*.tsx` et les wrappers d'etat de `config/page.tsx` gardent maintenant des contrats de props explicitement immuables (`Readonly`) sur les composants du dossier.
- `integrations-section-tables.tsx` calcule maintenant son contenu `loading/error/data` en statement dedie plutot qu'en ternaire imbrique, et `integrations-section-ops.tsx` encapsule le texte du label checkbox dans un `<span>` pour garder un JSX explicite et stable pour Sonar.
- `decision-config-section.tsx` desctructure maintenant explicitement `orgId`, `selectedSiteId`, `canManageConfig` et les handlers de mutation au niveau du composant avant de construire son model, afin que le contrat de props reste lisible pour TypeScript et Sonar.
- les composants internes de `decision-config-section.tsx` qui prennent un `model` derive d'un hook utilisent maintenant eux aussi un vrai type de props `Readonly<...>` au lieu d'une annotation inline basee sur `ReturnType`, pour eviter les faux positifs Sonar sur les props de composant.
- `integrations-section-view.tsx` isole maintenant l'etat `credentials` derriere un alias de type dedie et rend le corps principal dans un conteneur `<div>` explicite, pour eviter que Sonar ne desynchronise son parsing TSX sur un generique multi-ligne puis remonte des faux positifs JSX.
- `config/page.tsx` calcule maintenant le ton du bandeau d'action et l'eventuel `ConfigReadonlyNotice` dans des variables dediees avant le `return`, pour garder un JSX de page simple et stable pour les analyseurs statiques.

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
