# Api

## Role

Ce dossier regroupe les contrats et DTOs HTTP partages cote TypeScript.

Pour un CTO, il faut le lire comme:

- la projection TypeScript des surfaces HTTP publiques et admin;
- la couche commune entre `app-admin`, `app-webapp` et `app-api-ts`;
- un complement aux contrats normatifs de `contracts/*`.

## Sources de verite

- API publique non-admin versionnee:
  - `contracts/openapi/public.yaml`
- contrats admin et taxonomies machine-readable quand ils existent:
  - `contracts/admin/*`
- projections TypeScript consommees par les apps:
  - ce dossier `src/api/*`

## Modules actuellement presents

### Surface publique

- `public-contract.ts`
  - manifeste type partage des operations publiques non-admin
- `requests.ts`
  - payloads d'ecriture publics alignes sur `contracts/openapi/public.yaml`
- `responses.ts`
  - enveloppes et payloads de reponse publics

### Admin et control plane

- `admin-organizations.ts`
  - organisations admin, lifecycle, `isTest`, creation/suppression
  - peut maintenant embarquer `initialInviteProof` pour la premiere invitation client creee automatiquement
- `admin-onboarding.ts`
  - cases, tasks, blockers, evenements et payloads onboarding BPM
  - `inviteRecipients` peut maintenant embarquer une `deliveryProof` provider-side distincte du simple statut `sent`
- `email-delivery-proof.ts`
  - contrat partage de preuve de delivery (`pending`, `provider_accepted`, `delivery_delayed`, `delivered`, `bounced`, `complained`, `failed`)
- `approval-inbox.ts`
  - vues et filtres de la boite d'approbation
- `approval-decision.ts`
  - payloads de decision d'approbation
- `action-dispatch-decision.ts`
  - payloads de cycle de vie dispatch
- `action-dispatch-detail.ts`
  - vue detaillee d'un dispatch
- `action-dispatch-fallback.ts`
  - details et decisions de fallback humain
- `action-templates.ts`
  - catalogue d'actions exposable cote admin/runtime
- `ledger-detail.ts`
  - detail de ledger
- `ledger-decision.ts`
  - decisions admin sur le ledger
- `decision-contract-studio.ts`
  - vues et payloads du Contract Studio
- `decision-contract-templates.ts`
  - catalogue de templates de contrats
- `decision-compatibility.ts`
  - evaluation de compatibilite contrat/graphe
- `dataset-health.ts`
  - vues de sante dataset exposees cote admin/API

## Ce que ce dossier ne contient pas

- pas le schema SQL ou la persistance durable;
- pas la specification OpenAPI source de l'API publique;
- pas les primitives metier versionnees DecisionOps elles-memes;
- pas la taxonomie admin machine-readable, qui vit dans `contracts/admin/permission-taxonomy.v1.json`.

## Taxonomies et versioning a retenir

### Contrat public

- `contracts/openapi/public.yaml` fait foi pour:
  - les `paths`
  - les `methods`
  - les `operationId`
  - les composants schemas publics

### Admin

- les DTOs admin vivent ici, mais ne sont pas tous doubles par un contrat machine-readable dedie;
- la taxonomie des permissions admin, elle, fait foi dans `contracts/admin/permission-taxonomy.v1.json` puis est projetee dans `packages/shared-types/src/admin-permissions.ts`.

### DecisionOps

- les primitives versionnees vivent dans `contracts/decisionops/*`;
- ce dossier expose surtout les DTOs admin et les vues de lecture/ecriture autour de ces primitives.

### Evenements

- l'enveloppe versionnee vit dans `contracts/events/event-envelope.schema.json`;
- les vues et signaux exposes aux consumers TypeScript peuvent s'appuyer sur `product-event.ts` dans `src/domain/`.

## Integrations avec le reste du package

- re-export principal: `packages/shared-types/src/api.ts`
- certains types publics/admin sont aussi re-exportes depuis `packages/shared-types/src/index.ts`
- les tests de parite critiques vivent dans:
  - `app-api-ts/src/__tests__/openapi-public-contract.test.ts`
  - `packages/shared-types/src/__tests__/public-contract.test.ts`
  - `packages/shared-types/src/__tests__/admin-permissions.test.ts`

## Points d'attention

- `public-contract.ts` reste l'entree publique du manifeste type des operations non-admin.
- `public-contract/openapi-node.ts` est reserve aux usages Node de lecture structurelle de la spec, pas a l'API browser-friendly du package.
- une partie importante des surfaces admin vit uniquement dans les DTOs partages et le runtime `app-api-ts`; il faut donc toujours croiser cette lecture avec `app-api-ts/src/routes.ts`.
