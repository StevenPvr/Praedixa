# Vocabulaire repo-wide a harmoniser

Statut: actif
Owner: CTO / platform engineering
Derniere revue: 2026-03-21
Source de verite: audit de vocabulaire base sur `docs/DATABASE.md`, `docs/ARCHITECTURE.md`, `app-api/app/models/README.md`, `app-api-ts/src/services/README.md`, `app-connectors/README.md`
Depend de: `docs/cto/README.md`
Voir aussi: `docs/cto/01-systeme-et-runtimes.md`, `docs/cto/03-modele-de-donnees-global.md`, `docs/cto/07-connecteurs-et-sync-runs.md`, `docs/cto/11-surfaces-http-et-statut.md`

## Objet

Cette page fixe le vocabulaire a privilegier pour que les docs CTO, les README proches du code et les syntheses d'architecture utilisent les memes mots pour les memes objets.

Le but n'est pas d'imposer un style litteraire unique. Le but est de reduire l'ambiguite quand un CTO cherche:

- la source de verite d'une table;
- le runtime qui ecrit ou lit une donnee;
- la difference entre cible d'architecture et etat reel;
- la frontiere entre `app-api-ts`, `app-connectors` et `app-api`.

## Termes canoniques

| Terme canonique                  | Synonymes toleres                                                          | Termes a eviter                                            | Usage recommande                                                                                                 |
| -------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `source de verite`               | `source of truth` si la citation vient d'un contrat ou d'un nom de package | `verite` seul, `single source` sans contexte               | Toujours expliciter la source sur laquelle on s'appuie: modele, migration, contrat, runtime ou doc de synthese.  |
| `schema public`                  | `schema PostgreSQL public`                                                 | `base` au sens generique, `DB` sans precision              | Employer pour le schema commun applique par Alembic.                                                             |
| `schemas {org}_data`             | `schema data client`, `schema par client`                                  | `schema org`, `tenant schema` sans explication             | Utiliser pour les donnees brutes et transformees par organisation.                                               |
| `runtime TypeScript`             | `app-api-ts`, `pivot HTTP`                                                 | `backend` seul, `API` seul                                 | Reserve aux surfaces HTTP et de persistance Node/TS.                                                             |
| `runtime Python`                 | `app-api`, `data plane Python`                                             | `pipeline backend` vague, `worker` seul                    | Reserve aux jobs data/ML, a l'ingestion et aux traitements batch.                                                |
| `control plane des integrations` | `plateforme d'integration` dans un contexte d'overview                     | `integration layer` non defini                             | Preferer pour `app-connectors` quand on parle de configuration, d'authentification et de runs.                   |
| `sync run`                       | `sync-run` dans une URL ou un identifiant lisible                          | `sync job`, `sync execution`                               | Utiliser pour l'objet metier de synchronisation; garder `sync_runs` pour le nom SQL.                             |
| `raw event`                      | `raw event` anglais, `evenement brut` en prose francaise                   | `event` seul, `payload` seul                               | Utiliser pour l'objet brut arrive du fournisseur avant normalisation.                                            |
| `canonical record`               | `canonical`, `canonique` si la phrase reste francaise                      | `normalise` quand on parle d'un read-model metier          | Utiliser pour les enregistrements de reference metier dans le schema public.                                     |
| `gold`                           | `read-model Gold`, `couche Gold`                                           | `final`, `production ready`                                | Utiliser pour la couche la plus exploitable par les fronts et les reads metier.                                  |
| `DecisionOps`                    | `decision ops` dans une phrase d'explication courte                        | `decision engine` s'il s'agit du produit dans son ensemble | Garder le nom de domaine pour `DecisionContract`, `DecisionGraph`, `Approval`, `ActionDispatch`, `LedgerEntry`.  |
| `onboarding BPM`                 | `onboarding Camunda` quand le moteur est cite explicitement                | `workflow` seul                                            | Utiliser pour `onboarding_cases`, `onboarding_case_tasks`, `onboarding_case_blockers`, `onboarding_case_events`. |
| `tenant` / `organization`        | `org` en debug ou dans un chemin technique                                 | `client` quand on parle du schema ou des IDs               | `organization` pour le domaine metier, `tenant` pour l'isolation multi-tenant.                                   |
| `site`                           | `site_id`, `site`                                                          | `location` si le modele parle de `sites`                   | Garder `site` pour la granularite operationnelle et le filtrage de donnees.                                      |
| `BFF same-origin`                | `BFF Next` si le contexte est deja explicite                               | `frontend API`                                             | Utiliser pour `app-webapp` et `app-admin` quand le navigateur ne parle pas directement au backend.               |
| `read-model`                     | `read model`, `projection` si la nature du flux est claire                 | `cache` quand il s'agit d'une table durable                | Utiliser pour les tables derivees ou de consultation.                                                            |

