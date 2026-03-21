# `src/__tests__/` - Tests Vitest API TS

## Role

Les tests de ce dossier couvrent le runtime API TS sans passer par les frontends.

## Couverture actuelle

- `auth.test.ts` : JWT, claims canoniques top-level, refus explicite des aliases legacy, garde-fous auth et publication des reponses `400/401/403` sur toute la surface OpenAPI protegee.
- `server.test.ts` : comportement serveur, erreurs transport, headers, guards et invariants anti-escalade sur les routes admin sensibles.
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
- `admin-monitoring.test.ts` : KPI et vues monitoring admin, y compris le miroir org cale sur la table persistante `users` et non sur une table legacy `employees`.
- `admin-backoffice-organizations.test.ts` : listing persistant des organisations admin, filtres, pagination, et garde-fou sur la jointure `coverage_alerts.site_id (varchar) -> sites.id::text`.
- `admin-backoffice-conversations.test.ts` : compteur persistant des messages non lus admin, total + regroupement par organisation.
- `admin-backoffice-contact-requests.test.ts` : listing persistant des demandes de contact admin et mutation de statut.
- `admin-backoffice-audit-log.test.ts` : listing persistant du journal admin avec pagination et filtre `action`.
- `admin-onboarding.test.ts` : service onboarding BPM persistant, y compris le garde-fou sur les actor ids opaques et le passage des brouillons de tache vers le runtime.
- `admin-onboarding-support.test.ts` : validation stricte des payloads operateurs onboarding, notamment l'evidence d'invitations securisees requise pour completer `access-model`.
- `admin-onboarding-routes.test.ts` : exposition HTTP admin de la supervision cross-org, du workspace de case onboarding, des commandes `save/complete` sur les taches et des actions lifecycle `recompute/cancel/reopen`.
- `admin-onboarding.camunda.integration.test.ts` : smoke reel `Postgres + Camunda 8` pour `create case -> projection -> complete user task`.
- `index.startup.test.ts` : garde-fou de bootstrap pour garantir qu'un Camunda indisponible ne fait plus tomber tout le serveur API au demarrage.
- `admin-org-overview-route.test.ts` : payload composite `organization + mirror + billing + alerts + scenarios` pour le dashboard client admin.
- `admin-integrations.test.ts` : reduction de surface du pont `app-connectors -> app-api-ts` pour que le listing admin des raw events reste metadata-only et n'expose ni `payloadPreview` ni metadonnees runtime inutiles.
- `openapi-public-contract.test.ts` : parite entre `contracts/openapi/public.yaml` et la surface runtime non-admin.
- `public-openapi-contract.test.ts` : qualite de la spec publique depuis l'export workspace `@praedixa/shared-types/public-contract-node`, sans dependre d'un build `dist/` local.

## Commande

```bash
pnpm --filter @praedixa/api-ts test
pnpm test:camunda:onboarding
```

## Conseils de lecture

- Commencer par `config.test.ts` et `auth.test.ts` pour comprendre les invariants.
- `config.test.ts` couvre aussi le durcissement SSRF du runtime `app-connectors` (`CONNECTORS_RUNTIME_ALLOWED_HOSTS`).
- `auth.test.ts` et `realm-audience-mapper.test.ts` verrouillent le contrat OIDC canonique; aucun fallback implicite depuis des claims legacy n'est encore accepte.
- `auth.test.ts` verrouille aussi le contrat OpenAPI des erreurs standard pour toutes les routes bearer exposees publiquement.
- Lire ensuite `routes.contracts.test.ts` pour le contrat HTTP reeellement expose par le runtime.
- Finir par les tests de services pour la persistance.
- Le smoke `admin-onboarding.camunda.integration.test.ts` est volontairement cible et n'est pas dans la boucle unitaire par defaut; il valide le runtime Camunda self-managed local via `RUN_CAMUNDA_INTEGRATION_TESTS=true`.
- `operational-data.test.ts` et `gold-explorer.test.ts` verrouillent aussi le fail-closed quand un `site_id` demande sort du scope accessible.
- `operational-scenarios.test.ts` et `operational-decisions.test.ts` verrouillent les slices live deja raccordes a la persistance afin d'eviter un retour a des payloads derives du front.
- `routes.contracts.test.ts` couvre aussi les endpoints admin read-only `approval-inbox`, `action-dispatches/:actionId` et `ledgers/:ledgerId` pour garantir qu'une page admin ne tombe plus sur un 404 implicite, un parametre non valide accepte silencieusement ou un faux succes sans persistance.
- `routes.contracts.test.ts` couvre aussi la mutation admin `approvals/:approvalId/decision` pour garantir que les validations body/identifiants restent fail-close avant toute persistance.
