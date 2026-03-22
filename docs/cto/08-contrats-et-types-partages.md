# 08 - Contrats Et Types Partages

- Statut: actif
- Owner: engineering
- Derniere revue: 2026-03-21
- Source de verite: `contracts/*`, `packages/shared-types/*`, `contracts/openapi/public.yaml`
- Depend de: `docs/cto/02-vocabulaire-et-domaines.md`, `contracts/README.md`, `packages/shared-types/README.md`
- Voir aussi: `app-api-ts/src/routes.ts`, `app-api-ts/src/__tests__/openapi-public-contract.test.ts`, `packages/shared-types/src/__tests__/public-contract.test.ts`, `docs/cto/visuals/decisionops-primitives.mmd`

## But

Expliquer ou se trouvent les contrats normatifs, comment ils se projettent dans les types TypeScript partages, et quel runtime consomme quelle source de verite.

## Hierarchie des sources de verite

| Famille                 | Source normative                                                                                     | Projection type partagee                                                                                                       | Runtimes consommateurs                              | Notes                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- | ----------------------------------------------------------------- |
| API publique non-admin  | `contracts/openapi/public.yaml`                                                                      | `packages/shared-types/src/api/public-contract.ts`, `requests.ts`, `responses.ts`                                              | `app-api-ts`, `app-webapp`, `app-admin`, tests      | seule surface HTTP publiquement versionnee                        |
| Contrats admin internes | `packages/shared-types/src/api/*` et, quand versionne machine-readable, `contracts/admin/*`          | memes fichiers `shared-types`                                                                                                  | `app-admin`, `app-api-ts`, scripts internes         | `contracts/admin/` n'est pas un OpenAPI admin complet aujourd'hui |
| Permissions admin       | `contracts/admin/permission-taxonomy.v1.json`                                                        | `packages/shared-types/src/admin-permissions.ts`                                                                               | `app-admin`, `app-api-ts`, scripts IdP              | parite testee par script                                          |
| Primitives DecisionOps  | `contracts/decisionops/*.schema.json`                                                                | `packages/shared-types/src/domain/decision-contract.ts`, `decision-graph.ts`, `approval.ts`, `action-dispatch.ts`, `ledger.ts` | admin runtime, services DecisionOps, tests          | normes metier versionnees                                         |
| Evenements internes     | `contracts/events/event-envelope.schema.json`                                                        | telemetry runtime et consommateurs event-driven; pas de miroir TS strict complet aujourd'hui                                   | producteurs/consommateurs evenements, observabilite | enveloppe versionnee, payload version séparée                     |
| DTOs admin metier       | `packages/shared-types/src/api/admin-*.ts`, `approval-*.ts`, `ledger-*.ts`, `decision-contract-*.ts` | memes fichiers                                                                                                                 | `app-admin`, `app-api-ts`                           | contrats stables mais non publics                                 |

## Carte rapide des artefacts

### Contrat OpenAPI public

- Fichier pivot: `contracts/openapi/public.yaml`
- Helper TS partage: `packages/shared-types/src/api/public-contract.ts`
- Helper Node de lecture structurelle: `packages/shared-types/src/public-contract-node.ts`
- Types write publics: `packages/shared-types/src/api/requests.ts`
- Enveloppes de reponse: `packages/shared-types/src/api/responses.ts`
- Verification de parite runtime/spec: `app-api-ts/src/__tests__/openapi-public-contract.test.ts`
- Verification de parite spec/types: `packages/shared-types/src/__tests__/public-contract.test.ts`

### Contrats admin internes

- Organisation et lifecycle admin: `packages/shared-types/src/api/admin-organizations.ts`
- Onboarding BPM admin: `packages/shared-types/src/api/admin-onboarding.ts`
- Approval inbox: `packages/shared-types/src/api/approval-inbox.ts`
- Decision d'approbation: `packages/shared-types/src/api/approval-decision.ts`
- Action dispatch detail et fallback: `packages/shared-types/src/api/action-dispatch-detail.ts`, `action-dispatch-fallback.ts`, `action-dispatch-decision.ts`
- Ledger admin: `packages/shared-types/src/api/ledger-detail.ts`, `ledger-decision.ts`
- Contract Studio runtime: `packages/shared-types/src/api/decision-contract-studio.ts`, `decision-contract-templates.ts`, `decision-compatibility.ts`

### Contrats machine-readable versionnes

- Permissions admin: `contracts/admin/permission-taxonomy.v1.json`
- Decision contract: `contracts/decisionops/decision-contract.schema.json`
- Decision graph: `contracts/decisionops/decision-graph.schema.json`
- Approval: `contracts/decisionops/approval.schema.json`
- Action dispatch: `contracts/decisionops/action-dispatch.schema.json`
- Ledger entry: `contracts/decisionops/ledger-entry.schema.json`
- Event envelope: `contracts/events/event-envelope.schema.json`
- Verification machine-readable de parite: `scripts/check-contract-ts-parity.mjs`

## Correspondance contrat -> types -> runtime

