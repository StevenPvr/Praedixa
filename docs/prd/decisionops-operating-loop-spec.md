# DecisionOps Operating Loop Spec

## Role de ce document

Ce document detaille la boucle operationnelle quotidienne:

- signal;
- compare;
- approval;
- action;
- ledger.

Il sert a fermer la partie runtime et UX de la tranche Coverage V1 sans la confondre avec:

- le setup connecteurs;
- la gouvernance du `DecisionContract`;
- la readiness release/SRE.

## Sources de verite

- `docs/prd/Praedixa_PRD_DecisionOps_PRD_final.md`
- `docs/prd/coverage-v1-thin-slice-spec.md`
- `docs/prd/decision-contract-governed-publish-spec.md`
- `docs/prd/matrice-verification-parcours-confiance.md`
- `docs/prd/TODO.md`

## Resultat attendu

Le loop est credible quand un utilisateur authentifie peut:

1. voir un signal priorise et explicable;
2. ouvrir une comparaison baseline vs alternatives;
3. comprendre pourquoi une option est recommandee ou bloquee;
4. demander ou donner l'approbation selon ses droits;
5. previsualiser le payload d'action;
6. suivre le dispatch jusqu'a un etat terminal;
7. relire ensuite la decision dans un ledger finance-grade.

## Acteurs

| Acteur              | Role dans la boucle                                    |
| ------------------- | ------------------------------------------------------ |
| Operator            | lit les signaux, compare les options, demande l'action |
| Approver            | approuve ou rejette avec justification                 |
| Support / Ops admin | suit les actions, retries et fallback                  |
| Finance / COO       | relit le ledger et les KPI consolides                  |

## Objets et IDs minimum

| Objet          | Etat minimal                                                      | ID cle              |
| -------------- | ----------------------------------------------------------------- | ------------------- |
| Signal         | `fresh/degraded/stale/no_data`                                    | `run_id`            |
| ScenarioRun    | `queued/running/completed/failed/timed_out/expired`               | `run_id`            |
| Recommendation | `created/viewed/approved/rejected/acted/closed`                   | `recommendation_id` |
| Approval       | `requested/approved/rejected/canceled`                            | `approval_id`       |
| ActionDispatch | `dry-run/pending/dispatched/acknowledged/failed/retried/canceled` | `action_id`         |
| LedgerEntry    | `open/measuring/closed/recalculated/disputed`                     | `ledger_id`         |

Les IDs `request_id`, `run_id`, `contract_version` et `action_id` doivent etre visibles et correlables.

## Workflow canonique

### Etape 1 - Signal inbox

La signal inbox doit montrer:

- priorite;
- horizon;
- confiance;
- dernier refresh;
- impact attendu;
- etat degrade s'il existe.

Une alerte non fiable doit etre visible comme non fiable.
Elle ne doit pas se presenter comme une recommendation equivalente a une recommendation saine.

### Etape 2 - Scenario compare

La vue compare doit rendre lisibles:

- la baseline;
- 2 a 5 alternatives quand elles existent;
- la meilleure option;
- les contraintes liantes;
- le couple modele/solver/policy;
- le `contract_version`.

Les etats obligatoires:

- `no_feasible_solution`
- `degraded`
- `fallback_used`
- `shadow_mode`

Le produit doit expliquer:

- pourquoi maintenant;
- pourquoi cette option;
- pourquoi pas une autre;
- que se passe-t-il si on ne fait rien.

### Etape 3 - Approval flow

Le CTA utilisateur doit etre unique selon droits et risque:

- agir directement si policy l'autorise;
- demander l'approbation si un seuil le requiert;
- constater un blocage explicite sinon.

L'approbation doit toujours afficher:

- impact attendu;
- payload final;
- urgence;
- justification obligatoire;
- raison du blocage si SoD ou scope invalide.

### Etape 4 - Dry-run et dispatch

Le dry-run doit montrer exactement:

- la destination;
- le template d'action;
- le payload final;
- les identifiants concernes;
- la permission utilisee.

Le dispatch doit ensuite garantir:

- idempotence;
- timeline lisible;
- retries gouvernes;
- fallback humain explicite;
- absence de doublon silencieux.

### Etape 5 - Ledger et revue

Le ledger detail doit rendre lisibles:

- baseline;
- recommended;
- actual;
- methode contrefactuelle;
- statut finance;
- historique d'approbation;
- statut final de l'action.

Le cockpit ROI doit permettre:

- lecture par contrat, site, periode;
- drill-down vers les decisions;
- exports mensuels.

## Regles UX communes webapp/admin

Les shells `app-webapp` et `app-admin` doivent partager:

- le meme vocabulaire d'etats;
- le meme pattern de retry;
- le meme traitement des etats vides et degrades;
- la meme logique de permissions server-side;
- des page models compatibles.

Le loop ne doit pas etre re-implante deux fois avec des interpretations divergentes.

## Etats obligatoires a supporter dans toutes les surfaces

- no data;
- stale data;
- no feasible solution;
- approval blocked;
- dispatch failed;
- cannot prove yet.

## Separation entre webapp et admin

### Webapp

Doit prioriser:

- inbox de signal;
- compare view;
- CTA d'action ou de demande d'approbation;
- lecture simplifiee du resultat.

### Admin

Doit prioriser:

- approval inbox;
- action center;
- ledger detail;
- vues de diagnostic et de support.

Les ecrans trop specifiques Coverage ne doivent pas bloquer l'arrivee de Flow ou Allocation.

## Invariants fail-close

- pas de comparaison "best option" sans version de contrat et without runtime persistant;
- pas d'approbation sans justification;
- pas de dispatch sans dry-run lisible;
- pas de ledger "closed" si le ROI ne peut pas encore etre prouve;
- pas de masque UI qui cache un etat degrade ou un blocage de permission.

## Merge evidence minimale

- tests unitaires sur serializers, state machines, statuses degrades et mapping des vues;
- tests d'integration sur scenario reads, approval mutation, action timeline et ledger detail;
- tests de securite sur auth, scope, permissions, SoD et write-back restrictions;
- E2E sur `auth -> signal -> compare -> approve -> dispatch -> ledger`;
- alignement des patterns webapp/admin documente et verifie.

## Release evidence minimale

- smoke sur signal inbox, compare, approval, action detail et ledger detail;
- traces corrigeables via `request_id`, `run_id`, `contract_version`, `action_id`;
- dashboards sur latence scenario, echec dispatch, fermeture ledger et approval turnaround;
- export mensuel prouvable.

## Interpretation du TODO.md a travers ce spec

| Section du `TODO.md`      | Fermeture apportee                                                   |
| ------------------------- | -------------------------------------------------------------------- |
| 6. Signal engine          | runtime scenario persistant, explicable, versionne                   |
| 7. Approval & Action Mesh | matrice operationnelle, lifecycle de dispatch, fallback, idempotence |
| 8. Ledger                 | preuve ROI, drill-down, exports, statuts finance                     |
| 9. UX operationnelle      | patterns communs webapp/admin et E2E critiques                       |
| 12. Observabilite         | correlation des IDs metier le long du loop                           |

## Decision de cadrage

Tant que ce spec n'est pas vrai, Praedixa a des briques utiles mais pas encore une boucle operationnelle quotidienne lisible, approuvable, executable et prouvable de bout en bout.
