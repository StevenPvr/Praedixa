# Connector Activation And Dataset Trust Spec

## Role de ce document

Ce document fixe le chemin operable qui rend un design partner "branchable" sans projet artisanal.
Il couvre la partie du produit allant de:

- la creation d'une connexion;
- au verdict de readiness;
- au mapping publie;
- a la quarantaine et au replay/backfill;
- jusqu'a la surface unique de dataset health.

Il complete:

- `docs/prd/Praedixa_PRD_DecisionOps_PRD_final.md`
- `docs/prd/coverage-v1-thin-slice-spec.md`
- `docs/prd/matrice-verification-parcours-confiance.md`
- `docs/prd/TODO.md`

## Pourquoi ce document existe

Le wedge Coverage n'existe pas si les donnees critiques n'arrivent pas de facon fiable et explicable.
Le connecteur n'est pas "fini" quand l'auth fonctionne.
Il est fini quand un admin peut:

1. configurer la connexion;
2. verifier sa readiness;
3. lancer la premiere sync;
4. publier un mapping;
5. corriger ou relancer les erreurs;
6. lire un etat unique de confiance des datasets.

## Sources de verite

- `docs/prd/Praedixa_PRD_DecisionOps_PRD_final.md`
- `docs/prd/coverage-v1-thin-slice-spec.md`
- `docs/prd/matrice-verification-parcours-confiance.md`
- `docs/prd/TODO.md`

## Resultat attendu

Un connecteur standard est considere activable quand:

- la configuration et l'auth sont valides;
- la readiness est verte ou explicitement incomplete;
- la sync initiale cree un run observable;
- le mapping publie alimente le canonique sans canonicalisation legacy silencieuse;
- les records invalides peuvent etre quarantaines puis relances;
- le dataset health expose freshness, lineage, volume, erreur et dernier succes dans une seule surface;
- une recommendation aval peut se bloquer proprement si la confiance data n'est pas suffisante.

## Acteurs

| Acteur           | Responsabilite                                                          |
| ---------------- | ----------------------------------------------------------------------- |
| Admin client     | creer, tester, activer et mettre en pause une connexion                 |
| Data operator    | publier le mapping, gerer la quarantaine, relancer replay/backfill      |
| Support Praedixa | diagnostiquer un run ou un dataset sans SSH artisanal                   |
| Systeme          | journaliser les runs, appliquer le fail-close, exposer la sante dataset |

## Objets et IDs obligatoires

| Objet            | Etat minimal                                                         | ID cle                  |
| ---------------- | -------------------------------------------------------------------- | ----------------------- |
| Connector        | `draft -> auth_pending -> syncing -> healthy/degraded/failed/paused` | `connector_id`          |
| Connector run    | `queued -> running -> completed/failed/timed_out/canceled`           | `connector_run_id`      |
| Mapping          | `draft -> validated -> published -> archived`                        | `mapping_id`            |
| Quarantine batch | `open -> relaunching -> cleared/partially_cleared`                   | `quarantine_batch_id`   |
| Dataset health   | `healthy/degraded/failed/stale` avec severite                        | `dataset_id` + `run_id` |

Les IDs `request_id`, `connector_run_id` et `run_id` doivent traverser UI, jobs, logs et evidence.

## Workflow canonique

### Etape 1 - Creation de la connexion

Le wizard connecteur doit permettre:

- selection du type de source;
- saisie des parametres requis;
- stockage des secrets de maniere chiffree;
- validation stricte du host et du schema;
- enregistrement d'une connexion `draft`.

Fail-close:

- aucun secret manquant ne produit un faux succes;
- aucune destination hors allowlist ne passe;
- aucun tenant ne peut lire ou muter une connexion hors scope.

### Etape 2 - Readiness et connection test

La readiness doit etre un verdict structure, pas un texte libre.

Le produit doit exposer au minimum:

- `config_ready`
- `credentials_ready`
- `authorization_ready`
- `probe_target_ready`
- `last_test_status`

Le connection test doit:

- executer une vraie probe;
- produire un run ou une evidence associee;
- laisser une trace auditee.

Un connecteur ne devient pas "healthy" si un prerequis reste rouge.

### Etape 3 - First sync et retention Raw

La premiere sync doit:

- creer un `connector_run_id`;
- persister un statut de run lisible;
- ecrire le Raw append-only;
- exposer un resultat observable dans l'admin.

