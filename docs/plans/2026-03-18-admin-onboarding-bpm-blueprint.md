# Praedixa Admin Onboarding BPM Blueprint

## Role

Ce document decrit l'architecture cible de l'onboarding client admin de Praedixa dans une logique BPM state-of-the-art.
L'objectif n'est pas de decrire un simple wizard, mais un control plane d'onboarding capable d'orchestrer:

- des taches humaines;
- des probes techniques;
- des integrations API;
- des imports fichiers CSV/Excel;
- du mapping de donnees;
- des verdicts de readiness;
- des approbations;
- des activations progressives;
- des compensations et reouvertures.

Le design vise explicitement la production, le scale, l'auditabilite et la multi-variation par client.

## Decision structurante

Praedixa doit adopter un vrai moteur BPM des maintenant.

Choix recommande:

- moteur: Camunda 8 Self-Managed
- mode de production: Kubernetes + Helm
- UI primaire: `app-admin`
- facade metier synchrone: `app-api-ts`
- services d'integration et workers techniques: `app-connectors`
- persistance metier et read models: PostgreSQL Praedixa
- pipeline data, replay, backfill, quality, forecasting: `app-api`

Ce choix est aligne avec:

- le besoin de BPMN, user tasks, timers, incidents, compensation et audit;
- la volonte de garder une UX `app-admin` premium et non de deleguer l'experience a un produit tiers;
- la frontiere d'architecture repo qui reserve `app-connectors` aux integrations et `app-api` aux traitements data.

## Pourquoi Camunda 8

Camunda 8 convient mieux que Temporal pour ce chantier precis.

Temporal excelle pour la durable execution en code, mais Praedixa a besoin d'un moteur:

- lisible par le metier;
- nativement oriente human workflow;
- supportant BPMN et DMN;
- capable de modeliser les variantes d'onboarding sans enfouir toute la logique dans des services TypeScript.

Camunda 8 apporte en plus:

- des user tasks assignees a des utilisateurs ou groupes;
- des listeners de cycle de vie sur user tasks;
- une API REST d'orchestration moderne;
- une approche standard BPMN/DMN plus partageable entre produit, ops et engineering.

## Contraintes non negociables

- L'onboarding n'est pas une suite d'ecrans; c'est un processus metier durable.
- Le moteur BPM n'est pas la source de verite metier; PostgreSQL reste la source de verite produit.
- Les variables de process Camunda ne doivent contenir que le contexte d'orchestration, pas des blobs metier massifs.
- Les donnees sensibles d'integration ne vivent pas dans Camunda.
- Toute action humaine sensible doit produire un audit immutable.
- Toute readiness doit etre calculee explicitement avec blockers et evidence, jamais deduite implicitement d'un "status vert".
- Toute activation partielle ou totale doit etre reversible.

## Resultat produit vise

Un admin Praedixa doit pouvoir ouvrir un workspace client et:

1. cadrer le scope contractuel et la residence des donnees;
2. definir le modele d'acces, les roles et le SSO;
3. activer une ou plusieurs sources API ou fichier;
4. verifier la readiness technique;
5. publier les mappings valides;
6. declarer les services souscrits;
7. configurer KPI, horizons, sites, leviers d'optimisation et packs;
8. lancer shadow mode, backtest ou first sync;
9. obtenir un verdict de readiness avec blockers explicites;
10. activer progressivement le client avec hypercare et possibilite de reouverture.

## Anti-patterns a eviter

- Un wizard monolithique avec un seul JSON `onboarding_state`.
- Des etapes numeriques opaques sans semantique metier.
- Du state derive uniquement du front.
- Des permissions deduites depuis la navigation UI au lieu d'un controle serveur.
- Des connecteurs "healthy" quand seule l'auth marche.
- Un mapping "publie" sans couverture de champs critiques ni gestion de quarantaine.
- Un go-live binaire sans activation partielle ni rollback.

## Bounded contexts cibles

### 1. Onboarding Control Plane

Runtime principal:

- `app-api-ts`
- `app-admin`

Responsabilites:

- creation et pilotage des onboarding cases;
- orchestration des commandes utilisateur;
- lecture des read models;
- exposition des API admin;
- synchronisation avec Camunda.

### 2. Workflow Orchestration

Runtime principal:

- cluster Camunda 8

Responsabilites:

- execution BPMN;
- gestion des timers, incidents, wait states, multi-instance;
- emission des user tasks;
- correlation des messages et completions de taches;
- versioning des process definitions.

### 3. Integration Activation

Runtime principal:

- `app-connectors`

Responsabilites:

- catalogues de connecteurs;
- probes vendor;
- tests de credentials;
- sync initiale;
- collecte de capabilities detectees;
- orchestration des jobs techniques.

### 4. Data Contract And Trust

Runtime principal:

- `app-connectors`
- `app-api`
- `app-api-ts`

Responsabilites:

- upload et staging fichier;
- preview schema;
- mapping draft/published;
- dataset health;
- quarantaine;
- replay et backfill;
- readiness data.

### 5. Forecast And Optimization Scope

Runtime principal:

- `app-api-ts`
- `app-api`

Responsabilites:

- KPI eligibles;
- horizons autorises;
- packs actifs;
- leviers d'optimisation;
- prerequis data par pack.

### 6. Access And Tenant Security

Runtime principal:

- `app-api-ts`
- Keycloak

Responsabilites:

- modele d'acces client;
- roles;
- scopes site;
- federations SSO;
- invitations;
- verification de claims canoniques.

## Architecture canonique

```text
app-admin
  -> app-api-ts (commands / queries)
       -> PostgreSQL (source de verite metier + read models)
       -> Camunda 8 REST API (start process, complete tasks, query tasks/incidents)
       -> app-connectors (probe/test/sync/connecteur)
       -> app-api (quality, replay, backfill, forecasting readiness)

Camunda 8
  -> orchestre les processus et user tasks
  -> appelle des workers techniques via app-connectors/app-api-ts workers
  -> publie incidents / task lifecycle

PostgreSQL
  -> stocke onboarding_case, source configs, mappings, readiness, approvals, activation decisions
  -> stocke des projections UI stables pour app-admin
```

## Decision UX majeure

`app-admin` reste l'interface de reference.

Praedixa ne doit pas envoyer les operateurs dans Tasklist comme UX principale.

Le bon pattern est:

- Camunda produit les user tasks et l'etat du processus;
- `app-api-ts` projette ces taches dans des read models Praedixa;
- `app-admin` lit ces read models et rend une UX produit sur-mesure;
- les actions utilisateur repassent par `app-api-ts`, qui complete la tache Camunda et met a jour la persistence metier.

Pourquoi:

- UX homogene avec le reste du backoffice;
- queries produit plus riches que des appels directs au moteur;
- moindre couplage aux API d'outillage Camunda;
- meilleure auditabilite cross-runtime;
- controle plus fin du multi-tenant et du RBAC Praedixa.

## Processus BPM racine

Nom recommande:

- `client-onboarding-v1`

Statut case:

- `draft`
- `scoping`
- `access_setup`
- `source_activation`
- `mapping_validation`
- `product_configuration`
- `readiness_review`
- `activation_pending`
- `active_limited`
- `active_full`
- `hypercare`
- `paused`
- `blocked`
- `completed`
- `cancelled`

Le processus BPMN racine doit orchestrer des sous-processus explicites, pas une seule ligne de taches.

## Sous-processus BPMN cibles

### 1. Intake And Contract Scope

But:

- creer la case;
- enregistrer le sponsor client;
- fixer la residence des donnees;
- fixer l'environnement cible `sandbox` ou `production`;
- enregistrer le pack, les modules et le scope des sites.

Sortie attendue:

- case ouverte;
- `subscription_scope` cree;
- prerequis de conformite connus.

### 2. Access And Identity Setup

But:

- definir SSO ou mode invite local;
- creer les roles client;
- definir les niveaux d'acces site;
- configurer les admins et operators initiaux.

Variantes:

- SSO pret;
- SSO retarde mais non bloquant pour data activation;
- client sans SSO au demarrage.

Blocants:

