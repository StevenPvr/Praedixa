# `src/services/` - Services metier et persistance API TS

## Role

Ce dossier concentre les services metier du pivot HTTP `app-api-ts`: acces SQL, mutations persistantes et read-models consommes par `routes.ts`.

Lire aussi:

- `docs/cto/11-surfaces-http-et-statut.md` pour le statut des surfaces `live` / `persistant` / `fail-close`.
- `docs/cto/12-ui-endpoint-service-table-type.md` pour la matrice UI -> endpoint -> service -> table -> type.
- `docs/cto/19-table-writers-readers-matrix.md` pour la lecture table -> writer -> reader -> consommateur.

## Fichiers

- `persistence.ts`
  - pool `pg`
  - helpers transactionnels
  - normalisation erreurs SQL
  - garde-fous `DATABASE_URL` et validation UUID

- `operational-data.ts`
  - lecture des alertes de couverture, `canonical_records`, dashboards live, forecasts, proof packs, onboarding
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
  - les actions d'audit sont maintenant centralisees sur des literals runtime stables pour eviter un nouveau drift entre service, migration SQL et surfaces admin
  - les rollback drafts reouvrent maintenant un vrai draft propre: validation remise a `pending`, audit de publication nettoye, et `rollbackFromVersion` pointe explicitement vers la version courante remplacee

- `decision-contract-runtime-store.ts`
  - schema SQL source de verite du Contract Studio (`decision_contract_versions`, `decision_contract_audit`)
  - reconciliation non destructive des anciennes colonnes/runtime drifts au boot (`contract_json -> payload`, `audit_id -> id`, `event_type -> action`)
  - l'audit persiste maintenant `action` et `reason` en clair, sans enum SQL fragile qui diverge des transitions runtime

- `decision-compatibility.ts`
  - evaluation de compatibilite `DecisionContract <-> DecisionGraph`
  - detection des gaps bloquants et warnings de gouvernance

- `admin-monitoring.ts`
  - KPIs plateforme
  - tendances, erreurs, ROI, couverture canonique, adoption decisions
  - surface de monitoring pour le backoffice
  - le miroir org admin doit rester cale sur le schema persistant reel: les effectifs proviennent de `users`, pas d'une table legacy `employees`

- `admin-backoffice.ts`
  - service agrege pour organisations, utilisateurs, onboarding, billing, conversations, alerts et datasets admin
  - expose un point d'entree unique cote handlers admin
  - alimente maintenant aussi la liste paginee des organisations backoffice avec filtres `search/status/plan`, la creation persistante minimale d'organisation via `POST /api/v1/admin/organizations`, le detail org avec hierarchie sites/departements et les slices alerts/scenarios du dashboard overview
  - `POST /api/v1/admin/organizations` provisionne maintenant aussi le premier compte client `org_admin` sur `contactEmail`, avec compensation Keycloak si l'ecriture SQL rollback ensuite, et retente apres purge controlee d'un ancien compte Keycloak orphelin detecte par `email` ou `username`, y compris les users legacy non relies localement
  - persiste maintenant le flag `isTest` dans `organizations.settings.adminBackoffice.isTest` pour distinguer explicitement les clients de test des vrais comptes
  - expose aussi la suppression destructive `deleteOrganization(...)`, reservee aux seuls clients `isTest` avec validation serveur des confirmations (`slug` + `SUPPRIMER`)
  - cette suppression destructive purge aussi les identites Keycloak encore visibles via `users.auth_user_id` ou via une recherche de login (`email` + `username`) + `organization_id`, afin qu'un client test supprime soit vraiment recreable sans conflit IAM residuel
  - alimente aussi `GET /api/v1/admin/organizations/:orgId/ingestion-log` depuis `ingestion_log + client_datasets`, avec mapping stable des statuts et calcul `rowsRejected`
  - les lectures `overview` pour une org fraiche doivent rester compatibles avec le schema SQL reel: `coverage_alerts.site_id` est un `varchar` a relier via `sites.id::text`, pas un UUID comparable directement
  - alimente aussi le compteur admin `GET /api/v1/admin/conversations/unread-count` depuis `messages + conversations + organizations`, sans payload stub
  - alimente aussi les demandes de contact admin avec listing pagine/filtre et mutation persistante de statut
  - alimente aussi le journal admin avec listing persistant `admin_audit_log`, pagination et filtre `action`
  - le lifecycle `invite/change_role/deactivate/reactivate` synchronise maintenant aussi Keycloak pour garder `users.auth_user_id`, `role`, `organization_id`, `site_id` et l'etat `enabled` coherents
  - chaque invitation client cree maintenant aussi une tentative persistante de preuve de delivery (`identity_invitation_delivery_attempts`) pour distinguer l'initialisation Keycloak du vrai feedback provider
  - les ecritures d'audit/historique ne supposent plus que l'acteur admin OIDC existe dans `users.id`: le service resout d'abord un user row local eventuel via `id` ou `auth_user_id`, puis persiste sinon l'acteur auth opaque dans les colonnes de fallback du schema

