# ADR-004 - Source de verite runtime des integrations

- Statut: accepted
- Date: 2026-03-21

## Contexte

Praedixa porte aujourd'hui sa plateforme d'integration sur deux representations concurrentes:

- une cible relationnelle versionnee cote Python dans `app-api/app/models/integration.py` et `app-api/alembic/versions/026_integration_platform_foundation.py`, avec `integration_connections`, `integration_sync_runs`, `integration_sync_state`, `integration_raw_events`, `integration_field_mappings`, `integration_error_events`, `integration_dead_letter_queue`, `integration_webhook_receipts` et `integration_audit_events`;
- une persistence runtime reelle cote `app-connectors`, via `connector_runtime_snapshots` et `connector_secret_records`, qui stocke un snapshot JSONB contenant `connections`, `runs`, `syncStates`, `rawEvents`, `authorizationSessions`, `ingestCredentials` et `auditEvents`.

Le systeme tourne reellement aujourd'hui sur le second modele. Les workers Python reclament les runs via l'API interne `app-connectors` (`/v1/runtime/sync-runs/claim`, `execution-plan`, `completed`, `failed`, `sync-state`) et non via les tables `integration_*`.

Cette dualite cree une ambiguite structurelle:

- la doc schema raconte une plateforme relationnelle;
- le runtime operable depend encore d'un blob JSONB global;
- certains concepts existent dans un seul monde ou divergent deja, par exemple `session` supporte dans `app-connectors` mais absent de `IntegrationAuthMode` cote Python.

Pour un CTO entrant, il manque donc une reponse nette a la question: quelle representation doit devenir la source de verite durable?

## Options considerees

### Option A - Assumer durablement le snapshot `app-connectors`

Conserver `connector_runtime_snapshots` comme source de verite normative et traiter `integration_*` comme cible abandonnee ou pure documentation.

Avantages:

- zero migration immediate du runtime TS;
- aucune phase de dual-write;
- peu de risque court terme sur le flux operable actuel.

Inconvenients:

- perte des garanties relationnelles deja modelees;
- audit, requetage, ownership et troubleshooting plus difficiles;
- duplication conceptuelle durable entre doc, Python et runtime TS;
- impossibilite de pretendre a une source de verite SQL claire pour les integrations.

### Option B - Basculer toute la plateforme sur `integration_*`, y compris secrets et payloads bruts

Faire de PostgreSQL la source unique de tout l'etat connecteur, y compris secrets, sessions OAuth et payloads complets.

Avantages:

- unification maximale;
- requetage simple;
- disparition complete du snapshot.

Inconvenients:

- mauvais fit pour les payloads bruts et secrets scelles;
- surface de risque securite plus grande;
- migration trop brutale au regard du runtime actuel.

### Option C - Converger vers `integration_*` comme source de verite durable, en gardant hors tables seulement les secrets, payloads bruts et eventuels caches techniques

Faire des tables `integration_*` la source de verite durable du control plane et de l'etat runtime auditable. Garder le secret store et le payload store comme stockages specialises. Traiter `connector_runtime_snapshots` comme mecanisme transitoire de migration puis, au mieux, comme cache technique non normatif.

Avantages:

- aligne la verite durable sur le schema versionne deja present;
- conserve des frontieres de securite propres pour secrets et payloads lourds;
- rend les integrations auditables, requetables et comprehensibles depuis PostgreSQL;
- permet a `app-connectors` et `app-api` de partager la meme verite metier sans imposer tout de suite un redesign complet des APIs internes.

Inconvenients:

- exige une migration par etapes;
- impose de combler les ecarts de modele (`session`, `authorization sessions`, `ingest credentials`, eventuels champs runtime manquants);
- necessite une discipline stricte pour eviter un dual-source-of-truth durable.

## Decision

Praedixa adopte l'option C.

Les tables `integration_*` deviennent la source de verite durable de la plateforme d'integration pour:

- les connexions;
- les `sync_runs`;
- les curseurs `sync_state`;
- les metadonnees des `raw_events`;
- les mappings, erreurs, DLQ, webhooks et audit.

`app-connectors` reste le runtime proprietaire du control plane et de l'API interne, mais il ne doit plus porter durablement sa propre source de verite metier dans `connector_runtime_snapshots`.

Les exceptions assumees et durables sont:

- les secrets scelles, qui restent hors tables metier dans un store specialise, avec reference stable via `secret_ref` / version;
- les payloads bruts complets, qui restent dans le payload store / object store, references par metadonnees en base;
- d'eventuels caches purement techniques ou etats de reprise locaux, explicitement non normatifs.

En consequence:

- `connector_runtime_snapshots` est un mecanisme transitoire et non la cible d'architecture;
- si un concept runtime est necessaire au produit ou au pilotage operable, il doit vivre dans `integration_*` ou dans une nouvelle table relationnelle dediee, pas seulement dans le snapshot JSONB;
- toute divergence de contrat entre `app-connectors` et `app-api` doit se resoudre en faisant evoluer le modele relationnel cible, pas en institutionnalisant un deuxieme modele durable.

