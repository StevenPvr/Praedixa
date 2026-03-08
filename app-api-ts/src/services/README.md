# `src/services/` - Services metier et persistance API TS

## Role

Ce dossier concentre les acces SQL et les transformations de donnees consommees par `routes.ts`.

## Fichiers

- `persistence.ts`
  - pool `pg`
  - helpers transactionnels
  - normalisation erreurs SQL
  - garde-fous `DATABASE_URL` et validation UUID

- `operational-data.ts`
  - lecture des alertes de couverture, canonical, dashboards live, forecasts, proof packs, onboarding
  - mapping des enregistrements persistants vers les DTO utilises par les routes live et admin

- `gold-explorer.ts`
  - exploration schema, lignes, couverture et provenance des tables Gold persistantes
  - alimente la surface `/api/v1/live/gold/*`

- `decision-config.ts`
  - service singleton de configuration du moteur de decision
  - resolution des horizons et options recommandees
  - historisation/versioning admin

- `admin-monitoring.ts`
  - KPIs plateforme
  - tendances, erreurs, ROI, couverture canonicale, adoption decisions
  - surface de monitoring pour le backoffice

- `admin-backoffice.ts`
  - service agrege pour organisations, utilisateurs, onboarding, billing, conversations, alerts et datasets admin
  - expose un point d'entree unique cote handlers admin

## Flux standard

1. `routes.ts` valide la requete et le contexte.
2. Le handler appelle un service ici.
3. Le service interroge Postgres ou transforme les lignes brutes.
4. Le handler repond via `success()` ou `failure()`.

## Dependances fortes

- `DATABASE_URL` pour toute persistance.
- `DecisionConfigService` initialise au demarrage via `src/index.ts`.
- `app-connectors` pour les appels admin integrations, hors de ce dossier.

## Quand modifier quoi

- Ajouter une nouvelle lecture SQL produit/admin : `operational-data.ts`, `gold-explorer.ts` ou `admin-monitoring.ts`.
- Ajouter une operation admin transverse : `admin-backoffice.ts`.
- Modifier le moteur de configuration de decision : `decision-config.ts` + migration SQL si schema touche.
- Modifier les garde-fous DB : `persistence.ts`.
