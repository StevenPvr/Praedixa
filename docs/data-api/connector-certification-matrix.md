# Connector Certification Matrix

Source de verite runtime: `app-connectors/src/certification.ts`

## Objectif

Versionner la definition minimale "build-ready" attendue pour chaque connecteur standard du catalogue Praedixa, afin d'eviter les integrations partiellement ouvertes ou les surfaces qui divergent entre doc, runtime et tests.

## Invariants communs

- Tous les connecteurs standards doivent couvrir `full sync` et `incremental sync`.
- Tous les connecteurs standards doivent offrir `connection test`, `replay`, `backfill`, retention Raw et audit append-only.
- Tous les connecteurs standards doivent publier vers les trois cibles medaillon `bronze`, `silver`, `gold`.
- Tous les connecteurs standards doivent disposer de fixtures representatives pour les tests de certification.

## Scenarios de certification requis

- `catalog`
- `connection_create`
- `activation_readiness`
- `connection_test`
- `full_sync`
- `incremental_sync`
- `replay`
- `backfill`
- `raw_retention`
- `audit_events`
- `service_token_scope`

## Fixtures representatives executables

La matrice n'est pas seulement narrative: chaque ligne standard doit avoir une fixture executable dans `app-connectors/src/__tests__/fixtures/certification-fixtures.ts`.

Chaque fixture verrouille au minimum:

- les modes d'authentification concrets et leurs `credentialFields`
- le verdict `activation_readiness` minimal pour un connecteur standard (`requiredConfigFields`, credentials stockes, autorisation OAuth si applicable, probe target)
- le `probe`/`connection test` principal, son auth mode et l'objet smoke-read attendu
- le contrat de `replay` (`triggerType=replay`, fenetre source, idempotence, relecture Raw)
- le contrat de retention Raw (`integration_raw_events`, append-only, payload store immutable, evidence audit)

Le test de reference est `app-connectors/src/__tests__/certification.test.ts`.
La regression comportementale du verdict d'activation vit dans `app-connectors/src/__tests__/activation-readiness.test.ts`.

## Matrice standard actuelle

| Vendor        | Domain       | Auth modes                   | Onboarding modes                                               | Sync cible | Raw retention | Replay | Backfill |
| ------------- | ------------ | ---------------------------- | -------------------------------------------------------------- | ---------- | ------------- | ------ | -------- |
| `salesforce`  | `crm`        | `oauth2`, `service_account`  | `interactive_oauth`, `managed_service_account`, `push_api`     | `30 min`   | `30 j`        | oui    | oui      |
| `ukg`         | `wfm`        | `oauth2`, `api_key`          | `credential_submission`, `push_api`                            | `30 min`   | `30 j`        | oui    | oui      |
| `toast`       | `pos`        | `oauth2`, `api_key`          | `credential_submission`, `push_api`                            | `15 min`   | `30 j`        | oui    | oui      |
| `olo`         | `pos`        | `api_key`                    | `credential_submission`, `push_api`                            | `15 min`   | `30 j`        | oui    | oui      |
| `cdk`         | `dms`        | `service_account`, `sftp`    | `managed_service_account`, `credential_submission`, `push_api` | `60 min`   | `30 j`        | oui    | oui      |
| `reynolds`    | `dms`        | `service_account`, `sftp`    | `managed_service_account`, `credential_submission`, `push_api` | `60 min`   | `30 j`        | oui    | oui      |
| `geotab`      | `telematics` | `session`                    | `credential_submission`, `push_api`                            | `10 min`   | `30 j`        | oui    | oui      |
| `fourth`      | `wfm`        | `api_key`, `sftp`            | `credential_submission`, `push_api`                            | `30 min`   | `30 j`        | oui    | oui      |
| `oracle_tm`   | `tms`        | `oauth2`, `service_account`  | `credential_submission`, `managed_service_account`, `push_api` | `30 min`   | `30 j`        | oui    | oui      |
| `sap_tm`      | `tms`        | `oauth2`, `service_account`  | `credential_submission`, `managed_service_account`, `push_api` | `30 min`   | `30 j`        | oui    | oui      |
| `blue_yonder` | `planning`   | `api_key`, `service_account` | `credential_submission`, `managed_service_account`, `push_api` | `60 min`   | `30 j`        | oui    | oui      |
| `manhattan`   | `planning`   | `api_key`, `service_account` | `credential_submission`, `managed_service_account`, `push_api` | `30 min`   | `30 j`        | oui    | oui      |
| `ncr_aloha`   | `pos`        | `api_key`, `sftp`            | `credential_submission`, `push_api`                            | `15 min`   | `30 j`        | oui    | oui      |

## Verification

- `pnpm --dir app-connectors test -- src/__tests__/certification.test.ts`
- `pnpm --dir app-connectors lint`
- `pnpm --dir app-connectors typecheck`
- `pnpm --dir app-connectors build`
