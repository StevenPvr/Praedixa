# Audit Ecarts `docs/DATABASE.md` vs Code

- Statut: draft durable
- Owner: platform engineering
- Derniere revue: 2026-03-21
- Source de verite:
  - `docs/DATABASE.md`
  - `app-api/app/models/*`
  - `app-api/alembic/versions/*`
  - `scripts/validate-database-doc-baseline.mjs`
- Depend de:
  - `docs/cto/03-modele-de-donnees-global.md`
  - `docs/cto/04-schema-public-postgres.md`
  - `docs/cto/13-migrations-et-impacts-metier.md`
- Voir aussi:
  - `docs/cto/07-connecteurs-et-sync-runs.md`
  - `docs/cto/16-legacy-et-surfaces-fermees.md`
  - `docs/DATABASE.md`

## Objectif

Cette page ne remplace pas `docs/DATABASE.md`.

Elle sert a expliciter, pour un CTO, ce qui est:

- deja aligne entre la doc generale et le code;
- incomplet ou trop compact;
- ambigu entre schema reel, runtime actif et cible d'architecture.

## Methode d'audit

Croisement realise entre:

- l'inventaire machine-readable de `scripts/validate-database-doc-baseline.mjs`;
- les modeles SQLAlchemy sous `app-api/app/models/*`;
- les migrations Alembic sous `app-api/alembic/versions/*`;
- la lecture narrative actuelle de `docs/DATABASE.md`.

Resultat observe au moment de cette revue:

- `node scripts/validate-database-doc-baseline.mjs` est vert;
- l'inventaire modeles recense `48` tables SQLAlchemy sur `18` fichiers modeles;
- `docs/DATABASE.md` couvre bien les domaines critiques, mais reste une synthese selective, pas un dictionnaire exhaustif.

## Ecarts reels a connaitre

### 1. Le compte de tables annonce n'est plus a jour

`docs/DATABASE.md` indique encore:

- `Schema public`
- `Contient les 32 tables gerees par Alembic.`

Ce n'est plus exact au regard des modeles actuels, qui exposent `48` tables SQLAlchemy. La doc generale reste utile, mais ce chiffre ne doit plus etre lu comme un inventaire exhaustif.

Impact CTO:

- risque de sous-estimer les domaines admin, RGPD, MLOps et integration;
- confusion entre "tables importantes presentees" et "nombre reel de tables versionnees".

### 2. Plusieurs tables reelles n'apparaissent pas dans l'inventaire narratif principal

Les modeles suivants existent cote code mais ne sont pas decrits explicitement dans le dictionnaire principal de `docs/DATABASE.md`:

- `rgpd_erasure_requests`
- `rgpd_erasure_audit_events`
- `contact_requests`
- `model_registry`
- `model_inference_jobs`
- `model_artifact_access_log`
- `data_lineage_events`

Constat:

- ces tables existent bien dans les modeles et migrations;
- elles sont utiles pour un CTO, car elles couvrent la conformite, les formulaires publics et le domaine MLOps;
- leur absence du dictionnaire principal rend la lecture partielle.

### 3. `docs/DATABASE.md` reste une synthese de haut niveau, pas la reference detaillee par table

Le document liste des domaines et des modeles pivots, mais il ne capture pas systematiquement:

- le writer principal par table;
- le reader principal par table;
- le niveau de criticite;
- le statut `coeur`, `projection`, `legacy`, `fail-close`, `cible`.

C'est normal pour une page generale, mais cela signifie qu'un CTO doit maintenant basculer vers:

- `docs/cto/04-schema-public-postgres.md`
- `docs/cto/10-ownership-et-tracabilite-des-donnees.md`
- `docs/cto/19-table-writers-readers-matrix.md`

pour une lecture vraiment operable.

### 4. Le domaine integrations est volontairement bi-modal

`docs/DATABASE.md` documente correctement la cible relationnelle `integration_*`, puis explicite la persistence runtime actuelle `app-connectors`.

L'ecart n'est donc pas un oubli, mais il reste une zone de risque:

- la verite schema versionnee vit cote `app-api`;
- la verite runtime active vit aujourd'hui surtout dans le snapshot `app-connectors`.

Conclusion:

- la doc est honnete sur cette dualite;
- il reste toutefois une decision d'architecture a formaliser pour trancher la convergence long terme.

### 5. Le domaine onboarding melange historique et controle plane actuel

`docs/DATABASE.md` mentionne a la fois:

- `onboarding_states`
- `onboarding_cases`
- `onboarding_case_tasks`
- `onboarding_case_blockers`
- `onboarding_case_events`

La presence simultanee est exacte, mais sans page dediee un lecteur peut croire que ces surfaces jouent le meme role. En pratique:

- `onboarding_states` est l'ancienne projection admin simple;
- `onboarding_case*` est la couche BPM/control plane actuelle;
- `029_onboarding_camunda_only.py` verrouille davantage le plan runtime moderne.

### 6. Le domaine DecisionOps est maintenant plus lisible que `docs/DATABASE.md` seul ne le laisse voir

La doc generale cite:

- `decisions`
- `operational_decisions`
- `decision_approvals`
- `action_dispatches`
- `decision_ledger_entries`

Mais elle ne raconte pas completement le partage de roles entre:

- table historique/application `decisions`;
- runtime DecisionOps persistant recent;
- projections admin/live cote `app-api-ts`.

La lecture doit donc etre completee par:

- `docs/cto/13-migrations-et-impacts-metier.md`
- `docs/cto/16-legacy-et-surfaces-fermees.md`

## Ce qui est bien aligne

- Les migrations structurantes `019`, `026`, `027`, `028` sont bien repertoriees.
- La section `Plateforme d'integration` existe et cite les tables `integration_*` critiques.
- La dualite cible relationnelle / runtime connecteurs est explicite.
- Les domaines operationnels, onboarding et DecisionOps sont bien presents dans la synthese.
- Le baseline validator protege deja les tables et migrations critiques les plus sensibles.

## Risque si on s'arrete a `docs/DATABASE.md` seul

Un CTO qui lirait uniquement cette page pourrait:

- sous-estimer le nombre reel de tables versionnees;
- manquer le domaine MLOps et RGPD;
- confondre synthese durable et dictionnaire exhaustif;
- supposer que la cible `integration_*` est deja la persistence active de production.

## Actions recommandees

### A fermer des maintenant

- Corriger dans `docs/DATABASE.md` la phrase qui parle encore de `32 tables`.
- Ajouter au minimum une sous-section courte pour:
  - RGPD
  - contact public
  - MLOps

### A maintenir comme lecture composee

- garder `docs/DATABASE.md` comme vue generale;
- renvoyer explicitement vers `docs/cto/04-schema-public-postgres.md` pour le dictionnaire detaille;
- renvoyer vers `docs/cto/19-table-writers-readers-matrix.md` pour la lecture service/table/endpoint;
- renvoyer vers l'ADR integrations pour la decision de convergence.

## Verdict CTO

`docs/DATABASE.md` est aujourd'hui:

- suffisamment bon pour orienter un lecteur;
- insuffisant comme reference exhaustive du schema reel;
- fiable sur les domaines critiques, a condition de le lire comme une synthese et non comme un inventaire complet.