## Regles d'application

- Une seule source de verite durable est autorisee pour un concept metier d'integration.
- `app-connectors` reste l'owner des mutations du control plane connecteurs, mais ces mutations doivent converger vers la persistence relationnelle.
- Les workers Python peuvent continuer a passer par les routes runtime internes pendant la migration; cette frontiere HTTP ne doit pas etre casse sans ADR de remplacement.
- Les secrets et payloads bruts ne doivent pas etre deverses en clair dans `integration_*`.
- Aucun nouvel objet metier d'integration ne doit etre ajoute uniquement dans `connector_runtime_snapshots`.
- Tout auth mode supporte par `app-connectors` doit exister explicitement dans le modele durable. Le cas `session` doit donc etre ajoute ou remodele cote Python avant de considerer la convergence finie.

## Plan de migration

### Phase 1 - Fermeture des ecarts de modele

- Ajouter les ecarts deja identifies entre runtime TS et modele Python:
  - `auth_mode=session`;
  - champs runtime indispensables comme `runtimeEnvironment` si la production en depend;
  - tables ou extensions dediees pour `authorization sessions` et `ingest credentials` si ces objets doivent rester durables et auditables.
- Clarifier par contrat ce qui reste hors base relationnelle:
  - secret material;
  - payload brut complet;
  - caches techniques.

### Phase 2 - Dual-write borne depuis `app-connectors`

- Faire ecrire `app-connectors` dans `integration_*` sur les flux critiques:
  - create/update connection;
  - enqueue/claim/complete/fail sync run;
  - upsert sync state;
  - append raw event metadata;
  - audit events.
- Garder le snapshot seulement comme filet de securite de migration, avec monitoring explicite des ecarts.

### Phase 3 - Bascule des lectures et preuves d'operabilite

- Faire lire les vues operateur, les audits et les runbooks depuis `integration_*`.
- Verifier qu'un worker peut toujours claimer, executer et cloturer un `sync_run` avec la meme fiabilite.
- Ajouter des garde-fous doc-vers-code sur les tables `integration_*` et les auth modes connecteurs.

### Phase 4 - Retrait du snapshot normatif

- Retirer `connector_runtime_snapshots` du chemin nominal metier.
- Si un cache subsiste, le documenter comme cache reconstructible et non comme stockage primaire.
- Mettre a jour la doc CTO pour supprimer toute ambiguite restante sur la source de verite.

## Risques et mitigations

### Risque 1 - Dual-write incoherent pendant la transition

Mitigation:

- ordre de migration par aggregates (`connections`, puis `sync_runs`, puis `sync_state`, puis `raw_events`);
- instrumentation d'ecarts entre snapshot et tables relationnelles;
- bascule lecture par lecture, pas en big bang.

### Risque 2 - Le modele relationnel cible reste incomplet

Mitigation:

- fermer d'abord les ecarts explicites (`session`, sessions OAuth, ingest credentials);
- ne pas declarer la convergence terminee tant qu'un objet operable reste seulement dans le snapshot.

### Risque 3 - Regresser les workers Python existants

Mitigation:

- conserver les routes runtime internes pendant toute la migration;
- faire converger la persistence derriere les APIs avant de changer les contrats worker.

### Risque 4 - Confondre "tout en SQL" et "tout en clair"

Mitigation:

- garder la separation stricte entre metadonnees relationnelles, secret store et payload store;
- continuer a proteger les routes runtime worker avec les capabilities dediees deja en place.

## Invariants

- Un `sync_run` operationnel doit rester claimable et cloturable par un worker reel, pas seulement visible dans une table.
- `secret_ref` reste la reference vers un secret scelle; la matiere secrete ne vit pas dans `integration_*`.
- Les payloads bruts restent hors tables metier; seules leurs metadonnees, hash et references vivent en base.
- `app-connectors` reste la frontiere de confiance pour les flows provider-facing, OAuth et access-context.
- Toute doc CTO et toute doc base de donnees doivent presenter `integration_*` comme la cible durable, et le snapshot comme etat transitoire tant qu'il existe.

## Preuves repo

- `app-api/app/models/integration.py`
- `app-api/alembic/versions/026_integration_platform_foundation.py`
- `app-connectors/src/persistent-store.ts`
- `app-connectors/src/store.ts`
- `app-connectors/src/routes.ts`
- `app-api/app/services/integration_runtime_worker.py`
- `app-api/app/services/integration_sync_queue_worker.py`
- `docs/cto/07-connecteurs-et-sync-runs.md`
- `docs/DATABASE.md`

## Consequences

- La roadmap integration n'a plus deux cibles implicites: la cible durable est maintenant explicite.
- Le travail restant n'est plus "faut-il converger?" mais "quels ecarts fermer et dans quel ordre?".
- Le CTO peut raisonner sur une verite SQL versionnee sans nier l'etat runtime actuel.
- Les prochains chantiers doivent prioriser la fermeture des ecarts de modele avant d'ajouter de nouveaux connecteurs ou de nouvelles surfaces operables seulement dans le snapshot.
