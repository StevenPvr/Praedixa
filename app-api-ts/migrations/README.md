# `migrations/` - SQL versionne API TS

## Role

Ce dossier contient les migrations SQL specifiques au runtime TypeScript.

## Contenu

- `001_decision_engine_config.sql`
  - schema de base pour le moteur `decision-config`
  - supporte la persistance/versioning admin exposee par `src/services/decision-config.ts`

## Usage

Ces scripts doivent rester alignes avec:

- `src/services/decision-config.ts`
- les routes admin `decision-config`
- les tests `config/persistence/decision-config`

Si le schema du moteur change, mettre a jour la migration ajoutee ici et la documentation des services associes.
