# Guide de placement du code

Ce guide repond a la question "ou mettre cette nouvelle brique ?" avant d'ouvrir un fichier.

## Decision tree rapide

| Si tu ajoutes...                                                                              | Runtime / dossier cible                                                  | Ne pas mettre dans...                                                       |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| une page, un layout, un composant shell ou une route auth Next                                | `app-landing`, `app-webapp` ou `app-admin`                               | `app-api`, `app-api-ts`, `app-connectors`                                   |
| une route HTTP publique, un BFF, un guard auth API ou une orchestration synchrone metier      | `app-api-ts`                                                             | `app-api`                                                                   |
| un service HTTP d'integration, onboarding connecteur, sync runtime ou write-back              | `app-connectors`                                                         | `app-webapp`, `app-admin`, `app-api`                                        |
| une ingestion batch, medallion, forecasting, feature engineering, job ML ou recompute offline | `app-api`                                                                | les apps Next ou `app-api-ts`                                               |
| un DTO, type metier ou shape partage entre plusieurs apps TS                                  | `packages/shared-types`                                                  | une page app ou `packages/ui`                                               |
| une primitive UI generique reutilisable                                                       | `packages/ui`                                                            | `packages/shared-types` ou une app si plusieurs consommateurs existent deja |
| un contrat HTTP public                                                                        | `contracts/openapi/` puis `packages/shared-types` et le runtime concerne | une app seule sans contrat versionne                                        |
| un guardrail de build, script de gate ou runbook operatoire                                   | `scripts/` et `docs/runbooks/`                                           | une app                                                                     |

## Regles repo-wide

- `packages/shared-types` reste un leaf package: pas d'import depuis `packages/ui` ni depuis une app.
- `packages/ui` peut dependre de `packages/shared-types`, pas l'inverse.
- `app-api-ts` et `app-connectors` ne doivent pas importer `packages/ui`.
- Une primitive transverse commence par un contrat ou un type partage avant de se dupliquer dans plusieurs apps.

## Cas qui imposent une revue architecture

- un doute entre `app-api-ts` et `app-api`;
- un nouveau payload traverse plus d'un runtime;
- un besoin semble pousser une app a importer une autre app;
- une exception de placement semble "temporaire".

Si un de ces cas apparait, ouvrir d'abord `docs/architecture/adr/` puis demander la review du sous-systeme owner dans `ownership-matrix.md`.
