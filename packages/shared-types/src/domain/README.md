# Domain

## Role

Ce dossier regroupe les types metier partages entre les apps Praedixa et les runtimes TypeScript.

Pour un CTO, il faut le lire comme:

- la projection TypeScript du vocabulaire metier transverse;
- la couche de types consommee par `app-webapp`, `app-admin` et `app-api-ts`;
- un complement aux contrats versionnes de `contracts/*`, pas comme leur substitut.

## Sources de verite a ne pas confondre

- les structures JSON normatives versionnees vivent dans `contracts/*`;
- les types metier TypeScript partages vivent ici;
- les tables et modeles SQL persistants vivent surtout dans `app-api/app/models/*`;
- les DTOs HTTP partages vivent dans `packages/shared-types/src/api/*`.

## Modules actuellement presents

### Coeur produit

- `organization.ts`
  - organisations, sites, departments, statuts, plans et structure cliente
- `decision.ts`
  - decisions historiques, arbitrages et analyses de cout associees
- `forecast.ts`
  - runs de prevision, indicateurs de precision et vues forecast
- `dashboard.ts`
  - resumes et widgets de dashboard
- `user-preferences.ts`
  - preferences utilisateur portees cote front/API

### Donnees et operations

- `dataset.ts`
  - datasets client, colonnes, ingestion, qualite de base
- `dataset-health.ts`
  - signaux de fraicheur, volume, erreurs et lineage de sante dataset
- `canonical.ts`
  - representation canonique operationnelle
- `coverage-alert.ts`
  - alertes de couverture, severites et horizons
- `scenario.ts`
  - options et frontiere de scenarios
- `operational-decision.ts`
  - decisions operateur prises sur les alertes/scenarios
- `cost-parameter.ts`
  - parametres de couts et configurations de site
- `report.ts`
  - proof packs, couts et rapports

### DecisionOps

- `decision-config.ts`
  - moteur coverage historique encore present cote runtime
- `decision-workspace.ts`
  - surface de travail et vues de comparaison decisionnelles
- `decision-contract.ts`
  - primitive metier versionnee `DecisionContract`
- `decision-contract-template.ts`
  - templates de contrats de decision
- `decision-graph.ts`
  - primitive versionnee `DecisionGraph`
- `approval.ts`
  - primitive versionnee `Approval`
- `action-dispatch.ts`
  - primitive versionnee `ActionDispatch`
- `action-template.ts`
  - catalogue de payloads/templates d'actions
- `ledger.ts`
  - primitive versionnee `LedgerEntry`

### Integrations et evenements

- `integration.ts`
  - vendors, auth modes, connexions et syncs cote types partages
- `mapping-studio.ts`
  - mapping studio, transformations et statuts de mapping
- `product-event.ts`
  - enveloppes et types d'evenements produit exposes cote TS

## Groupes de taxonomies utiles a un CTO

### Statuts

- statuts d'organisation et de plan;
- statuts forecast, dataset, ingestion, quality;
- statuts coverage/scenario/decision;
- statuts DecisionOps (`draft`, `testing`, `approved`, `published`, etc.);
- statuts integration (`connection`, `sync`, readiness, mapping, payload health).

### Versions

- `schema_version`
  - version structurelle d'un schema machine-readable
- `payload_version`
  - version du payload transporte dans une enveloppe d'evenement
- `contract_version`
  - revision metier d'un contrat de decision
- `graph_version`
  - revision metier d'un graphe

### Identifiants transverses

- `organization_id`
- `site_id`
- `contract_id`
- `graph_id`
- `event_id`
- `request_id`
- `trace_id`
- `run_id`
- `connector_run_id`

## Integrations avec le reste du package

- re-export principal: `packages/shared-types/src/domain.ts`
- certains modules sont aussi re-exportes depuis `packages/shared-types/src/index.ts`
- les surfaces HTTP partagées consomment plusieurs types de ce dossier via `src/api/*`

## Points d'attention

- `decision-config.ts` et `decision-contract.ts` ne sont pas synonymes:
  le premier decrit un runtime coverage existant, le second une primitive DecisionOps versionnee.
- `integration.ts` raconte le contrat type partage des integrations, mais la realite runtime doit aussi etre verifiee dans `app-connectors`.
- ce dossier ne suffit pas a lui seul pour inferrer la persistance: toujours recouper avec `app-api/app/models/*` et les migrations Alembic.
