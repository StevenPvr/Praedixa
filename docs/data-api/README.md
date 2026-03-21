# Data API - PRD Connecteurs Praedixa

Ce dossier contient les PRD d'implementation des connecteurs data prioritaires pour rendre l'onboarding client "plug-and-play".

Objectif: si un premier client annonce "on utilise `X`", Praedixa peut brancher l'integration sans redesign technique.

Ces PRD sont alignes avec l'architecture medaillon Praedixa:

- `Bronze`: payloads bruts
- `Silver`: modeles canoniques normalises
- `Gold`: donnees pretes pour dashboards, forecasts et decisions

## Portefeuille des connecteurs

### Priorite P1 (demarrage commercial)

1. `Salesforce` (`prd-01-salesforce.md`)
2. `UKG` (`prd-02-ukg.md`)
3. `Toast` (`prd-03-toast.md`)
4. `Olo` (`prd-04-olo.md`)
5. `CDK` (`prd-05-cdk.md`)
6. `Reynolds & Reynolds` (`prd-06-reynolds-and-reynolds.md`)
7. `Geotab` (`prd-07-geotab.md`)
8. `Fourth` (`prd-08-fourth.md`)

### Priorite P2 (expansion verticale)

9. `Oracle Transportation Management` (`prd-09-oracle-transportation-management.md`)
10. `SAP Transportation Management` (`prd-10-sap-transportation-management.md`)
11. `Blue Yonder` (`prd-11-blue-yonder.md`)
12. `Manhattan` (`prd-12-manhattan.md`)
13. `NCR Aloha` (`prd-13-ncr-aloha.md`)

## PRD transverse

- Socle commun d'integration: `prd-00-integration-platform.md`
- Matrice de certification standard: `connector-certification-matrix.md`
- Audit API fournisseur vs implementation repo: `connector-api-implementation-audit.md`
- Politique runtime sandbox/prod: `sandbox-runtime-policy.md`
- Fondation replay/backfill/quarantine medaillon: `medallion-reprocessing-foundation.md`

## Mode d'utilisation

1. Valider le connecteur choisi par le client.
2. Ouvrir le PRD dedie.
3. Choisir explicitement `runtimeEnvironment=production|sandbox` et verifier les allowlists du runtime.
4. Verifier que le connecteur standard passe la matrice de certification et le verdict de readiness d'activation.
5. Completer la section "Checklist de branchement client".
6. Lancer l'implementation avec les exigences FR/NFR du PRD.

## Convention de statut

- `Ready for build`: spec suffisante pour demarrer le dev.
- `Blocked by vendor`: dependance de certification/contrat fournisseur.
- `Pilot`: connecteur disponible pour 1-2 clients references.
