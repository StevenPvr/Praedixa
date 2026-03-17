# Build Release SRE Readiness Spec

## Role de ce document

Ce document ferme la couche "operable en vrai" du PRD:

- qualite et gates;
- release et rollback;
- observabilite et supportability;
- performance et cout;
- exit gate build-ready.

Il evite que le PRD reste seulement un spec produit sans autorite merge/release.

## Sources de verite

- `docs/prd/Praedixa_PRD_DecisionOps_PRD_final.md`
- `docs/prd/decisionops-v1-execution-backbone.md`
- `docs/prd/matrice-verification-parcours-confiance.md`
- `docs/prd/TODO.md`

## Resultat attendu

Le repo devient build-ready quand:

- les controles locaux et distants sont alignes et bloquants;
- les services deployables ont un chemin unique de bootstrap et release;
- le rollback, les migrations et le restore sont prouves;
- les parcours critiques sont monitorables sans SSH artisanal;
- les budgets perf/cout et les suites de regression existent;
- l'exit gate final n'est plus une hypothese orale.

## 1. Merge authority

La qualite ne doit plus dependre uniquement du poste local.

Minimum attendu:

- branch protection active sur les checks requis;
- differenciation explicite entre "merge blocker" et "release blocker";
- checks de contrats, types, architecture et politiques de gouvernance dans la CI distante;
- suites de regression scenario/action/ledger versionnees dans le pipeline officiel.

Le merge n'est pas autorise si les controles requis ne tournent pas vraiment a distance.

## 2. Release path unique

Chaque service deployable doit avoir:

- un artefact immutable;
- un bootstrap reproductible de local -> staging -> prod;
- un smoke post-deploy;
- un owner clair.

Le produit ne doit pas dependre de scripts manuels implicites differents selon le service.

## 3. Rollback, migrations et restore

### Rollback

Chaque service deployable doit avoir:

- une procedure de rollback documentee;
- une preuve de rollback executee;
- des preconditions et postconditions verifiables.

### Migrations

La strategie de migration doit expliciter:

- compatibilite applicative;
- ordre de deploiement;
- comportements transitoires acceptes;
- point de non-retour.

### Restore

Le restore doit prouver:

- que les metadonnees critiques sont sauvegardees;
- qu'une restauration reelle a deja ete executee;
- quel est le RTO/RPO attendu.

## 4. Observabilite et supportability

Le minimum operable est:

- propagation de `request_id`, `run_id`, `contract_version`, `connector_run_id`, `action_id`;
- dashboards pour freshness connecteurs, latence scenario, echec dispatch, auth, drift, fermeture ledger;
- synthetics provider-backed sur landing, webapp, admin, API et auth;
- support console least-privilege pour jobs, actions et erreurs par tenant;
- matrice de severite, d'escalade et de runbooks par incident.

Sans cela, un incident critique n'est pas operable a l'echelle.

## 5. Maintenance et degraded mode

Le produit doit pouvoir:

- entrer en maintenance mode par tenant;
- afficher un degraded mode explicite;
- empecher les write-backs si les preconditions de confiance ne sont plus reunies.

Le degraded mode n'est pas une exception UX.
C'est un etat runtime et support reconnu.

## 6. Performance et cout

Le minimum attendu:

- budgets perf/scalabilite versionnes et bloquants;
- suites de charge sur sync, scenario, dispatch, ledger;
- cost monitoring et alertes budget;
- profiling des requetes SQL chaudes et pagination critique;
- preuve qu'aucune surface critique ne depend d'un full refresh non budgete.

Une performance ambitieuse non mesuree n'est pas une exigence exploitable.

## 7. Exit gate final

L'exit gate build-ready n'est pas un slogan.
Il doit pouvoir etre relu comme un verdict compose de preuves:

- toutes les sections ouvertes 1 a 14 fermees;
- `pnpm build`, `lint`, `typecheck`, `test`, E2E utiles et tests Python verts;
- gates locaux verts;
- CI distante verte et bloquante;
- staging deployable et smoke green;
- rollback documente et teste;
- aucun chemin critique appuye sur demo/fallback implicite;
- contrats, types, runtime et docs alignes.

## Cartographie merge blocker vs release blocker

| Domaine                | Merge blocker minimum           | Release blocker minimum                       |
| ---------------------- | ------------------------------- | --------------------------------------------- |
| Contrats et types      | schemas et compatibilite vertes | smoke sur runtime reel                        |
| Scenario/action/ledger | regression et securite vertes   | charge, smoke et dashboards                   |
| Infra et deploiement   | pipeline distant requis actif   | bootstrap, rollback, restore prouves          |
| Observabilite          | instrumentation et IDs presents | synthetics, alertes et support console actifs |
| Performance/cout       | budgets versionnes              | validation charge et monitoring budget        |

## Evidence minimale par cluster

### Qualite et gates

- pipeline officiel versionne;
- checks requis actifs;
- rapport clair merge vs release.

### Release et reprise

- runbooks executes;
- evidence smoke post-deploy;
- preuves rollback et restore.

### SRE et support

- dashboards;
- alerts;
- synthetics;
- severity matrix;
- support console.

### Performance et cout

- rapports de charge;
- budgets versionnes;
- cost alerts;
- evidence SQL/pagination.

## Interpretation du TODO.md a travers ce spec

| Section du `TODO.md`     | Fermeture apportee                                                |
| ------------------------ | ----------------------------------------------------------------- |
| 10. Qualite et CI/CD     | merge authority, regressions officielles, budgets bloquants       |
| 11. Infra et release     | bootstrap, rollback, migrations, restore, provenance              |
| 12. Observabilite et SRE | IDs, dashboards, synthetics, support console, severity matrix     |
| 13. Performance et cout  | budgets, cost monitoring, profiling SQL, no full-refresh critique |
| 15. Exit gate final      | verdict build-ready composable et prouvable                       |

## Decision de cadrage

Tant que ce spec n'est pas vrai, Praedixa peut encore livrer des briques produit, mais le monorepo n'est pas build-ready au sens revendique par `docs/prd/TODO.md`.