Les erreurs minimales a rendre explicites:

- auth revoked;
- schema drift;
- timeout;
- 429 / rate limit;
- host unreachable.

Un run en echec ne doit jamais etre confondu avec l'absence de donnees.

### Etape 4 - Mapping publish

Le mapping studio doit permettre:

- preview stable sur echantillon;
- validation humaine avant publish;
- publication versionnee;
- rejection explicite de colonnes `mock_*` ou legacy non autorisees.

Le mapping n'est pas "publie" si:

- un champ critique manque;
- les transformations ne sont pas resolues;
- les collisions de target field ne sont pas levees;
- la couverture minimum du pack cible n'est pas atteinte.

### Etape 5 - Quarantaine

Les records invalides doivent partir en quarantaine avec:

- motif structure;
- volume affecte;
- dernier run associe;
- possibilite de relance.

La quarantaine n'est pas un simple log.
Elle doit etre actionnable depuis l'admin.

### Etape 6 - Replay / backfill

Le replay/backfill doit:

- prendre une fenetre explicite;
- s'executer par connecteur et par run cible;
- reconstruire les couches attendues sans script artisanal;
- produire une evidence de resultat.

Une fenetre invalide, un scope interdit ou une dependance manquante doivent echouer proprement.

### Etape 7 - Dataset health unique

Le produit doit exposer une surface unique par dataset avec:

- freshness;
- lineage;
- volume traite;
- taux d'erreur;
- dernier succes;
- severite;
- actions recommandees.

Cette surface est la seule verite lisible pour dire si le dataset peut nourrir une recommendation.

## Readiness de publication Coverage

Un contrat Coverage ne devrait pas pouvoir etre publie si ses datasets requis n'ont pas:

- une freshness definie;
- un mapping publie;
- une surface health lisible;
- un dernier succes verifiable;
- un traitement degrade explicite.

## Etats de degradation obligatoires

Les surfaces connecteur et dataset doivent afficher explicitement:

- auth pending;
- test failed;
- sync failed;
- stale dataset;
- mapping incomplete;
- quarantine growing;
- replay blocked.

Une page vide ou un "healthy" optimiste n'est jamais acceptable.

## Surfaces minimum a rendre coherentes

| Surface              | Role minimum                                         |
| -------------------- | ---------------------------------------------------- |
| Sources & Connectors | creation, edition, pause, readiness, test, last runs |
| Connector Wizard     | config, auth, validation stricte, verdicts           |
| Mapping Studio       | preview, validation, publish, coverage des champs    |
| Dataset Health       | freshness, lineage, erreurs, severite, actions       |
| Support / jobs view  | correlation run, replay, echec, tenant               |

## API et runtime minimum

Le chemin cible doit rendre lisibles au moins ces operations:

- create/update connector;
- test connector;
- trigger full sync;
- read connector runs;
- preview mapping;
- publish mapping;
- read quarantine summary;
- relaunch replay/backfill;
- read dataset health.

## Merge evidence minimale

- tests unitaires sur validation de config, verdict de readiness, mapping rules et severite health;
- tests d'integration sur create/test/sync/publish/replay;
- tests de securite sur allowlists, scope tenant, secrets et fail-close;
- E2E admin sur wizard, preview mapping et dataset health;
- aucune surface critique ne sert encore des donnees demo a la place du vrai etat.

## Release evidence minimale

- smoke sur connection test, sync initiale, lecture dataset health;
- propagation de `request_id`, `connector_run_id`, `run_id`;
- dashboards et alertes sur freshness, erreurs connecteur et quarantaine;
- runbook court d'activation d'un connecteur standard et de relance d'une fenetre.

## Interpretation du TODO.md a travers ce spec

| Section du `TODO.md` | Fermeture apportee                                                             |
| -------------------- | ------------------------------------------------------------------------------ |
| 4. Data plane        | activation self-service, mapping, quarantaine, replay/backfill, dataset health |
| 9. UX operationnelle | surfaces admin coherentes pour connecteurs, mappings et sante dataset          |
| 12. Observabilite    | IDs metier, dashboards freshness, support sans SSH artisanal                   |

## Decision de cadrage

Tant que ce spec n'est pas vrai, Praedixa sait peut-etre "connecter" une source, mais ne sait pas encore industrialiser la confiance data necessaire a une boucle DecisionOps credible.
