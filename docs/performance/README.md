# Performance build-ready

Date de reference: 2026-03-12

Ce dossier fixe un cadre minimal de performance, scalabilite et cout pour les futures features Praedixa. Le but n'est pas de viser une plateforme "hyper-scale" des maintenant, mais d'eviter les regressions silencieuses et de garder un langage commun entre apps Next.js, API Node, jobs Python, connecteurs et Postgres multi-tenant.

## Perimetre

- `app-landing`, `app-webapp`, `app-admin` et les surfaces Next.js cote produit.
- `app-api-ts` pour les API synchrones exposees aux frontends et aux ops.
- `app-connectors` pour l'ingestion, les probes et la file de sync.
- `app-api` pour forecasts, jobs batch, proof packs et backfills.
- `PostgreSQL` pour la persistance partagee et les lectures multi-tenant.

## Fichiers du dossier

- `build-ready-budgets.md` : budgets p95/p99 UI et API, latences de parcours, budgets async, strategie de scale-out, backpressure, cache et verification "no full refresh".
- `capacity-envelopes.md` : envelopes de charge, quotas, capacity planning DB/stockage/containers, signaux de saturation, enveloppes de cout et regles d'exception.

## Baseline verifiable

Les deux documents ci-dessus embarquent maintenant un bloc JSON versionne et machine-readable:

- `performance-budget-baseline` dans `build-ready-budgets.md`
- `performance-capacity-baseline` dans `capacity-envelopes.md`

Ces blocs sont la source de verite executable pour la detection de derive future. La prose reste le contexte humain; le JSON fixe les seuils et structures que le repo peut verifier.

Commande de validation locale:

```bash
pnpm performance:validate-budgets
```

Ce validateur est maintenant rejoue par `pnpm gate:prepush` et `pnpm gate:exhaustive`, ce qui bloque les derives structurelles entre la prose et les blocs JSON versionnes.

Le validateur:

- verifie le schema minimal et les IDs uniques;
- verifie les monotonicites (`p95 <= p99`, `T1 <= T2 <= T3`, `standard/soft/hard`);
- compare les classes de charge entre les deux documents pour bloquer les derives silencieuses.

## Ce que ces documents doivent trancher

Avant de marquer une brique "build-ready", ces docs doivent permettre de repondre a cinq questions sans discussion implicite:

1. Quelle est la limite de latence acceptable pour le parcours ou la route concernee ?
2. Quelle couche scale en premier si la charge monte: cache, queue, replicas, DB, stockage ?
3. Quel mecanisme de backpressure protege le trafic interactif si un connecteur, un backfill ou un forecast s'emballe ?
4. Quelle surface peut etre mise en cache, avec quelle cle, quel TTL et quelle invalidation ?
5. Quelle preuve montre qu'aucune surface critique ne depend d'un full refresh non budgete ?

## Ordre de decision par defaut

Quand une surface depasse son budget, l'ordre d'action attendu est toujours le meme:

1. Corriger le contrat: pagination, payload, index, agregat, jointure, N+1, tri en memoire, full refresh implicite.
2. Ajouter une lecture incrementalisee ou materialisee avec cles scopees par tenant et, si besoin, par site.
3. Mettre une file, un ack rapide et du backpressure si le travail n'est pas interactif.
4. Scaler horizontalement les couches stateless.
5. Revoir la base, le stockage ou la retention seulement si les quatre etapes precedentes sont insuffisantes.

Postgres n'est jamais le premier levier de scale. Une montee en taille DB sans contrat de lecture correct cache souvent un probleme de design plus profond.

## Classes de charge de reference

Ces classes servent a parler du meme volume quand une feature annonce "ca passe".

| Classe        | Sites par org | Utilisateurs actifs/mois | Connecteurs actifs | Lignes canoniques/jour | Usage attendu                   |
| ------------- | ------------: | -----------------------: | -----------------: | ---------------------: | ------------------------------- |
| `T1` pilot    |          <= 5 |                   <= 100 |              <= 10 |                <= 250k | premier deploiement client      |
| `T2` standard |         <= 25 |                   <= 500 |              <= 30 |                  <= 2M | cible build-ready par defaut    |
| `T3` etendu   |         <= 75 |                  <= 1500 |              <= 80 |                 <= 10M | supportable avec revue capacite |

