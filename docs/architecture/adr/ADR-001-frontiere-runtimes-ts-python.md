# ADR-001 - Frontiere runtimes TS user-facing vs Python data/ML

- Statut: accepted
- Date: 2026-03-12

## Contexte

Le monorepo porte deux familles de runtime:

- des apps et services HTTP user-facing en TypeScript;
- une data platform et un moteur data/ML en Python.

La frontiere doit rester explicite pour eviter de disperser un meme flux entre deux runtimes.

## Decision

Praedixa garde la regle suivante:

- tout ce qui expose une surface web, BFF, auth, admin/client ou HTTP operateur reste en TypeScript/Next.js/Node.js;
- tout ce qui releve d'ingestion, medallion, batch, forecasting, feature engineering, modelisation et ML reste dans `app-api` en Python.

## Regles d'application

- Une page, une route Next, une route BFF, une route OIDC ou une API HTTP consommee par le web se place cote TypeScript.
- Un job batch, un pipeline de transformation, une etape Bronze/Silver/Gold, un service de prevision ou un moteur de donnees se place cote Python.
- Si une feature traverse les deux mondes, le point d'entree user-facing reste cote TypeScript et appelle la couche data existante au lieu de dupliquer le flux en Python.

## Preuves repo

- `package.json` expose les surfaces TS `dev:landing`, `dev:webapp`, `dev:admin`, `dev:api`, `dev:connectors`.
- `app-api-ts/src/README.md` dit que `app-api/` alimente les tables mais ne sert pas directement les requetes front.
- `infra/README.md` rappelle que les services de data platform restent cote Python.
- `app-api/app/core/config.py` est le point de config du moteur `Data/ML engine`.

## Consequences

- Un nouvel entrant sait ou placer une feature sans arbitrage oral.
- Les flux user-facing gardent le meme modele de build, auth et deploiement.
- Les travaux data/ML restent regroupes autour du runtime Python et de ses garde-fous.