- claims canoniques manquants;
- modele de roles invalide;
- comptes critiques absents.

### 3. Source Strategy Selection

But:

- choisir les sources critiques V1;
- decider API vs CSV/Excel vs SFTP managed fallback;
- decider le mode de branchement par source.

Important:

- il doit etre possible d'avoir un onboarding mixte, par exemple WFM via API et absences via CSV.

### 4. Source Activation

Sous-processus multi-instance, un par source.

Etapes:

- config de connexion;
- validation host / tenant / environnement;
- probe;
- credentials test;
- capability detection;
- premier test de permissions;
- first sync / ingest initial.

Etats source:

- `draft`
- `config_pending`
- `auth_pending`
- `probe_failed`
- `ready_for_sync`
- `syncing`
- `healthy`
- `degraded`
- `failed`
- `paused`

### 5. File Import Enablement

Sous-processus frere de source activation pour les imports manuels.

Etapes:

- upload vers staging securise;
- antivirus/format validation;
- detection feuille/schema;
- parametrage import profile;
- preview mapping;
- validation humaine;
- import test;
- publish import profile.

### 6. Mapping And Dataset Trust

Sous-processus multi-instance, un par dataset critique.

Etapes:

- creation mapping draft;
- preview echantillon;
- validation de couverture des champs critiques;
- publication mapping;
- quality report;
- quarantaine;
- remediation ou replay;
- verdict dataset trust.

Sortie:

- aucun dataset requis du pack ne peut rester en "pretend green".

### 7. Product Configuration

But:

- fixer les services souscrits;
- fixer les KPI forecastes;
- fixer horizons;
- fixer granularite;
- fixer les solutions autorisees a optimiser;
- fixer la matrice d'approbation initiale;
- fixer les policy defaults du contrat.

Cette phase doit s'appuyer sur DMN et des catalogues versionnes.

### 8. Shadow / Backtest Readiness

But:

- verifier qu'on peut produire des outputs credibles sans encore agir en production;
- lancer un backtest historique ou un shadow mode;
- collecter les KPI de reference.

### 9. Readiness Review

But:

- consolider les readiness de tous les domaines;
- demander les approbations humaines requises;
- bloquer explicitement sur les blockers severes;
- generer un verdict:
  - `not_ready`
  - `ready_limited`
  - `ready_full`

### 10. Activation And Hypercare

But:

- activer d'abord en lecture seule ou sur un perimetre pilote;
- activer ensuite Action Mesh si autorise;
- suivre la fenetre hypercare;
- fermer ou reouvrir la case selon incidents.

## DMN / decision tables a introduire

Le BPM ne doit pas porter toutes les regles en dur.
Praedixa doit externaliser plusieurs decisions via DMN ou regles versionnees.

Tables de decision cibles:

- `required_datasets_by_pack`
- `required_kpis_by_service`
- `allowed_optimization_levers_by_pack`
- `allowed_horizons_by_pack`
- `required_roles_by_subscription_scope`
- `connector_capability_requirements_by_vendor`
- `readiness_policy`
- `activation_mode_policy`
- `sso_requirement_policy`

Exemple:

- pack `coverage` + module `action_mesh` peut imposer:
  - datasets `employees`, `schedules`, `absences`;
  - horizons `J+3`, `J+7`;
  - au moins un `org_admin` et un `manager`;
  - readiness `dataset_health >= degraded` interdite si action_mesh active.

## Modele de donnees cible

La structure actuelle `onboarding_states` ne suffit pas.
Elle doit devenir le haut de pyramide, pas l'unique objet.

Tables metier recommandees:

- `onboarding_cases`
- `onboarding_case_versions`
- `onboarding_case_tasks`
- `onboarding_case_blockers`
- `onboarding_case_events`
- `onboarding_case_approvals`
- `onboarding_case_attachments`
- `onboarding_access_policies`
- `onboarding_access_assignments`
- `onboarding_source_configs`
- `onboarding_source_probes`
- `onboarding_source_runs`
- `onboarding_file_profiles`
- `onboarding_mapping_profiles`
- `onboarding_mapping_versions`
- `onboarding_dataset_readiness`
- `onboarding_subscription_scopes`
- `onboarding_kpi_scopes`
- `onboarding_horizon_scopes`
- `onboarding_optimization_policies`
- `onboarding_activation_decisions`
- `onboarding_hypercare_windows`

