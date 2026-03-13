# `src/__tests__/` - Tests Vitest API TS

## Role

Les tests de ce dossier couvrent le runtime API TS sans passer par les frontends.

## Couverture actuelle

- `auth.test.ts` : JWT, claims canoniques top-level, refus explicite des aliases legacy et garde-fous auth.
- `server.test.ts` : comportement serveur, erreurs transport, headers et guards.
- `config.test.ts` : parsing env et validation des variables runtime.
- `routes.contracts.test.ts` : contrat fail-close des routes reelles, routes qui restent disponibles sans persistance, et garde-fous contre toute reintroduction de payloads demo/stub.
- `realm-audience-mapper.test.ts` : contrat Keycloak versionne pour `audience`, `role`, `organization_id`, `site_id` et `permissions` admin.
- `persistence.test.ts` : garde-fous DB et compatibilite UUID.
- `operational-data.test.ts` : requetes SQL et mappings live/admin.
- `operational-scenarios.test.ts` : lecture persistante des scenarios live et du workspace de decision.
- `operational-decisions.test.ts` : creation, listing et statistiques des decisions operationnelles persistantes.
- `decisionops-runtime.test.ts` : initialisation et lectures persistantes du runtime `approval -> dispatch -> ledger`.
- `decisionops-runtime-approval.test.ts` : mutation persistante des decisions d'approbation, annulation coherente sur rejet et synchronisation interne action/ledger.
- `operational-live-routes.test.ts` : branchement des routes live vers les services persistants et normalisation des payloads publics.
- `gold-explorer.test.ts` : surface Gold persistante.
- `admin-monitoring.test.ts` : KPI et vues monitoring admin.
- `openapi-public-contract.test.ts` : parite entre `contracts/openapi/public.yaml` et la surface runtime non-admin.
- `public-openapi-contract.test.ts` : qualite de la spec publique depuis l'export workspace `@praedixa/shared-types/public-contract-node`, sans dependre d'un build `dist/` local.

## Commande

```bash
pnpm --filter @praedixa/api-ts test
```

## Conseils de lecture

- Commencer par `config.test.ts` et `auth.test.ts` pour comprendre les invariants.
- `config.test.ts` couvre aussi le durcissement SSRF du runtime `app-connectors` (`CONNECTORS_RUNTIME_ALLOWED_HOSTS`).
- `auth.test.ts` et `realm-audience-mapper.test.ts` verrouillent le contrat OIDC canonique; aucun fallback implicite depuis des claims legacy n'est encore accepte.
- Lire ensuite `routes.contracts.test.ts` pour le contrat HTTP reeellement expose par le runtime.
- Finir par les tests de services pour la persistance.
- `operational-data.test.ts` et `gold-explorer.test.ts` verrouillent aussi le fail-closed quand un `site_id` demande sort du scope accessible.
- `operational-scenarios.test.ts` et `operational-decisions.test.ts` verrouillent les slices live deja raccordes a la persistance afin d'eviter un retour a des payloads derives du front.
- `routes.contracts.test.ts` couvre aussi les endpoints admin read-only `approval-inbox`, `action-dispatches/:actionId` et `ledgers/:ledgerId` pour garantir qu'une page admin ne tombe plus sur un 404 implicite, un parametre non valide accepte silencieusement ou un faux succes sans persistance.
- `routes.contracts.test.ts` couvre aussi la mutation admin `approvals/:approvalId/decision` pour garantir que les validations body/identifiants restent fail-close avant toute persistance.
