# Hierarchie Documentaire Et Normativite

- Statut: draft durable
- Owner: CTO / platform engineering
- Derniere revue: 2026-03-21
- Source de verite:
  - `README.md`
  - `docs/README.md`
  - `docs/ARCHITECTURE.md`
  - `docs/DATABASE.md`
  - `docs/plans/*`
  - `docs/prd/*`
  - `app-api/app/models/*`
  - `app-api/alembic/versions/*`
  - `contracts/*`
  - `packages/shared-types/*`
- Depend de:
  - `docs/cto/README.md`
  - `docs/cto/01-systeme-et-runtimes.md`
  - `docs/cto/03-modele-de-donnees-global.md`
  - `docs/cto/08-contrats-et-types-partages.md`
- Voir aussi:
  - `README.md`
  - `docs/README.md`
  - `docs/ARCHITECTURE.md`
  - `docs/DATABASE.md`
  - `docs/plans/README.md`
  - `docs/prd/README.md`

## Objectif

Cette page sert de boussole a un CTO entrant.

Elle repond a quatre questions simples:

1. quels documents font foi;
2. quels documents servent a se repérer;
3. quoi faire quand deux sources se contredisent;
4. quel parcours lire selon le besoin du moment.

Le but n'est pas d'empiler des liens. Le but est de savoir, en quelques minutes, quel document ouvrir en premier et lequel croire en cas de doute.

## Les quatre familles de documents

### 1. Documents normatifs

Ce sont les documents qui decrivent la verite a respecter, ou qui s'en approchent le plus possible.

Dans Praedixa, la hierarchie normative part de:

1. `app-api/app/models/*`
2. `app-api/alembic/versions/*`
3. `contracts/*`
4. `packages/shared-types/*`

Ces artefacts sont les premiers a consulter quand il faut savoir:

- quelle table existe vraiment;
- quel contrat est versionne;
- quel type partage est utilise par plusieurs runtimes;
- quelle evolution de schema a effectivement ete appliquee.

### 2. Synthese durable

Ce sont les documents qui ordonnent la verite d'execution sans la remplacer.

Ils servent a lire le systeme vite, a le transmettre, et a garder un cap architectural stable:

- `README.md`
- `docs/README.md`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/cto/*`
- `docs/architecture/*`
- `docs/runbooks/*`
- `docs/security/*`
- `docs/deployment/*`

Ces documents doivent rester coherents avec le code, mais ils ne remplacent pas le runtime.

### 3. Cadrage et travail en cours

Ce sont les documents utiles pour preparer ou discuter un chantier, mais qui ne doivent pas etre lus comme une verite runtime.

Exemples:

- `docs/plans/*`
- `docs/prd/*`

Ces documents expliquent un objectif, une intention, une trajectoire ou un backlog. Ils peuvent contenir des hypotheses, des etats cibles, ou des recits produits encore en cours de convergence.

### 4. Documentation locale de repo

Chaque sous-dossier important peut porter son propre `README.md`.

Ces README sont utiles pour l'onboarding local, mais ils doivent etre interpretes comme des guides de dossier, pas comme des normes systeme.

## Hierarchie de lecture

Quand plusieurs documents parlent du meme sujet, la priorite de lecture doit etre la suivante:

1. le code, les migrations et les contrats versionnes;
2. `docs/DATABASE.md` et `docs/ARCHITECTURE.md` pour la synthese durable;
3. `docs/cto/*` pour le parcours CTO et les cartes de lecture;
4. `README.md` et `docs/README.md` pour l'orientation globale;
5. `docs/plans/*` et `docs/prd/*` pour le cadrage ou l'historique.

Autrement dit:

- on commence par la verite d'execution;
- on confirme avec la synthese durable;
- on termine avec le contexte de cadrage si on veut comprendre la trajectoire.

## Comment arbitrer en cas de conflit

### Regle 1: le runtime gagne

Si un document dit une chose et que le code dit une autre, le code gagne.

Cela vaut pour:

- les tables et colonnes;
- les migrations Alembic;
- les contrats JSON Schema et OpenAPI;
- les types partages;
- les routes et services actifs;
- les comportements observables en runtime.

### Regle 2: la migration gagne sur la prose

Si `docs/DATABASE.md` ou `docs/ARCHITECTURE.md` n'est plus aligne avec les migrations ou les modeles, on corrige la doc.

La source a verifier en premier est:

- `app-api/app/models/*`
- `app-api/alembic/versions/*`

### Regle 3: le contrat versionne gagne sur le texte libre

Si une page de cadrage ou un README raconte un comportement, mais qu'un contrat versionne le definit autrement, le contrat versionne fait foi.

Exemples:

- `contracts/openapi/public.yaml`
- `contracts/decisionops/*`
- `contracts/events/*`
- `contracts/admin/permission-taxonomy.v1.json`

### Regle 4: la synthese durable doit suivre l'execution

`README.md`, `docs/README.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md` et `docs/cto/*` ont pour role d'ordonner la verite, pas de la concurrencer.

Si ces documents divergent entre eux, on revient aux sources de verite puis on met a jour la synthese dans le meme changement.

### Regle 5: les plans et PRD ne battent jamais l'existant

`docs/plans/*` et `docs/prd/*` sont utiles pour:

- comprendre l'intention;
- comprendre la cible;
- comprendre le vocabulaire de produit;
- comprendre l'historique de decision.

Mais ils ne remplacent jamais:

- les modeles;
- les migrations;
- les contrats;
- les runtimes actifs.

## Lecture recommandee selon le besoin

### Si tu veux comprendre le systeme en 30 minutes

Lire dans cet ordre:

1. [`README.md`](../../README.md)
2. [`docs/README.md`](../README.md)
3. [`docs/cto/README.md`](./README.md)
4. [`docs/cto/01-systeme-et-runtimes.md`](./01-systeme-et-runtimes.md)
5. [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md)
6. [`docs/DATABASE.md`](../DATABASE.md)

Objectif: savoir quels runtimes existent, ou se trouve la verite des donnees, et quelles docs sont durables.

### Si tu veux comprendre la base de donnees

Lire dans cet ordre:

1. [`docs/DATABASE.md`](../DATABASE.md)
2. [`docs/cto/03-modele-de-donnees-global.md`](./03-modele-de-donnees-global.md)
3. [`docs/cto/04-schema-public-postgres.md`](./04-schema-public-postgres.md)
4. [`docs/cto/05-schemas-tenant-et-medallion.md`](./05-schemas-tenant-et-medallion.md)
5. [`docs/cto/09-runbook-exploration-bd.md`](./09-runbook-exploration-bd.md)

Objectif: identifier vite les tables critiques, les schemas, les migrations et les flux de lecture/criture.

### Si tu veux comprendre les flux runtime

Lire dans cet ordre:

1. [`docs/cto/06-flux-de-donnees-applicatifs.md`](./06-flux-de-donnees-applicatifs.md)
2. [`docs/cto/07-connecteurs-et-sync-runs.md`](./07-connecteurs-et-sync-runs.md)
3. [`docs/cto/11-surfaces-http-et-statut.md`](./11-surfaces-http-et-statut.md)
4. [`docs/cto/12-ui-endpoint-service-table-type.md`](./12-ui-endpoint-service-table-type.md)
5. [`docs/cto/14-telemetry-et-correlation.md`](./14-telemetry-et-correlation.md)

Objectif: relier une page, un endpoint, un service, une table et un identifiant de correlation.

### Si tu veux comprendre les contrats et les taxonomies

Lire dans cet ordre:

1. [`docs/cto/08-contrats-et-types-partages.md`](./08-contrats-et-types-partages.md)
2. [`docs/cto/17-taxonomies-et-registres.md`](./17-taxonomies-et-registres.md)
3. [`contracts/README.md`](../../contracts/README.md)
4. [`packages/shared-types/src/README.md`](../../packages/shared-types/src/README.md)

Objectif: savoir quelles nomenclatures sont normatives, lesquelles ne sont que partagees, et ou vivent les versions.

### Si tu veux comprendre un chantier de produit

Lire dans cet ordre:

1. [`docs/prd/README.md`](../prd/README.md)
2. le PRD ou la spec concernes dans `docs/prd/*`
3. [`docs/plans/README.md`](../plans/README.md)
4. le plan concerne dans `docs/plans/*`

Objectif: comprendre pourquoi le chantier existe, sans le confondre avec la realite runtime actuelle.

## Comment reconnaitre rapidement le statut d'un document

### Normatif

Un document est proche de la norme s'il:

- decrit un contrat versionne;
- decrit un schema effectif;
- est aligne sur des modeles ou migrations versionnes;
- est teste ou parite avec le code;
- raconte un comportement qui a deja ete applique.

### Synthese durable

Un document est une synthese durable s'il:

- resume plusieurs sources de verite;
- est pense pour l'onboarding;
- aide a naviguer dans le repo;
- doit rester a jour a chaque changement important;
- ne pretend pas remplacer les modeles ou les contrats.

### Cadrage / travail

Un document est du cadrage s'il:

- decrit une cible ou une intention;
- contient des hypotheses de design;
- sert a organiser un chantier avant implementation;
- peut encore diverger de l'execution;
- doit etre recoupe avec le runtime avant toute conclusion.

## Regle pratique pour un CTO

Si tu dois prendre une decision technique:

1. ouvrir d'abord le code ou la migration;
2. confirmer avec `docs/DATABASE.md` ou `docs/ARCHITECTURE.md`;
3. utiliser `docs/cto/*` pour comprendre rapidement le contexte;
4. consulter `docs/prd/*` ou `docs/plans/*` seulement pour la trajectoire ou l'intention.

Si tu dois expliquer le systeme a quelqu'un:

1. partir de `README.md` et `docs/README.md`;
2. descendre dans `docs/cto/README.md`;
3. ouvrir la page CTO specialisee;
4. revenir aux sources de verite pour les details sensibles.

## Ce qu'il ne faut pas faire

- Ne pas prendre `docs/plans/*` pour une preuve d'execution.
- Ne pas prendre `docs/prd/*` pour une reference runtime.
- Ne pas laisser `README.md` contredire `docs/ARCHITECTURE.md` ou `docs/DATABASE.md` sans correction.
- Ne pas corriger seulement la prose si la divergence vient du code ou des migrations.

## Conclusion

La regle simple a retenir est la suivante:

- le code, les migrations et les contrats versionnes font foi;
- `docs/DATABASE.md`, `docs/ARCHITECTURE.md` et `docs/cto/*` rendent cette verite lisible;
- `docs/plans/*` et `docs/prd/*` donnent le contexte, pas la preuve.

Quand il y a conflit, on croit l'execution, puis on revoit la documentation dans le meme changement.