Tables techniques d'integration BPM:

- `bpm_process_instances`
- `bpm_user_task_projection`
- `bpm_incident_projection`
- `bpm_message_correlation_log`

## Objet central `onboarding_cases`

Champs minimaux:

- `id`
- `organization_id`
- `status`
- `phase`
- `activation_mode`
- `environment_target`
- `data_residency_region`
- `owner_user_id`
- `sponsor_user_id`
- `started_at`
- `target_go_live_at`
- `last_readiness_status`
- `last_readiness_score`
- `current_process_instance_key`
- `process_definition_version`
- `reopened_from_case_id`
- `closed_at`

## Principe des read models

Pour `app-admin`, il faut des read models stables et rapides:

- `onboarding_case_summary_view`
- `onboarding_case_task_view`
- `onboarding_case_timeline_view`
- `onboarding_source_health_view`
- `onboarding_dataset_readiness_view`
- `onboarding_access_matrix_view`
- `onboarding_activation_readiness_view`

Le front ne doit jamais reconstruire ces vues en recollant lui-meme 12 endpoints.

## Commandes API a exposer

Dans `app-api-ts`, creer un domaine `admin/onboarding`.

Commandes minimales:

- `POST /api/v1/admin/organizations/:orgId/onboarding/cases`
- `POST /api/v1/admin/onboarding/cases/:caseId/reopen`
- `POST /api/v1/admin/onboarding/cases/:caseId/cancel`
- `POST /api/v1/admin/onboarding/cases/:caseId/access-model`
- `POST /api/v1/admin/onboarding/cases/:caseId/source-configs`
- `POST /api/v1/admin/onboarding/cases/:caseId/source-configs/:sourceId/test`
- `POST /api/v1/admin/onboarding/cases/:caseId/source-configs/:sourceId/sync`
- `POST /api/v1/admin/onboarding/cases/:caseId/file-imports`
- `POST /api/v1/admin/onboarding/cases/:caseId/mappings/:mappingId/publish`
- `POST /api/v1/admin/onboarding/cases/:caseId/readiness/recompute`
- `POST /api/v1/admin/onboarding/cases/:caseId/approvals/:approvalId/decision`
- `POST /api/v1/admin/onboarding/cases/:caseId/activation/prepare`
- `POST /api/v1/admin/onboarding/cases/:caseId/activation/execute`
- `POST /api/v1/admin/onboarding/cases/:caseId/hypercare/close`

Queries minimales:

- `GET /api/v1/admin/organizations/:orgId/onboarding`
- `GET /api/v1/admin/onboarding/cases/:caseId`
- `GET /api/v1/admin/onboarding/cases/:caseId/tasks`
- `GET /api/v1/admin/onboarding/cases/:caseId/timeline`
- `GET /api/v1/admin/onboarding/cases/:caseId/readiness`
- `GET /api/v1/admin/onboarding/cases/:caseId/sources`
- `GET /api/v1/admin/onboarding/cases/:caseId/datasets`
- `GET /api/v1/admin/onboarding/cases/:caseId/access`

## Repartition runtime detaillee

### `app-admin`

Doit porter:

- workspace onboarding par organisation;
- board des taches;
- pages source, mapping, readiness, activation, hypercare;
- formulaires riches;
- visualisation blockers et evidence;
- commandes humaines.

Ne doit pas porter:

- logique technique d'integration;
- orchestration durable;
- validation de securite definitive;
- calcul metier de readiness.

### `app-api-ts`

Doit porter:

- commandes synchrones du front;
- validation stricte des payloads;
- RBAC et tenant safety;
- persistence metier;
- correlation avec Camunda;
- lecture des projections et des read models;
- audit.

Ne doit pas porter:

- gros jobs de replay/backfill;
- workers connecteur de longue duree;
- pipeline data medaillon.

### `app-connectors`

