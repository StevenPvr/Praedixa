# `migrations/` - SQL versionne API TS

## Role

Ce dossier contient les migrations SQL specifiques au runtime TypeScript.

## Contenu

- `001_decision_engine_config.sql`
  - schema de base pour le moteur `decision-config`
  - supporte la persistance/versioning admin exposee par `src/services/decision-config.ts`
- `002_decisionops_runtime_guards.sql`
  - garde-fou DB pour l'idempotence persistante des `action_dispatches`
  - renforce la prevention des doublons silencieux quand le read-model DecisionOps existe deja
- `003_decision_contract_runtime.sql`
  - schema persistant du Contract Studio org-scoped (`decision_contract_versions`, `decision_contract_audit`)
  - versioning, lifecycle, fork et rollback des `DecisionContract`

## Usage

Ces scripts doivent rester alignes avec:

- `src/services/decision-config.ts`
- `src/services/decision-contract-runtime.ts`
- les routes admin `decision-config`
- les routes admin `decision-contracts`
- les tests `config/persistence/decision-config`

Si le schema du moteur change, mettre a jour la migration ajoutee ici et la documentation des services associes.
Si le runtime DecisionOps persistant gagne de nouveaux invariants SQL, les versionner aussi ici plutot que de les laisser implicites dans le seul code applicatif.
