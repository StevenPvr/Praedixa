# Control Plane Trust Gate Spec

## Role de ce document

Ce document ferme le trou documentaire entre:

- le "trust skeleton" annonce dans le PRD;
- les items ouverts de `TODO.md` sur auth, RBAC, tenant safety et audit;
- la suppression des chemins demo, legacy et fallback implicites;
- la confiance minimum requise avant publication de contrat ou write-back.

Il ne remplace pas:

- `docs/prd/build-release-sre-readiness-spec.md` pour la release, le rollback, le restore et l'operabilite SRE;
- `docs/prd/decision-contract-governed-publish-spec.md` pour la SoD et la gouvernance du contrat;
- `docs/prd/decisionops-v1-execution-backbone.md` pour l'ordre d'execution global.

Il fixe le contrat de build du noyau encore ouvert cote control plane:

- aucune route critique appuyee sur un mode demo ou un fallback implicite;
- auth, RBAC, tenant/site scoping et permissions lisibles de bout en bout;
- audit append-only complet sur contrats, approbations, actions et elevations de privilege;
- acces privilegies, break-glass et support least-privilege gouvernes;
- fail-close honnete avant toute action sensible.

## Pourquoi ce document existe

Le repo a deja:

- une base OIDC pour `app-webapp` et `app-admin`;
- du scoping tenant/site et des guards role-based;
- une MFA admin documentee et testee;
- une fondation append-only typee pour l'audit DecisionOps;
- une politique explicite de break-glass admin/support.

Le principal gap restant n'est plus de dire "la securite compte".
Le gap est de rendre impossible que:

- une route ou une surface critique reparte sur un mode demo pour "sauver" l'experience;
- un acces cross-tenant ou privilegie repose sur une hypothese implicite;
- une mutation sensible echappe a l'audit append-only;
- le support voie plus de donnees que necessaire pour diagnostiquer.

## Sources de verite

- `docs/prd/Praedixa_PRD_DecisionOps_PRD_final.md`
- `docs/prd/TODO.md`
- `docs/prd/build-release-sre-readiness-spec.md`
- `docs/prd/decision-contract-governed-publish-spec.md`
- `docs/prd/decisionops-v1-execution-backbone.md`
- `docs/prd/matrice-verification-parcours-confiance.md`

## Resultat attendu

Le trust gate control plane est credible quand le produit sait:

1. refuser honnetement les chemins auth/data/demo hors contrat cible;
2. prouver qui peut voir, modifier, publier, approuver, dispatcher et supporter;
3. relire les elevations de privilege et les exceptions dans un audit append-only;
4. bloquer toute action sensible si l'origine, le scope, la permission ou le contexte acteur sont incomplets;
5. fournir une base fiable avant toute promesse `scenario -> approval -> dispatch -> ledger`.

## Frontiere de confiance

| Objet               | Ce qu'il doit garantir                                   | Ce qu'il ne doit pas devenir                    |
| ------------------- | -------------------------------------------------------- | ----------------------------------------------- |
| AuthN/AuthZ         | identite, session, roles, permissions et contexte acteur | une simple commodite UI sans valeur server-side |
| Tenant/site scoping | isolement strict des donnees et actions                  | un filtre cosmetique ou facultatif              |
| Append-only audit   | trace deterministe des mutations sensibles et elevations | un journal d'erreurs ou un simple access log    |
| Break-glass         | une exception gouvernee, justifiee et journalisee        | une porte de service officieuse                 |
| Support console     | diagnostic least-privilege par tenant                    | un acces admin generique de convenance          |

Le trust gate ne doit jamais dependre:

- d'un jeu de donnees demo non explicite;
- d'un fallback legacy qui invente une reponse;
- d'une permission implicite heritee d'un ecran;
- d'une hypothese orale sur l'identite de l'acteur.

## Nettoyage demo, legacy et fallback

Le produit doit inventorier explicitement:

- les branches demo encore presentes;
- les alias legacy encore toleres;
- les fallbacks temporaires encore acceptes;
- les chemins fail-close deja assumes comme contrat honnete.

Regle stricte:

- si un chemin ne fait pas partie du contrat cible, il doit etre soit supprime, soit isole, soit documente explicitement comme transitoire;
- aucune route critique ne doit renvoyer une "fausse reussite" pour masquer l'absence de persistance ou de droits;
- les donnees `mock_*`, aliases demo et overlaps heuristiques doivent rester rejetes plutot que canonicalises silencieusement.

## Invariants auth, RBAC, tenant et site

Le control plane doit garantir au minimum:

- une identite acteur non vide, reliee a une session ou un token de confiance;
- une origine publique explicite pour les apps auth;
- des controles same-origin sur les routes JSON cookie-authentifiees sensibles;
- un scoping tenant obligatoire;
- un scoping site obligatoire quand une action ou lecture s'y rattache;
- des permissions nommees et explicites par type de mutation.

Un controle ne compte pas comme ferme s'il vit seulement:

- dans la navigation UI;
- dans un masque d'onglet;
- dans une convention de client;
- dans un header fourni par l'appelant sans frontiere de confiance.

## Append-only audit minimum

L'audit append-only doit couvrir au minimum:

- creation, edition, transition, publish, rollback et archivage de contrat;
- decisions d'approbation, rejet et override;
- dispatch, retry, fallback humain et annulation d'action;
- lecture ou execution d'un break-glass;
- elevation de privilege et mutations support sensibles;
- evenements de restauration ou de maintenance qui changent l'etat d'un tenant.

Chaque evenement d'audit doit conserver:

- `request_id`;
- type d'evenement;
- acteur et role;
- tenant/scope concerne;
- objet cible;
- avant/apres ou ref mutation pertinente;
- justification si requise;
- timestamp et chaine append-only.

## Break-glass et support least-privilege

Le break-glass doit etre:

- explicite;
- limite dans le temps;
- motive;
- audite;
- relisible apres coup.

La console support doit permettre:

- de voir la sante jobs/actions/erreurs par tenant;
- de suivre un incident avec `request_id`, `run_id`, `contract_version`, `action_id`;
- de diagnostiquer sans ouvrir un acces large aux donnees metier.

Le support ne doit pas:

- muter silencieusement un contrat ou une decision;
- lire plus de donnees que le besoin de diagnostic l'exige;
- court-circuiter le modele d'autorisation principal.

## SoD et actions sensibles

Ce spec ne remplace pas la SoD du contrat, mais il fixe le plancher control plane:

- un meme acteur ne doit pas pouvoir s'octroyer silencieusement un role puis publier une mutation critique;
- les approbations et publications critiques doivent garder une frontiere server-side;
- une exception SoD doit etre policy-driven et auditee;
- une mutation sensible doit rester bloquee si le contexte acteur est incomplet.

## Fail-close honnete

Le control plane doit preferer:

- une erreur explicite;
- un blocage motive;
- un etat `degraded` honnete;
- une route non disponible.

Il ne doit jamais preferer:

- un payload synthetique "pour depanner";
- un succes fictif;
- un bypass implicite de permission;
- un contexte acteur forge localement.

## Merge evidence minimale

- tests de securite auth/origin/tenant/site sur les routes critiques;
- tests de permissions server-side sur pages admin et endpoints sensibles;
- tests sur les chemins demo/legacy/fallback encore presents ou supprimes;
- tests de coherence append-only pour contrats, approbations, actions et elevations de privilege;
- verification qu'aucune route sensible ne depend uniquement d'un guard UI.

## Release evidence minimale

- smoke des parcours auth critiques sans mode demo implicite;
- preuve que le support least-privilege peut diagnostiquer un tenant sans sur-exposition;
- runbook break-glass et evidence d'audit lisible;
- validation qu'aucun chemin critique ne depend d'un fallback implicite ou d'une personne cle unique.

## Interpretation du TODO.md a travers ce spec

| Section du `TODO.md`                             | Fermeture apportee                                                                        |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| 1. Architecture / legacy cleanup                 | suppression, isolement ou documentation des branches demo/legacy/fallback                 |
| 3. Control plane, auth, RBAC et securite logique | auth/RBAC/tenant/site coherents, audit complet, trust gate explicite                      |
| 12. Observabilite et supportability              | support least-privilege, diagnostics correlables, maintenance/degraded mode lies au trust |
| 15. Exit gate final                              | aucun chemin critique encore appuye sur demo/fallback implicite ou connaissance orale     |

## Ordre de fermeture recommande

1. inventorier les chemins demo, legacy et fallback encore critiques;
2. fermer les chemins auth/data dependants d'un mode demo non cible;
3. etendre l'audit append-only aux mutations et elevations restantes;
4. valider les invariants tenant/site/permission server-side;
5. fermer la boucle break-glass et support least-privilege avec preuves merge/release.

## Decision de cadrage

Tant que ce spec n'est pas vrai, Praedixa peut avoir des briques produit convaincantes, mais le trust gate control plane n'est pas encore assez ferme pour soutenir sans ambiguite les contrats publies, les approbations critiques et les write-backs en conditions reelles.
