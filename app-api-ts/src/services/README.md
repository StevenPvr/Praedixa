# `src/services/` - Services metier et persistance API TS

## Role

Ce dossier concentre les acces SQL et les transformations de donnees consommees par `routes.ts`.

## Fichiers

- `persistence.ts`
  - pool `pg`
  - helpers transactionnels
  - normalisation erreurs SQL
  - garde-fous `DATABASE_URL` et validation UUID

- `operational-data.ts`
  - lecture des alertes de couverture, canonical, dashboards live, forecasts, proof packs, onboarding
  - mapping des enregistrements persistants vers les DTO utilises par les routes live et admin

- `gold-explorer.ts`
  - exploration schema, lignes, couverture et provenance des tables Gold persistantes
  - alimente la surface `/api/v1/live/gold/*`

- `decision-config.ts`
  - service singleton de configuration du moteur de decision
  - resolution des horizons et options recommandees
  - historisation/versioning admin

- `decision-contract-templates.ts`
  - catalogue versionne de templates `DecisionContract` par pack
  - listing filtre et previsualisation d'instanciation non persistante

- `decision-contract-runtime.ts`
  - persistance org-scoped des `DecisionContract`
  - Contract Studio runtime pour liste/detail/historique, creation de draft, transitions, fork et rollback
  - audit dedie des mutations de contrat et archivage automatique des versions publiees supplantees
  - les rollback drafts reouvrent maintenant un vrai draft propre: validation remise a `pending`, audit de publication nettoye, et `rollbackFromVersion` pointe explicitement vers la version courante remplacee

- `decision-compatibility.ts`
  - evaluation de compatibilite `DecisionContract <-> DecisionGraph`
  - detection des gaps bloquants et warnings de gouvernance

- `admin-monitoring.ts`
  - KPIs plateforme
  - tendances, erreurs, ROI, couverture canonicale, adoption decisions
  - surface de monitoring pour le backoffice

- `admin-backoffice.ts`
  - service agrege pour organisations, utilisateurs, onboarding, billing, conversations, alerts et datasets admin
  - expose un point d'entree unique cote handlers admin
  - le lifecycle `invite/change_role/deactivate/reactivate` synchronise maintenant aussi Keycloak pour garder `users.auth_user_id`, `role`, `organization_id`, `site_id` et l'etat `enabled` coherents

- `keycloak-admin-identity.ts`
  - client REST sortant strict vers Keycloak admin API
  - creation des comptes client depuis le backoffice, sync des attributs canoniques et du realm role, envoi de l'email `UPDATE_PASSWORD`
  - compensation explicite par suppression du user Keycloak si la persistence DB echoue apres le provisioning IAM

- `decisionops-runtime.ts`
  - persistance read-model pour `Approval`, `ActionDispatch` et `LedgerEntry`
  - initialisation transactionnelle du triplet approval/action/ledger a la creation d'une `operational_decision`
  - lectures admin read-only pour inbox d'approbation, detail de dispatch et detail de ledger
  - s'appuie sur des helpers freres pour les builders et les insertions SQL afin de garder le service principal sous les guardrails
  - le seed runtime mappe maintenant explicitement les `ScenarioOptionType` supportes vers les couples `actionType + destinationType` du catalogue `action-templates`, et echoue explicitement si aucun binding n'est configure

- `decisionops-runtime-approval.ts`
  - mutation persistante des decisions d'approbation admin
  - cascade coherente en cas de rejet (annulation des approbations soeurs encore ouvertes, annulation du dispatch pending)
  - synchronisation du snapshot ledger interne sans pretendre qu'un write-back externe a deja eu lieu

- `decisionops-runtime-action.ts`
  - mutation persistante des decisions de lifecycle sur `ActionDispatch`
  - progression du runtime `dispatched/acknowledged/failed/retried/canceled`
  - preparation et execution explicites du fallback humain persistant
  - enforcement backend des permissions de write-back par contrat et par destination
  - resynchronisation du ledger le plus recent lie a la recommendation

- `decisionops-runtime-ledger.ts`
  - mutation persistante des decisions finance-grade sur `LedgerEntry`
  - cloture, recalcul revisionne et validation `estimated/validated/contested`
  - preuves d'export readiness derivees de la revision selectionnee

## Flux standard

1. `routes.ts` valide la requete et le contexte.
2. Le handler appelle un service ici.
3. Le service interroge Postgres ou transforme les lignes brutes.
4. Le handler repond via `success()` ou `failure()`.

## Dependances fortes

- `DATABASE_URL` pour toute persistance.
- `DecisionConfigService` initialise au demarrage via `src/index.ts`.
- `app-connectors` pour les appels admin integrations, hors de ce dossier.
- `KEYCLOAK_ADMIN_USERNAME` + `KEYCLOAK_ADMIN_PASSWORD` pour les mutations admin de lifecycle utilisateur qui doivent provisionner l'identite reelle.

## Quand modifier quoi

- Ajouter une nouvelle lecture SQL produit/admin : `operational-data.ts`, `gold-explorer.ts` ou `admin-monitoring.ts`.
- Ajouter une operation admin transverse : `admin-backoffice.ts`.
- Ajouter une lecture ou une initialisation DecisionOps persistante : `decisionops-runtime.ts`.
- Ajouter une mutation d'approbation persistante : `decisionops-runtime-approval.ts`.
- Ajouter une mutation de lifecycle dispatch persistante : `decisionops-runtime-action.ts`.
- Ajouter un garde-fou d'idempotence ou un invariant DB sur `action_dispatches` : `decisionops-runtime.ts` + `migrations/`.
- Ajouter une mutation finance-grade sur le ledger persistant : `decisionops-runtime-ledger.ts`.
- Ajouter une mutation persistante de gouvernance `DecisionContract` : `decision-contract-runtime.ts`.
- Exposer un nouveau calcul admin pur autour du contrat ou du graphe : `decision-contract-templates.ts`, `decision-compatibility.ts` ou `decision-graph-explorer.ts`.
- Modifier le moteur de configuration de decision : `decision-config.ts` + migration SQL si schema touche.
- Modifier les garde-fous DB : `persistence.ts`.
