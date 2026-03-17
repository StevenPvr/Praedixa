# UX And E2E Trust Paths Spec

## Role de ce document

Ce document ferme le trou documentaire entre:

- la boucle runtime decrite dans `decisionops-operating-loop-spec.md`;
- la matrice de preuve merge/release des parcours critiques;
- les shells `app-webapp` et `app-admin`;
- les cases ouvertes de `TODO.md` sur page models, etats degrades, pack-neutrality et E2E.

Il ne remplace pas:

- `docs/prd/decisionops-operating-loop-spec.md` pour le sens fonctionnel de la boucle;
- `docs/prd/matrice-verification-parcours-confiance.md` pour la matrice de preuve merge/release;
- `docs/prd/build-release-sre-readiness-spec.md` pour les gates distants, synthetics et SRE.

Il fixe le contrat de build du noyau encore ouvert cote experience:

- patterns de fetch et de page model partages;
- etats vides, degrades et retries coherents;
- separation claire entre `app-webapp` et `app-admin`;
- surfaces non bloquees par une lecture trop coverage-specific;
- parcours E2E critiques alignes avec le vrai contrat produit.

## Pourquoi ce document existe

Le repo a deja:

- des shells authentifies pour `app-webapp` et `app-admin`;
- des surfaces persistentes pour `approval inbox`, `action dispatch detail`, `ledger detail` et le `Contract Studio`;
- un spec operating loop pour la boucle quotidienne;
- une matrice de verification pour les preuves merge/release.

Le principal gap restant n'est plus de decrire le parcours ideal.
Le gap est de rendre impossible que:

- le webapp et l'admin racontent des etats differents pour le meme objet;
- une page coverage-specifique bloque l'arrivee de Flow ou Allocation;
- un parcours critique soit "documente" mais non testable de bout en bout;
- une vue degradee soit traitee comme un detail de composant plutot que comme un etat produit.

## Sources de verite

- `docs/prd/Praedixa_PRD_DecisionOps_PRD_final.md`
- `docs/prd/TODO.md`
- `docs/prd/decisionops-operating-loop-spec.md`
- `docs/prd/matrice-verification-parcours-confiance.md`
- `docs/prd/coverage-v1-thin-slice-spec.md`
- `docs/prd/decisionops-v1-execution-backbone.md`

## Resultat attendu

Les trust paths UX/E2E sont credibles quand le produit sait:

1. afficher les memes verites runtime dans `app-webapp` et `app-admin`;
2. partager le meme vocabulaire d'etats, de retries et de blocages;
3. differencier les responsabilites operator/approver/support/finance sans dupliquer la logique;
4. accueillir Coverage aujourd'hui sans enfermer Flow/Allocation demain;
5. prouver les parcours critiques avec des E2E alignes sur les vraies sources persistentes.

## Frontiere entre webapp et admin

| Surface      | Role premier                                                                                     | Ce qu'elle ne doit pas absorber                                                  |
| ------------ | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `app-webapp` | experience quotidienne operator, signal inbox, compare, CTA d'action ou de demande d'approbation | les ecrans de diagnostic support ou les mutations admin transverses              |
| `app-admin`  | governance, approval, action center, ledger detail, support et policies                          | une duplication complete des flux operator ou des vues pack-specifiques inutiles |

Le produit doit garder:

- un point d'entree simple pour l'operator;
- un point d'entree de diagnostic et de gouvernance pour l'admin;
- des etats compatibles entre les deux;
- une source de verite serveur unique pour permissions et blocages.

## Page model partage

Chaque ecran critique doit deriver d'un page model explicite qui rend lisibles:

- la source de verite lue;
- le scope tenant/site;
- le statut fonctionnel;
- les permissions disponibles;
- les actions possibles;
- les raisons de blocage;
- les identifiants metier a corriger (`request_id`, `run_id`, `contract_version`, `action_id` selon le cas).

Le page model ne doit pas dependre:

- d'une interpretation implicite du composant;
- d'un fallback UI qui invente une donnee;
- d'une permission deduite seulement de la navigation;
- d'un mapping coverage-only non reutilisable.

## Patterns de fetch a standardiser

Les shells doivent partager les memes conventions pour:

- lecture serveur ou BFF des objets critiques;
- validation stricte des params;
- erreur explicite quand le scope, le role ou la persistance manque;
- refresh apres mutation;
- traitement des retries et refetch;
- affichage des IDs utiles au support.

Les fetch patterns doivent eviter:

- une page admin plus "honnete" qu'une page webapp pour le meme objet;
- des revalidations silencieuses qui masquent un etat de degrade;
- des payloads locaux qui reinterpretent le contrat serveur.

## Etats vides et degrades obligatoires

