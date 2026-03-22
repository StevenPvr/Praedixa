# `migrations/` - SQL versionne API TS

## Role

Ce dossier contient les migrations SQL specifiques au runtime TypeScript.

## Contenu

- `001_decision_engine_config.sql`
  - schema de base pour le moteur `decision-config`
  - supporte la persistance/versioning admin exposee par `src/services/decision-config.ts`
  - reste en DDL plat (`CREATE TABLE` / `CREATE INDEX`) pour rester lisible par les parseurs SQL qui rechignent sur les blocs `DO $$` ou les clauses `IF NOT EXISTS`
- `002_decisionops_runtime_guards.sql`
  - index d'idempotence persistant pour `action_dispatches`
  - reste en DDL plat pour garder le parseur SQL content
- `003_decision_contract_runtime.sql`
  - schema persistant du Contract Studio org-scoped (`decision_contract_versions`, `decision_contract_audit`)
  - versioning, lifecycle, fork et rollback des `DecisionContract`
  - reste en DDL plat, sans les blocs de reconciliation legacy qui vivent ailleurs dans le runtime
- `004_identity_invitation_delivery.sql`
  - journal des tentatives d'invitation Keycloak et des evenements provider Resend
  - preuves de delivery persistantes pour distinguer `execute-actions-email accepte` et `delivery prouvee / bounced / failed`

## Usage

Ces scripts doivent rester alignes avec:

- `src/services/decision-config.ts`
- `src/services/decision-contract-runtime.ts`
- `src/services/invitation-delivery-proof.ts`
- les routes admin `decision-config`
- les routes admin `decision-contracts`
- les tests `config/persistence/decision-config`

Si le schema du moteur change, mettre a jour la migration ajoutee ici et la documentation des services associes.
Si le runtime DecisionOps persistant gagne de nouveaux invariants SQL, les versionner aussi ici plutot que de les laisser implicites dans le seul code applicatif.