Doit porter:

- probes vendor;
- connection tests;
- detection de capabilities;
- full sync initiale;
- workers Camunda de type integration;
- connectors catalog + adapters.

### `app-api`

Doit porter:

- parse massif CSV/Excel si besoin lourd;
- quality scoring;
- replay/backfill;
- data trust recompute;
- bootstrap features/forecasting offline.

## Permissions et separation des roles

Il faut separer:

- `super_admin` Praedixa
- `onboarding_operator`
- `data_operator`
- `security_reviewer`
- `client_org_admin`
- `client_manager`
- `finance_reviewer`

Permissions admin minimales a versionner:

- `admin:onboarding:read`
- `admin:onboarding:write`
- `admin:onboarding:approve`
- `admin:onboarding:activate`
- `admin:onboarding:reopen`
- `admin:integration:write`
- `admin:mapping:publish`
- `admin:readiness:override`
- `admin:security:approve`

Principe:

- aucune decision de go-live ne doit dependre d'un seul role omnipotent si on active des flux sensibles;
- les overrides doivent etre traces avec justification obligatoire.

## Strategie user tasks

Ne pas modeliser toutes les micro-actions comme user tasks.

Utiliser des user tasks pour:

- validations humaines;
- approbations;
- demandes d'information;
- checkpoints readiness;
- decisions de go-live;
- incidents necessitant arbitrage.

Ne pas utiliser des user tasks pour:

- edition libre d'un formulaire "draft" sans engagement;
- actions purement UI locales;
- refresh de read model;
- polling d'etat technique.

## Strategie d'incidents

Il faut distinguer:

- `process blocked`:
  le BPM attend une action humaine ou un prerequis metier.
- `technical incident`:
  worker, connecteur, timeout, auth revoke, schema drift.
- `data readiness failure`:
  la technique a tourne mais les donnees ne sont pas publiables.

Le front doit rendre ces trois cas differemment.

## Strategie readiness

La readiness doit etre domain-based.

Domaines minimaux:

- `contract_scope`
- `identity_access`
- `connector_connectivity`
- `file_import_capability`
- `mapping_coverage`
- `dataset_health`
- `forecast_scope`
- `optimization_scope`
- `approvals`
- `security_compliance`
- `go_live_controls`

Chaque domaine a:

- `status`
- `score`
- `blocking`
- `reasons`
- `evidence_refs`
- `last_computed_at`
- `computed_by`

Statuts:

- `not_started`
- `in_progress`
- `ready`
- `warning`
- `blocked`
- `waived`

## Connecteurs et detection API

Pattern recommande:

- catalogue declaratif des connecteurs supportes;
- probe technique reelle;
- fingerprint vendor/capabilities;
- confirmation humaine;
- stockage versionne du `capability profile`.

Ne jamais "auto-detect" et activer sans confirmation humaine.

Le `capability profile` doit exposer au minimum:

- vendor detecte;
- auth mode detecte;
- objets disponibles;
- endpoints manquants;
- rate limits;
- environnement detecte `sandbox` vs `prod`;
- timezone par defaut;
- granularite disponible;
- signaux PII ou residency concerns.

## CSV / Excel comme premier citoyen

L'import fichier n'est pas un plan B artisanal.
Il faut le modeliser comme une source officielle avec son propre lifecycle.

Objet `file profile`:

- type fichier `csv` ou `xlsx`
- sheet cible
- encodage
- delimiter
- decimal separator
- timezone source
- date formats
- header row
- sample fingerprint
- schema detecte
- mapping draft/published
- quality verdict

Edge cases obligatoires:

- fichier duplique;
- header change;
- feuille absente;
- dates ambiguës;
- colonnes vides;
- multi-sites dans un seul fichier;
- gros volume;
- erreurs partielles;
- PII inattendue;
- mismatch d'environnement.

## Mapping et canonique

Le mapping ne doit pas etre rattache au process uniquement.
Il doit etre versionne comme un objet produit.

Un mapping version doit porter:

- source profile;
- target canonical pack;
- transformations;
- critical fields coverage;
- validation report;
- publisher;
- published_at;
- rollback_to_version;
- quarantine policy.