- `admin-onboarding.ts`
  - domaine persistant onboarding BPM (`onboarding_cases`, `tasks`, `blockers`, `events`)
  - creation de case, supervision cross-org, detail org-scope, sauvegarde de brouillon, completion de tache et lifecycle case (`recompute/cancel/reopen`)
  - orchestration reelle via Camunda 8, projection applicative en base SQL et compensation de cancellation si l'ecriture locale casse apres le start process
  - les lectures `getOnboardingCase*` degradent maintenant proprement vers le bundle persistant quand le sync Camunda est indisponible, en marquant `metadataJson.projectionSync.status = "stale"` plutot que de casser le chargement initial en `503`

- `admin-onboarding-support.ts`
  - taxonomie de statuts/domaines, validation des payloads operateurs, mapping DTO et seed initial des taches/blockers
  - l'etape `access-model` n'accepte plus une simple case cochee: elle exige maintenant une evidence d'invitations securisees initialisees cote identite (`inviteRecipients` acceptes par Keycloak `execute-actions-email`)
  - les recipients d'acces peuvent maintenant aussi embarquer une `deliveryProof` provider-side (`pending`, `provider_accepted`, `delivery_delayed`, `delivered`, `bounced`, `complained`, `failed`) pour ne plus sur-promettre la livraison reelle

- `admin-onboarding-store.ts`
  - primitives transactionnelles onboarding, garde-fous RLS, inserts seed et lecture detaillee d'un case
  - les events onboarding ne supposent plus qu'un `userId` JWT en UUID existe vraiment dans `users.id`; la FK `actor_user_id` n'est renseignee que si un user local resolvable existe, et l'identifiant auth opaque reste dans `payload_json`

- `admin-onboarding-camunda.ts`
  - runtime singleton Camunda 8 pour deployer `client-onboarding-v1`, demarrer les process, lire les user tasks et completer/cancel les workflows

- `admin-onboarding-process.ts`
  - definition BPMN embarquee du process `client-onboarding-v1`
  - taxonomie stable des `elementId` user tasks et mapping `Camunda -> status runtime`

- `admin-onboarding-runtime.ts`
  - synchronisation de projection `Camunda -> onboarding_case_tasks/blockers/case`
  - lecture bundle complete, sauvegarde de brouillon et completion de tache actionable cote Praedixa
  - enrichit maintenant les `inviteRecipients` du workspace avec la derniere preuve provider persistante, en overlay live sur le brouillon onboarding
  - preservation des etats terminaux `cancelled/completed` et projection des statuts `ready/active` sur les nouvelles etapes activation/hypercare

- `camunda-rest.ts`
  - client REST Orchestration Cluster API
  - auth `none`, `basic`, `oidc` et normalisation stricte des erreurs fournisseur

