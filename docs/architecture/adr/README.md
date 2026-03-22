# ADRs

Ce dossier garde un registre minimal des decisions d'architecture deja en vigueur.
Une ADR ici doit rester courte, actionnable et verifiable dans le repo.

## Index

| ID      | Statut   | Sujet                                               | Date       |
| ------- | -------- | --------------------------------------------------- | ---------- |
| ADR-001 | accepted | Frontiere runtimes TS user-facing vs Python data/ML | 2026-03-12 |
| ADR-002 | accepted | Contrats partages et packages de reference          | 2026-03-12 |
| ADR-003 | accepted | Isolation multi-tenant en profondeur                | 2026-03-12 |
| ADR-004 | accepted | Source de verite runtime des integrations           | 2026-03-21 |

## Regles de tenue

- Une ADR capture une decision durable, pas une tache ou une idee.
- Toute ADR doit citer des preuves repo concretes.
- Si une decision change, on cree une nouvelle ADR et on marque l'ancienne `superseded`.
- Si une ADR n'est plus pertinente sans remplacante, on la marque `deprecated`.

## Template court

```md
# ADR-XXX - Titre

- Statut: accepted
- Date: YYYY-MM-DD

## Contexte

## Decision

## Regles d'application

## Preuves repo

## Consequences
```