| Contrat normatif                                      | Type partage principal                                                                 | Runtimes                                          | Ce que le CTO doit retenir                                                                                                 |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `contracts/openapi/public.yaml`                       | `packages/shared-types/src/api/public-contract.ts`                                     | `app-api-ts`, BFF Next, tests                     | la spec publique fait foi pour les paths, methods, `operationId` et composants schemas non-admin                           |
| `contracts/openapi/public.yaml#/components/schemas/*` | `packages/shared-types/src/api/requests.ts` et `responses.ts`                          | `app-api-ts`, clients TS                          | les payloads write publics ne doivent pas etre reconstruits a la main dans les frontends                                   |
| `contracts/admin/permission-taxonomy.v1.json`         | `packages/shared-types/src/admin-permissions.ts`                                       | admin auth, UI admin, scripts Keycloak            | toute nouvelle permission admin doit naitre ici avant usage runtime                                                        |
| `contracts/decisionops/decision-contract.schema.json` | `packages/shared-types/src/domain/decision-contract.ts`                                | Contract Studio, validations, tests               | le contrat metier versionne est distinct des routes HTTP et distinct de `decision-config`                                  |
| `contracts/decisionops/decision-graph.schema.json`    | `packages/shared-types/src/domain/decision-graph.ts`                                   | explorateurs, compatibilite, services DecisionOps | le graphe versionne relie entites, metrics, dimensions et horizons                                                         |
| `contracts/decisionops/approval.schema.json`          | `packages/shared-types/src/domain/approval.ts` + `src/api/approval-*.ts`               | admin approval runtime                            | approval = primitive metier + DTOs admin derives                                                                           |
| `contracts/decisionops/action-dispatch.schema.json`   | `packages/shared-types/src/domain/action-dispatch.ts` + `src/api/action-dispatch-*.ts` | dispatch runtime, admin detail                    | la primitive versionnee et la vue admin detaillee ne sont pas le meme artefact                                             |
| `contracts/decisionops/ledger-entry.schema.json`      | `packages/shared-types/src/domain/ledger.ts` + `src/api/ledger-*.ts`                   | ledger runtime, admin read/write                  | ledger = trace economique normative, pas simple reporting                                                                  |
| `contracts/events/event-envelope.schema.json`         | telemetry runtime et futurs consommateurs event-driven                                 | producteurs/consommateurs d'evenements, telemetry | `schema_version` porte l'enveloppe, `payload_version` porte le message metier; pas de miroir TS strict complet aujourd'hui |

## Differences de version a ne pas melanger

| Champ              | Niveau                          | Porte par                                                       | Exemple d'usage                                        |
| ------------------ | ------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------ |
| `schema_version`   | structure du schema             | `contracts/decisionops/*`, `contracts/events/*`                 | version d'un JSON Schema ou de l'enveloppe d'evenement |
| `payload_version`  | structure du payload transporte | `contracts/events/event-envelope.schema.json`                   | evolution additive d'un payload d'evenement            |
| `contract_version` | revision metier                 | `DecisionContract`, `Approval`, `ActionDispatch`, `LedgerEntry` | nouvelle publication d'un contrat de decision          |
| `graph_version`    | revision metier d'un graphe     | `DecisionGraph`                                                 | nouvelle revision du modele semantique                 |
| `info.version`     | version de contrat HTTP         | `contracts/openapi/public.yaml`                                 | major/minor de l'API publique                          |

## Ce qui est public, interne, ou simplement partage

| Niveau                             | Artefacts                                                                           | Exposition                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Public versionne                   | `contracts/openapi/public.yaml`                                                     | consommable hors admin, versionne, stabilise                     |
| Interne versionne machine-readable | `contracts/admin/*.json`, `contracts/decisionops/*.json`, `contracts/events/*.json` | pour admin/control plane/domain events                           |
| Interne partage TypeScript         | `packages/shared-types/src/api/*.ts`                                                | stable entre `app-admin`, `app-api-ts`, BFF et tests             |
| Types metier transverses           | `packages/shared-types/src/domain/*.ts`                                             | lisibles par plusieurs apps, pas des contrats HTTP par eux-memes |

## Workflow recommande quand un contrat change

1. Modifier d'abord la source normative:
   `contracts/openapi/public.yaml`, `contracts/admin/*.json`, `contracts/decisionops/*.json` ou `contracts/events/*.json` selon le cas.
2. Aligner ensuite la projection TypeScript partagee dans `packages/shared-types/src/api/*` ou `src/domain/*`.
3. Aligner le ou les runtimes consommateurs:
   `app-api-ts`, `app-admin`, `app-webapp`, `app-connectors`, jobs ou scripts.
4. Rejouer au minimum:
   `pnpm --filter @praedixa/shared-types build`, `pnpm --filter @praedixa/api-ts typecheck`, puis `pnpm docs:validate:contracts-parity` si le contrat fait partie des miroirs critiques versionnes.

## Ambiguites actuelles a expliciter

- `contracts/admin/` n'est pas aujourd'hui une spec admin exhaustive equivalent a `contracts/openapi/public.yaml`; une partie importante des DTO admin vit directement dans `packages/shared-types/src/api/*`.
- `DecisionContract` et `decision-config` coexistent; le premier est la primitive versionnee cible, le second reste un moteur runtime coverage-specifique.
- Les types de domaine `shared-types/src/domain/*` expriment un langage commun, mais la source de verite finale du schema persistant reste cote `app-api/app/models/*` et Alembic.
- `contracts/events/event-envelope.schema.json` ne dispose pas encore d'un miroir TypeScript strict au meme niveau que les contrats DecisionOps; il faut donc eviter de le presenter comme un contrat deja double a l'identique dans `shared-types`.

## References rapides

- `contracts/openapi/public.yaml`
- `contracts/admin/permission-taxonomy.v1.json`
- `contracts/decisionops/decision-contract.schema.json`
- `contracts/decisionops/decision-graph.schema.json`
- `contracts/decisionops/approval.schema.json`
- `contracts/decisionops/action-dispatch.schema.json`
- `contracts/decisionops/ledger-entry.schema.json`
- `contracts/events/event-envelope.schema.json`
- `packages/shared-types/src/api/public-contract.ts`
- `packages/shared-types/src/api/requests.ts`
- `packages/shared-types/src/api/responses.ts`
- `packages/shared-types/src/admin-permissions.ts`
- `packages/shared-types/src/public-contract-node.ts`