- `keycloak-admin-identity.ts`
  - client REST sortant strict vers Keycloak admin API
  - creation des comptes client depuis le backoffice, sync des attributs canoniques et du realm role, puis declenchement de l'email `UPDATE_PASSWORD`
  - si le realm Keycloak n'a pas de sender email configure (`smtpServer.from`), remonte maintenant un fail-close explicite `IDENTITY_EMAIL_NOT_CONFIGURED` au lieu du message SMTP brut `Invalid sender address 'null'`
  - caracterise maintenant les conflits `POST /users` en distinguant `email`, `username` et login ambigu, et expose des helpers de recherche exacte pour les cleanups admin
  - compensation explicite par suppression du user Keycloak si la persistence DB echoue apres le provisioning IAM
  - un `204` sur `execute-actions-email` prouve seulement que Keycloak a accepte l'initialisation de l'invitation, pas que l'email a ete effectivement livre en boite de reception

- `invitation-delivery-proof.ts`
  - persistance des tentatives d'invitation Keycloak et des evenements provider Resend signes
  - verification `Svix` sur le raw body (`svix-id`, `svix-timestamp`, `svix-signature`)
  - stockage idempotent des events, matching fail-close sur l'invitation Keycloak attendue, et exposition d'une preuve lisible cote admin/onboarding

- `decisionops-runtime.ts`
  - persistance de read-models pour `Approval`, `ActionDispatch` et `LedgerEntry`
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
  - enforcement serveur des permissions de write-back par contrat et par destination
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

Regle pratique:

- `app-api-ts` est le pivot HTTP et la frontiere de mutation/read-model des apps user-facing.
- `app-connectors` est un runtime voisin de control plane integrations, pas un simple module de ce dossier.
- `app-api` reste le data plane Python pour les pipelines batch et ML.

## Dependances fortes

- `DATABASE_URL` pour toute persistance.
- `DecisionConfigService` initialise au demarrage via `src/index.ts`.
- `CAMUNDA_BASE_URL` + auth associee pour le domaine onboarding BPM reel.
- `app-connectors` pour les appels admin integrations, hors de ce dossier.
- un principal Keycloak de provisioning: `KEYCLOAK_ADMIN_CLIENT_ID` + `KEYCLOAK_ADMIN_CLIENT_SECRET` en cible, avec repli transitoire `KEYCLOAK_ADMIN_USERNAME` + `KEYCLOAK_ADMIN_PASSWORD` tant que la migration runtime n'est pas terminee.
- Un realm Keycloak avec `smtpServer.from` configure si les invitations `execute-actions-email` doivent etre operables.
- `RESEND_WEBHOOK_SECRET` si l'on veut prouver la livraison provider-side au lieu de s'arreter au simple `204` Keycloak.

## Quand modifier quoi

- Ajouter une nouvelle lecture SQL produit/admin : `operational-data.ts`, `gold-explorer.ts` ou `admin-monitoring.ts`.
- Ajouter une operation admin transverse : `admin-backoffice.ts`.
- Ajouter une lecture ou mutation onboarding BPM admin : `admin-onboarding.ts`.
- Modifier l'orchestration Camunda onboarding ou le BPMN embarque : `admin-onboarding-camunda.ts`, `admin-onboarding-process.ts`, `admin-onboarding-runtime.ts`, `camunda-rest.ts`.
- Ajouter une lecture ou une initialisation DecisionOps persistante : `decisionops-runtime.ts`.
- Ajouter une mutation d'approbation persistante : `decisionops-runtime-approval.ts`.
- Ajouter une mutation de lifecycle dispatch persistante : `decisionops-runtime-action.ts`.
- Ajouter un garde-fou d'idempotence ou un invariant DB sur `action_dispatches` : `decisionops-runtime.ts` + `migrations/`.
- Ajouter une mutation finance-grade sur le ledger persistant : `decisionops-runtime-ledger.ts`.
- Ajouter une mutation persistante de gouvernance `DecisionContract` : `decision-contract-runtime.ts`.
- Exposer un nouveau calcul admin pur autour du contrat ou du graphe : `decision-contract-templates.ts` ou `decision-compatibility.ts`.
- Modifier le moteur de configuration de decision : `decision-config.ts` + migration SQL si schema touche.
- Modifier les garde-fous DB : `persistence.ts`.
