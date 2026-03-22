# Onboarding CTO Donnees Et Architecture

Statut: actif
Owner: CTO / platform engineering
Derniere revue: 2026-03-21
Source de verite: ce dossier synthétise la lecture CTO; les vérités d'exécution restent dans les runtimes, contrats et migrations référencés ci-dessous
Depend de: `README.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `contracts/README.md`, `packages/shared-types/README.md`
Voir aussi: `docs/cto/01-systeme-et-runtimes.md`, `docs/cto/03-modele-de-donnees-global.md`, `docs/cto/06-flux-de-donnees-applicatifs.md`, `docs/cto/07-connecteurs-et-sync-runs.md`, `docs/cto/08-contrats-et-types-partages.md`, `docs/cto/09-runbook-exploration-bd.md`, `docs/cto/10-ownership-et-tracabilite-des-donnees.md`, `docs/cto/11-surfaces-http-et-statut.md`, `docs/cto/12-ui-endpoint-service-table-type.md`, `docs/cto/13-migrations-et-impacts-metier.md`, `docs/cto/14-telemetry-et-correlation.md`, `docs/cto/15-capabilities-et-securite-connecteurs.md`, `docs/cto/16-legacy-et-surfaces-fermees.md`, `docs/cto/17-taxonomies-et-registres.md`, `docs/cto/18-audit-ecarts-database-doc.md`, `docs/cto/19-table-writers-readers-matrix.md`, `docs/cto/20-hierarchie-documentaire-et-normativite.md`, `docs/cto/21-vocabulaire-harmonisation-repo.md`, `docs/cto/22-auth-modes-connecteurs-et-audit-integration.md`

## But

Ce dossier existe pour qu'un nouveau CTO puisse comprendre rapidement:

- où se trouvent les sources de vérité du système;
- comment les données circulent entre les apps et les runtimes;
- quelles briques écrivent, lisent ou dérivent les données;
- où commencer selon le temps disponible.

Il ne remplace pas les docs locales. Il les ordonne.

## Parcours 30 / 90 / 180 minutes

### En 30 minutes

Objectif: comprendre la carte globale et savoir où chercher.

1. [`01-systeme-et-runtimes.md`](./01-systeme-et-runtimes.md)
2. [`../ARCHITECTURE.md`](../ARCHITECTURE.md)
3. [`../DATABASE.md`](../DATABASE.md)
4. [`08-contrats-et-types-partages.md`](./08-contrats-et-types-partages.md)
5. [`11-surfaces-http-et-statut.md`](./11-surfaces-http-et-statut.md)

À la fin de ce parcours, un CTO doit savoir:

- quel runtime parle à qui;
- où vivent le schéma PostgreSQL, les contrats HTTP et les types partagés;
- quelle différence il y a entre `app-api-ts`, `app-connectors` et `app-api`.

### En 90 minutes

Objectif: comprendre la base et les flux critiques.

1. [`03-modele-de-donnees-global.md`](./03-modele-de-donnees-global.md)
2. [`04-schema-public-postgres.md`](./04-schema-public-postgres.md)
3. [`05-schemas-tenant-et-medallion.md`](./05-schemas-tenant-et-medallion.md)
4. [`06-flux-de-donnees-applicatifs.md`](./06-flux-de-donnees-applicatifs.md)
5. [`07-connecteurs-et-sync-runs.md`](./07-connecteurs-et-sync-runs.md)
6. [`10-ownership-et-tracabilite-des-donnees.md`](./10-ownership-et-tracabilite-des-donnees.md)
7. [`12-ui-endpoint-service-table-type.md`](./12-ui-endpoint-service-table-type.md)
8. [`13-migrations-et-impacts-metier.md`](./13-migrations-et-impacts-metier.md)
9. [`19-table-writers-readers-matrix.md`](./19-table-writers-readers-matrix.md)

À la fin de ce parcours, un CTO doit savoir:

- quelles tables et quels domaines sont critiques;
- comment remonter d'un écran à une table et inversement;
- où se trouvent les zones ambiguës entre cible et réalité runtime.

### En 180 minutes

Objectif: être opérationnel pour auditer, expliquer et orienter les prochains chantiers.

1. [`02-vocabulaire-et-domaines.md`](./02-vocabulaire-et-domaines.md)
2. [`08-contrats-et-types-partages.md`](./08-contrats-et-types-partages.md)
3. [`09-runbook-exploration-bd.md`](./09-runbook-exploration-bd.md)
4. [`10-ownership-et-tracabilite-des-donnees.md`](./10-ownership-et-tracabilite-des-donnees.md)
5. [`11-surfaces-http-et-statut.md`](./11-surfaces-http-et-statut.md)
6. [`14-telemetry-et-correlation.md`](./14-telemetry-et-correlation.md)
7. [`15-capabilities-et-securite-connecteurs.md`](./15-capabilities-et-securite-connecteurs.md)
8. [`16-legacy-et-surfaces-fermees.md`](./16-legacy-et-surfaces-fermees.md)
9. [`17-taxonomies-et-registres.md`](./17-taxonomies-et-registres.md)
10. [`18-audit-ecarts-database-doc.md`](./18-audit-ecarts-database-doc.md)
11. [`19-table-writers-readers-matrix.md`](./19-table-writers-readers-matrix.md)
12. [`20-hierarchie-documentaire-et-normativite.md`](./20-hierarchie-documentaire-et-normativite.md)
13. [`21-vocabulaire-harmonisation-repo.md`](./21-vocabulaire-harmonisation-repo.md)
14. [`22-auth-modes-connecteurs-et-audit-integration.md`](./22-auth-modes-connecteurs-et-audit-integration.md)
15. les visuels versionnés dans `visuals/`
16. les docs locales référencées en fin de chaque page de ce dossier

À la fin de ce parcours, un CTO doit pouvoir:

- expliquer le modèle de données à un nouvel arrivant;
- identifier la bonne source de vérité pour un flux;
- distinguer une surface legacy, un read-model actif et un contrat normatif.

## Hiérarchie officielle des sources de vérité

### 1. Schéma et persistance PostgreSQL

- Schéma courant côté Python: `app-api/app/models/*`
- Historique et évolution du schéma: `app-api/alembic/versions/*`
- Synthèse durable: [`../DATABASE.md`](../DATABASE.md)

### 2. Contrats HTTP et contrats transverses

- Surface publique non-admin: `contracts/openapi/public.yaml`
- Contrats internes et taxonomies: `contracts/*`
- Types partagés consommés par les apps: `packages/shared-types/*`

### 3. Runtime applicatif

- Frontières HTTP et services Node/TS: `app-api-ts/*`
- Control plane intégrations: `app-connectors/*`
- Data-plane Python, pipelines et workers: `app-api/*`

### 4. Synthèse et onboarding

- Ce dossier `docs/cto/`
- `docs/ARCHITECTURE.md`
- `docs/README.md`

### 5. Docs de plan, PRD et historique

- `docs/plans/*`
- `docs/prd/*`

Ces documents restent utiles pour le contexte, mais ils ne doivent pas être lus comme vérité runtime sans recoupement avec le code et les docs durables ci-dessus.

## Ce qu'un CTO doit retenir immédiatement

- `app-webapp` et `app-admin` ne parlent pas directement au backend depuis le navigateur: ils passent par un BFF Next same-origin.
- `app-api-ts` est le pivot HTTP produit/admin et lit directement PostgreSQL.
- `app-connectors` est le control plane des intégrations et des `sync_runs`.
- `app-api` Python porte la vérité pipeline Data/ML, la transformation Bronze/Silver/Gold et les workers batch.
- PostgreSQL est partagé, mais la responsabilité des données est répartie par runtime et par domaine.
- Toutes les docs n'ont pas le même statut: la priorité va aux migrations, modèles, contrats versionnés et docs CTO.

## Règles de lecture

- Toujours partir d'un flux ou d'une table, pas d'un dossier au hasard.
- Si une doc et le code divergent, la vérité d'exécution l'emporte.
- Si une surface semble ambiguë, vérifier d'abord si elle est active, legacy, fail-close ou seulement projetée.

## Pages de ce dossier

- [`01-systeme-et-runtimes.md`](./01-systeme-et-runtimes.md): frontières des apps et runtimes
- [`02-vocabulaire-et-domaines.md`](./02-vocabulaire-et-domaines.md): glossaire CTO
- [`03-modele-de-donnees-global.md`](./03-modele-de-donnees-global.md): vue d'ensemble du modèle de données
- [`04-schema-public-postgres.md`](./04-schema-public-postgres.md): dictionnaire du schéma `public`
- [`05-schemas-tenant-et-medallion.md`](./05-schemas-tenant-et-medallion.md): schémas `{org}_data`, Bronze/Silver/Gold
- [`06-flux-de-donnees-applicatifs.md`](./06-flux-de-donnees-applicatifs.md): flux front/API/DB/data-plane
- [`07-connecteurs-et-sync-runs.md`](./07-connecteurs-et-sync-runs.md): intégrations, `sync_runs`, `raw_events`
- [`08-contrats-et-types-partages.md`](./08-contrats-et-types-partages.md): contrats, types et taxonomies
- [`09-runbook-exploration-bd.md`](./09-runbook-exploration-bd.md): exploration et vérification opérationnelle
- [`10-ownership-et-tracabilite-des-donnees.md`](./10-ownership-et-tracabilite-des-donnees.md): matrice writers/readers/owners
- [`11-surfaces-http-et-statut.md`](./11-surfaces-http-et-statut.md): statut `live` / `persistant` / `fail-close`
- [`12-ui-endpoint-service-table-type.md`](./12-ui-endpoint-service-table-type.md): matrice UI -> endpoint -> service -> table -> type
- [`13-migrations-et-impacts-metier.md`](./13-migrations-et-impacts-metier.md): lecture CTO de l'historique Alembic
- [`14-telemetry-et-correlation.md`](./14-telemetry-et-correlation.md): IDs de correlation, propagation et playbook d'incident
- [`15-capabilities-et-securite-connecteurs.md`](./15-capabilities-et-securite-connecteurs.md): taxonomie `ServiceTokenCapability` et frontiere de confiance
- [`16-legacy-et-surfaces-fermees.md`](./16-legacy-et-surfaces-fermees.md): legacy, convergence, fail-close et surfaces operables
- [`17-taxonomies-et-registres.md`](./17-taxonomies-et-registres.md): registre des taxonomies et versions transverses
- [`18-audit-ecarts-database-doc.md`](./18-audit-ecarts-database-doc.md): audit des écarts entre synthèse DB et code réel
- [`19-table-writers-readers-matrix.md`](./19-table-writers-readers-matrix.md): matrice fine table -> writer -> reader -> consommateur
- [`20-hierarchie-documentaire-et-normativite.md`](./20-hierarchie-documentaire-et-normativite.md): norme de lecture des docs durables vs PRD/plans
- [`21-vocabulaire-harmonisation-repo.md`](./21-vocabulaire-harmonisation-repo.md): vocabulaire canonique et termes à réaligner
- [`22-auth-modes-connecteurs-et-audit-integration.md`](./22-auth-modes-connecteurs-et-audit-integration.md): audit des auth modes connecteurs et des écarts runtime -> modèle durable