Au-dela de `T3`, la feature n'est pas "dans le cadre standard" et doit venir avec un plan dedie.

## Regles de mesure avant optimisation

1. Toujours nommer le parcours ou la route, la classe de charge (`T1`, `T2`, `T3`), la fenetre de mesure et le tenant/site de reference.
2. Toujours separer le chemin synchrone utilisateur, le traitement async et le backfill. Melanger les trois masque les vraies limites.
3. Une baseline minimale contient: `p50`, `p95`, `p99`, taux d'erreur, volume (`req/s`, jobs/h ou lignes/jour), taille de payload, charge SQL dominante, CPU/memoire, age de file et impact cout estime.
4. Les budgets se valident d'abord en prod si la metrique existe deja. Sinon, utiliser un test de charge staging sur donnees representatives `T1` et `T2`.
5. Les optimisations ne doivent jamais casser l'isolation multi-tenant. Un cache, un prechargement ou une materialisation doivent toujours garder des cles scopees par tenant et, si besoin, par site.
6. On n'accepte pas une "optimisation" qui ameliore `p50` mais degrade `p99`, augmente le taux d'erreur ou ajoute un cout infra recurrent > 15% sans decision explicite.

## Comment utiliser ce cadre pour une nouvelle feature

Avant merge, la PR ou le mini design doit expliciter:

- la surface touchee (`UI`, `API`, `connecteur`, `forecast`, `backfill`);
- la classe de charge visee (`T1`, `T2` ou `T3`);
- la ligne de budget ou d'envelope concernee;
- le signal de saturation a surveiller en premier;
- le delta de cout attendu s'il y a un nouveau job, un polling plus fin ou plus de retention.

## Invariants build-ready

- Les surfaces critiques utilisateur ne doivent jamais dependre d'un full refresh complet de connecteur, de dataset ou d'agregat multi-tenant pour rester utilisables.
- Toute operation lourde doit avoir un point d'entree synchrone rapide, puis une execution budgetee en async.
- Chaque forme de cache doit etre explicitement scopee, bornable en taille et invalidable sans vidage global.
- Chaque file doit avoir des limites de concurrence, une politique de retry, un age maximal acceptable et une reaction attendue en zone rouge.
- Les couts doivent rester lisibles par surface: frontends, API online, connecteurs, jobs Python, Postgres, objet, observabilite.

## Comment lire le dossier

| Si la question est...                                      | Lire d'abord                                          |
| ---------------------------------------------------------- | ----------------------------------------------------- |
| "Quel est le budget de latence ?"                          | `build-ready-budgets.md`                              |
| "Quand basculer en async ?"                                | `build-ready-budgets.md`                              |
| "Comment scaler horizontalement ?"                         | `build-ready-budgets.md` puis `capacity-envelopes.md` |
| "Quand throttler ou couper un backfill ?"                  | `capacity-envelopes.md`                               |
| "Quel est le budget DB, stockage ou containers ?"          | `capacity-envelopes.md`                               |
| "Comment prouver qu'on n'a pas besoin d'un full refresh ?" | `build-ready-budgets.md`                              |

## Verification minimale avant merge ou mise en prod

La feature ou la modif n'est pas prete tant que les quatre points suivants ne sont pas explicites:

- la surface critique touchee et son budget `p95`/`p99`;
- l'unite de scale principale et le mecanisme de backpressure;
- la politique de cache/invalidation si une lecture est mise en cache;
- la preuve que le parcours nominal ne depend pas d'un full refresh non budgete.

Quand une modification change un seuil ou une classe de charge, il faut mettre a jour le bloc JSON autoritaire dans le document concerne puis rerun `pnpm performance:validate-budgets` dans la meme passe.

## Principes non negociables

- On protege d'abord `p95` et `p99`, pas seulement la moyenne.
- Tout ce qui depasse 1 seconde cote utilisateur doit etre justifie ou bascule en async.
- Les backfills et replays ne doivent jamais affamer le trafic interactif.
- Une feature multi-tenant doit rester equitable: un gros tenant ne doit pas pouvoir monopoliser Postgres, la file de sync ou les workers sans quota ni revue dediee.
- Si une metrique critique n'existe pas encore, la premiere optimisation a faire est d'ajouter la mesure.