## Termes a eviter dans les docs CTO

- les docs de cadrage/PRD comme reference normative sans les requalifier explicitement.
- `DB` seul quand on parle de PostgreSQL, des schemas ou des migrations.
- `backend` seul quand le lecteur doit savoir si l'on parle de `app-api-ts`, `app-connectors` ou `app-api`.
- `canonicale` en prose francaise quand `canonique` ou `canonical record` suffit.
- `pipeline` seul quand la nature du flux n'est pas precisee.
- `runtime` seul quand il faut distinguer TypeScript, Python, connecteurs ou BFF.
- `workflow` seul quand le dossier parle en realite d'un BPM Camunda.

## Points de realignement prioritaires

### 1. `docs/DATABASE.md`

- Remplacer les formulations variables entre `schema`, `schema public`, `schema par client`, `plateforme d'integration` et `runtime actuel` par les termes canoniques ci-dessus.
- Uniformiser `canonical`, `canonique` et `Gold` pour parler des couches de donnees.
- Garder `integration_*` pour la cible relationnelle et `app-connectors` pour l'etat runtime reel, sans melanger les deux dans le meme paragraphe.

### 2. `docs/ARCHITECTURE.md`

- Harmoniser `control plane des integrations` et `data plane Python` avec les autres pages CTO.
- Remplacer les formulations generiques `backend`, `API`, `pipeline backend` par `app-api-ts`, `app-connectors` ou `app-api` selon le cas.
- Verifier que `source de verite`, `tenant`, `site` et `read-model` sont utilises de la meme maniere que dans `docs/cto/`.

### 3. `app-api/app/models/README.md`

- Harmoniser `modele de donnees`, `table`, `runtime` et `domaines couverts` avec la nomenclature CTO.
- Clarifier les passages sur `integration.py` pour ne pas confondre cible relationnelle `integration_*` et snapshot runtime `app-connectors`.
- Aligner le vocabulaire `admin`, `onboarding`, `DecisionOps` et `MLOps` avec les pages CTO correspondantes.

### 4. `app-api-ts/src/services/README.md`

- Remplacer `service`, `backend`, `surface live`, `surface admin` par une terminologie plus stable: `service metier`, `pivot HTTP`, `read-model`, `mutation persistante`.
- Uniformiser `org`, `organization`, `tenant`, `site` et `decision` pour que les handlers parlent le meme langage que les pages CTO.
- Faire correspondre le vocabulaire `fail-close`, `projection`, `persistant` et `historique` aux definitions deja posees dans les docs CTO.

### 5. `app-connectors/README.md`

- Stabiliser `control plane des integrations`, `sync run`, `raw event`, `runtime` et `worker` sur les memes termes que `docs/DATABASE.md` et `docs/cto/07-connecteurs-et-sync-runs.md`.
- Distinguer explicitement `capability`, `auth mode`, `credential`, `payload store` et `execution plan`.
- Garder `app-connectors` comme nom du runtime, sans le rebaptiser `integration layer` ou `backend connectors` dans les sections descriptives.

## Regle pratique

Si un terme peut vouloir dire deux choses differentes dans le repo, il ne doit pas apparaitre seul dans une doc CTO.

Exemples:

- `backend` doit devenir `app-api-ts`, `app-connectors` ou `app-api`.
- `pipeline` doit devenir `data pipeline`, `BPM`, `sync pipeline`, `medallion pipeline` ou `ETL` selon le cas.
- `runtime` doit devenir `runtime TypeScript`, `runtime Python` ou `runtime connecteurs`.
- `canonical` doit devenir `canonical record` ou `canonique` selon le contexte.

## Fichiers a realigner ensuite

1. `docs/DATABASE.md`
1. `docs/ARCHITECTURE.md`
1. `app-api/app/models/README.md`
1. `app-api-ts/src/services/README.md`
1. `app-connectors/README.md`

## Definition de done

- Un CTO doit pouvoir lire une page du repo sans hesiter sur le sens de `runtime`, `backend`, `pipeline`, `canonical`, `sync run` ou `raw event`.
- Les docs d'architecture et les README proches du code doivent utiliser les memes noms pour les memes objets.
- Les noms techniques doivent rester distincts des termes metier quand les deux peuvent diverger.
