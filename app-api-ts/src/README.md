# `src/` - Runtime applicatif API TS

## Role

Ce dossier contient tout le runtime Node de l'API exposee aux apps web Praedixa.

## Fichiers cle

- `index.ts` : bootstrap du process.
- `config.ts` : parsing/validation stricte des variables d'environnement.
- `server.ts` : serveur HTTP, CORS, auth, request id, reponses et middleware transverses.
- `auth.ts` : verification JWT, roles et contexte utilisateur.
- `router.ts` : matching de routes minimaliste et typage des handlers.
- `response.ts` : helpers `success` / `failure`.
- `routes.ts` : table de routes produit + admin.
- `admin-integrations.ts` : pont vers le runtime `app-connectors`.
- `mock-data.ts` : jeux de donnees de fallback encore utilises quand la persistance n'est pas active ou quand `DEMO_MODE` est explicitement permis.
- `types.ts` : types runtime partages entre config, auth et server.

## Comment ca s'integre avec le reste

- `app-webapp` appelle surtout la surface `/api/v1/live/*` et `/api/v1/*`.
- `app-admin` appelle la surface `/api/v1/admin/*`.
- `app-connectors` est appele pour les flux integrations admin.
- `app-api/` alimente les tables et jeux de donnees consommes ici, mais ne sert pas les requetes front directement.

## Familles de routes

Routes live / produit:

- dashboard, forecasts, canonical, proof, alerts, scenarios, operational decisions, decision config, conversations, support thread.

Routes admin:

- organisations, utilisateurs, billing, onboarding, monitoring, audit log, contact requests, canonical/datasets, proof packs, decision config, integrations.

## Auth et autorisation

- JWT OIDC verifies dans `auth.ts`.
- Rattachement org/site et roles propagés au `RouteContext`.
- Guards admin appliques sur la surface `/api/v1/admin/*`.
- Les appels sensibles restent couples a la persistance PostgreSQL quand disponible.

## Persistance et fallback

- `src/services/persistence.ts` ouvre le pool Postgres et protege les usages SQL.
- Quand la DB n'est pas disponible ou qu'un scope n'est pas eligible, plusieurs handlers gardent un fallback en memoire/demo.
- La frontiere la plus sensible est donc: route -> service -> persistance/fallback.

## Lecture conseillee pour un nouvel arrivant

1. `index.ts`
2. `config.ts`
3. `server.ts`
4. `auth.ts`
5. `routes.ts`
6. `services/README.md`
7. `__tests__/README.md`