Les etats suivants doivent etre traites de facon uniforme:

- `no_data`;
- `stale_data`;
- `degraded`;
- `no_feasible_solution`;
- `approval_blocked`;
- `dispatch_failed`;
- `cannot_prove_yet`.

Chaque etat doit rendre visibles:

- le diagnostic minimum;
- la prochaine action utile;
- le niveau de severite;
- l'eventuel blocage de permission ou de trust.

Un etat degrade ne doit jamais etre masque par:

- une carte vide generique;
- un skeleton qui ne se termine pas;
- un texte coverage-only devenu faux hors Coverage.

## Retry et recovery UX

Les retries doivent suivre un pattern partage:

- ce qui peut etre retente;
- par qui;
- avec quelle justification;
- avec quel risque de doublon;
- avec quel refresh attendu apres mutation.

Le produit doit differencier:

- retry technique;
- retry gouverne;
- fallback humain;
- blocage necessitant une action admin ou support.

## Pack-neutrality des shells

Les ecrans ne doivent pas etre modeles comme:

- une seule variante Coverage maquillee;
- un vocabulaire qui suppose toujours staffing/store;
- des colonnes ou cartes impossibles a reemployer pour Flow/Allocation.

Les surfaces communes doivent etre exprimees en termes de:

- signal;
- option;
- contrainte;
- approbation;
- action;
- preuve.

Les specifics pack peuvent vivre:

- dans les labels;
- dans les drivers;
- dans les metriques;
- dans les templates,

mais pas dans l'architecture de navigation ou le contrat d'ecran commun.

## Parcours critiques a prouver en E2E

Le minimum critique reste:

1. `auth -> signal -> compare -> approve -> dispatch -> ledger`;
2. `admin -> connectors -> medallion -> dataset health`.

Pour chaque parcours, les E2E doivent verifier:

- le happy path;
- un chemin degrade ou fail-close;
- les permissions server-side;
- la presence des etats et messages attendus;
- la coherence avec la source persistente, pas avec un payload demo.

## Couche de preuve par niveau

| Niveau      | Ce qui doit etre prouve                           |
| ----------- | ------------------------------------------------- |
| Unit        | serializers, page models, statuts, transitions UI |
| Integration | reads/mutations critiques via BFF et API          |
| Security    | auth, same-origin, tenant/site scope, permissions |
| E2E         | parcours critiques et etats degrades visibles     |
| Smoke       | disponibilite des surfaces apres deploy           |

L'E2E ne remplace pas les autres couches.
Il doit prouver que la promesse utilisateur reste vraie quand tout est branche ensemble.

## Frontiere entre matrice de verification et ce spec

La matrice de verification dit:

- quelles preuves sont attendues;
- a quel niveau merge/release.

Ce spec dit:

- quels ecrans et page models doivent rester coherents;
- quels etats doivent etre visibles;
- ce que les parcours E2E doivent raconter produit-cote.

Les deux documents sont complementaires, pas redondants.

## Merge evidence minimale

- tests unitaires sur page models, serializers et statuts degrades;
- tests d'integration sur inbox signal, compare, approval, action detail et ledger detail;
- tests de securite sur permissions server-side et scopes;
- E2E sur les deux parcours de confiance critiques;
- verification qu'aucune page critique ne depend d'un texte ou composant coverage-only pour son contrat principal.

## Release evidence minimale

- smoke sur les surfaces webapp/admin critiques;
- coherence visible des etats degrades sur les environnements deploiables;
- traces corrigeables via `request_id`, `run_id`, `contract_version`, `action_id`;
- preuve qu'un support peut relire un parcours critique sans SSH artisanal.

## Interpretation du TODO.md a travers ce spec

| Section du `TODO.md`                                     | Fermeture apportee                                                                 |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 9. Apps Next, UX operationnelle et surfaces admin/client | page models, fetch patterns, degraded states, pack-neutral shells, E2E trust paths |
| 10. Qualite, tests, gates et CI/CD                       | cadrage des suites E2E critiques a garder dans les gates                           |
| 12. Observabilite et supportability                      | correlation visible pour diagnostiquer un parcours utilisateur                     |

## Ordre de fermeture recommande

1. figer les page models et etats communs webapp/admin;
2. standardiser fetch, refresh et retry patterns;
3. retirer les lectures trop coverage-specific des ecrans transverses;
4. ecrire les E2E critiques sur les vraies sources persistentes;
5. raccorder ces preuves aux gates merge/release existants.

## Decision de cadrage

Tant que ce spec n'est pas vrai, Praedixa peut decrire correctement sa boucle DecisionOps, mais ses shells et ses E2E ne prouvent pas encore de facon assez stable que les parcours critiques sont lisibles, coherents et reutilisables au-dela de Coverage.