Un process BPM peut attendre "mapping published", mais la source de verite du mapping vit en base, pas dans le workflow.

## Modules, services et leviers d'optimisation

Praedixa doit modeliser explicitement ce que le client a achete et ce qui est activable maintenant.

Dimensions distinctes:

- `subscription modules`
- `enabled packs`
- `eligible KPIs`
- `eligible horizons`
- `eligible optimization levers`
- `approval matrix`
- `action mesh enabled`

Le process d'onboarding doit pouvoir dire:

- module vendu mais pas encore activable;
- module activable mais seulement en read-only;
- module activable sur certains sites uniquement;
- module bloque par dette data;
- module bloque par approbation manquante.

## Versioning et evolution du process

Le BPM changera.
Il faut versionner:

- le process BPMN;
- les tables DMN;
- les schemas de payload;
- les catalogues de connecteurs;
- les policies de readiness.

Regle:

- une case en cours reste attachee a la version de process qui l'a demarree;
- les migrations de case entre versions doivent etre explicites et rares;
- les read models doivent exposer la version de process et la version de policy.

## Reouverture et compensation

L'onboarding n'est pas toujours lineaire.

Il faut supporter:

- reouverture apres activation limitee;
- retour en arriere si un connecteur tombe;
- extension de scope apres ajout de module vendu;
- migration sandbox -> production;
- remplacement d'une source CSV par API;
- changement de SSO en cours;
- ajout d'un nouveau site apres go-live.

Le BPM doit donc gerer:

- des chemins de compensation;
- des sous-processus rejouables;
- des blockers re-creables;
- des activations partielles.

## Infra cible

Production recommande:

- Camunda 8 Self-Managed sur Kubernetes
- deployment Helm
- cluster dedie ou namespace dedie
- private networking
- ingress protege
- OIDC/JWT pour l'API d'orchestration
- OpenSearch ou Elasticsearch supporte pour l'orchestration cluster
- monitoring/alerting dedies

Ce moteur ne doit pas tourner sur les serverless containers Scaleway actuels.
Il faut un substrate stateful et resilient.

Hypothese la plus coherente avec Praedixa:

- cluster Kubernetes dedie en region EU
- workers `app-connectors` et `app-api-ts` deployee comme workloads separes
- `app-admin` et `app-api-ts` continuent leur vie produit separement

## Observabilite

IDs a propager partout:

- `request_id`
- `trace_id`
- `onboarding_case_id`
- `process_instance_key`
- `user_task_key`
- `connector_id`
- `connector_run_id`
- `mapping_id`
- `dataset_id`
- `approval_id`

Dashboards minimaux:

- process instances par phase;
- user tasks agees / SLA misses;
- incidents techniques;
- blockers readiness par domaine;
- temps moyen time-to-first-data;
- temps moyen time-to-first-readiness;
- taux de reouverture;
- taux d'activation limitee vs full;
- top causes de blocage.

## Securite

- secrets connecteurs hors Camunda, dans secret manager ou vault dedie;
- aucun secret en variable de process;
- allowlists host/tenant strictes;
- trace des overrides et waivers;
- export de preuves pour audit;
- separation des duties pour activation sensible;
- sanitization forte des metadonnees de fichiers;
- chiffrement at-rest des pieces jointes;
- retention policy sur evidences et imports.

## Edge cases a couvrir des la conception

- plusieurs admins Praedixa editent la meme case en parallele;
- un client change de pack au milieu de l'onboarding;
- le tenant source detecte est un sandbox alors que la vente vise prod;
- une source API est green mais il manque les scopes sur 2 objets critiques;
- le mapping est publie puis le schema fournisseur drift;
- la quality gate du dataset redescend apres readiness verte;
- la first sync depose des fichiers incomplets;
- une approbation expire;
- un role critique quitte le projet;
- un fichier CSV contient plusieurs timezones;
- un client veut activer un seul site pilote;
- un module est active en lecture seule pendant 30 jours;
- la matrice d'approbation change avant go-live;
- un import manuel doit coexister avec une sync API sur le meme dataset;
- une case activee doit etre reouverte apres incident connecteur;
- un pack est vendu sans certains leviers d'optimisation;
- le client veut un shadow mode long avant toute action;
- une tache humaine reste en timeout et doit etre escaladee.

## Strategie de tests

### Niveau 1 - unitaires

- calcul readiness par domaine;
- DMN/policies;
- validations payload;
- mapping coverage rules;
- capability detection parsing.

### Niveau 2 - integration backend

- `app-api-ts route -> service -> DB`
- `app-connectors worker -> provider sandbox`
- `app-api` replay/backfill/quality
- persistence des projections BPM.

### Niveau 3 - integration BPM

- process complete path happy flow;
- branchements alternatifs;
- timers;
- incidents;
- compensation;
- reouverture.

### Niveau 4 - E2E admin

- creation case;
- activation source API;
- import CSV;
- publish mapping;
- readiness review;
- activation limitee;
- reouverture.

## Sequence de livraison recommandee

### Phase 0 - foundations

- choisir Camunda 8 Self-Managed
- poser l'infra dev/staging
- definir les contrats TS partages onboarding
- creer les tables coeur `onboarding_cases` + projections taches/incidents

### Phase 1 - case management

- creation case
- timeline
- tasks board
- read models
- audit de base

### Phase 2 - access model

- roles
- invitations
- SSO checklist
- approvals simples

### Phase 3 - source activation

- connecteurs API
- probes
- sync initiale
- CSV/Excel import profile

### Phase 4 - mapping and trust

- mapping draft/publish
- dataset readiness
- quarantine
- replay/backfill hooks

### Phase 5 - product activation

- KPI
- horizons
- levers
- readiness review
- activation limitee

### Phase 6 - hypercare and reopen

- incidents
- rollback
- reopen
- SLA dashboards

## Ce que le repo actuel doit evoluer

Le repo n'est pas vide.
Il faut transformer l'existant, pas le jeter.

Evolutions principales:

- remplacer `onboarding_states` comme objet unique par un vrai domaine onboarding
- garder la route `/clients/[orgId]/onboarding`, mais la faire evoluer en workspace par sections
- creer un domaine `admin-onboarding` dans `app-api-ts`
- garder `app-connectors` pour tout ce qui touche probe/sync/connecteur
- garder `app-api` pour replay/backfill/quality/forecasting
- ajouter des DTO `packages/shared-types` decoupes par domaine onboarding

## Recommandation finale

Praedixa doit construire un control plane d'onboarding BPM-first, avec:

- Camunda 8 pour l'orchestration;
- PostgreSQL pour le metier;
- `app-admin` pour l'UX;
- `app-api-ts` pour les commandes et read models;
- `app-connectors` pour les integrations;
- `app-api` pour le data runtime lourd.

Le principe directeur est simple:

`process engine for orchestration, product database for truth, custom admin for experience`

## References externes

- Camunda user tasks:
  https://docs.camunda.io/docs/components/modeler/bpmn/user-tasks/
- Camunda custom UI + task lifecycle:
  https://docs.camunda.io/docs/apis-tools/frontend-development/task-applications/user-task-lifecycle/
- Camunda Orchestration Cluster REST API overview:
  https://docs.camunda.io/docs/apis-tools/camunda-api-rest/specifications/publish-a-message/
- Camunda complete user task:
  https://docs.camunda.io/docs/apis-tools/orchestration-cluster-api-rest/specifications/complete-user-task/
- Camunda production self-managed overview:
  https://docs.camunda.io/docs/self-managed/setup/overview/
- Camunda Kubernetes reference architecture:
  https://docs.camunda.io/docs/self-managed/reference-architecture/kubernetes/
- Camunda database support for Elasticsearch/OpenSearch:
  https://docs.camunda.io/docs/self-managed/components/orchestration-cluster/core-settings/concepts/elasticsearch-and-opensearch/
- Camunda API evolution note:
  https://camunda.com/blog/2024/12/api-changes-in-camunda-8-a-unified-and-streamlined-experience/
- Temporal durable execution overview:
  https://temporal.io/
