# PRD - Plateforme d'integration Data API Praedixa

- Statut: `Ready for build`
- Scope: tous les connecteurs CRM, WFM, TMS, POS, DMS
- Derniere mise a jour: `2026-03-04`
- Owner: `Data Platform + Backend API`

## 1. Contexte

Praedixa doit integrer rapidement des systemes clients heterogenes (CRM, TMS, WFM, POS, DMS) pour alimenter prediction d'absences, charge operationnelle, et recommandations.

Le besoin business: passer de "integration projet sur mesure" a "catalogue de connecteurs industrialises".

## 2. Objectifs produit

1. Connecter un nouveau client en moins de 10 jours ouvres apres reception des credentials.
2. Garantir une fraicheur de donnees compatible pilotage operationnel (`<= 30 min` pour temps reel leger, `<= 24h` pour batch).
3. Standardiser mapping et qualite data quel que soit le systeme source.
4. Reduire le risque de rupture via retries, dead letter queue et observabilite.

## 2.1 Promesse "aucune integration SI lourde"

Le modele cible cote client est:

- **0 developpement specifique client** dans 80% des cas (OAuth/API key standard).
- **1 referent metier + 1 referent IT** mobilises 30 a 90 minutes pour les acces.
- **Activation progressive**: commencer avec 3-5 objets metier critiques, puis etendre.
- **Fallback sans projet SI**: depot securise `SFTP CSV` si API fournisseur bloquee.

## 3. Non-objectifs

- Construire un iPaaS generaliste.
- Couvrir 100% des objets metier de chaque editeur en V1.
- Remplacer les outils ETL internes du client.

## 4. Architecture cible

## 4.1 Pipeline commun

1. **Connector Adapter**: client API fournisseur (auth + extraction).
2. **Bronze / Raw Landing**: stockage payload brut versionne.
3. **Silver / Normalization**: mapping vers schema canonique Praedixa.
4. **Silver / Quality Gates**: controles de completude, types, duplicats, coherence.
5. **Gold / Publishing**: mise a disposition pour services `dashboard`, `forecasts`, `decisions`.

### 4.1.1 Alignement architecture medaillon (Praedixa)

- `Bronze`: payloads sources bruts et etat de sync (`integration_raw_events`, watermarks).
- `Silver`: objets canoniques unifies et nettoyes (dedup, timezone, validation).
- `Gold`: vues metier/KPI/features pretes pour `dashboard`, `forecasts`, `decisions`.
- Compatibilite avec le pipeline existant documente dans `docs/medallion-pipeline.md`.

## 4.2 Composants applicatifs proposes

- `app-api/app/integrations/core/`:
  - `auth.py`
  - `retry.py`
  - `pagination.py`
  - `webhooks.py`
  - `idempotency.py`
- `app-api/app/integrations/connectors/<vendor>/`:
  - `client.py`
  - `extractor.py`
  - `mapper.py`
  - `validator.py`
- `app-api/app/services/`:
  - orchestration de sync
  - exposition de statuts integration dans l'admin

## 4.3 Stockage minimal a creer

- `integration_connections`
- `integration_sync_runs`
- `integration_sync_state`
- `integration_raw_events`
- `integration_field_mappings`
- `integration_error_events`
- `integration_dead_letter_queue`

## 5. Modele canonique minimal

## 5.1 Entites transverses

- `organization`
- `site`
- `employee`
- `shift_plan`
- `timesheet`
- `absence_event`
- `customer_account`
- `order_header`
- `order_line`
- `shipment`
- `route_stop`
- `vehicle`
- `telematics_event`
- `service_order`
- `sales_deal`
- `pos_ticket`
- `inventory_snapshot`

## 5.2 Regles de mapping

- Chaque ligne canonique doit garder `source_system`, `source_object`, `source_record_id`.
- Mapping declaratif versionne par connecteur.
- Conversion timezone obligatoire vers UTC + conservation timezone source.
- Deduplication par cle fonctionnelle (`source_record_id` + `updated_at` + `hash_payload`).

## 6. Exigences fonctionnelles (FR)

- `FR-PLAT-01`: creation d'une connexion via admin (credentials + test connexion).
- `FR-PLAT-02`: support `full sync` + `incremental sync` par watermark.
- `FR-PLAT-03`: reprise apres incident sans perte (checkpointing par objet).
- `FR-PLAT-04`: idempotence d'ecriture en raw et canonical.
- `FR-PLAT-05`: reprocessing d'une fenetre temporelle configurable.
- `FR-PLAT-06`: separation stricte multi-tenant par `organization_id`.
- `FR-PLAT-07`: journaliser les erreurs exploitables par support.
- `FR-PLAT-08`: exposer metriques par connecteur dans monitoring admin.

## 7. Exigences non-fonctionnelles (NFR)

- `NFR-SEC-01`: secrets stockes chiffre (pas de secret en clair dans logs).
- `NFR-SEC-02`: chiffrement TLS 1.2+ pour tous les appels externes.
- `NFR-PERF-01`: lot max configurable, pagination robuste.
- `NFR-REL-01`: retries exponentiels (429/5xx), circuit breaker.
- `NFR-REL-02`: SLO sync reussie quotidienne >= 99%.
- `NFR-OBS-01`: traces + logs structures + metriques Prometheus-like.
- `NFR-COMP-01`: respect RGPD, retention parametree par contrat client.

## 8. Securite et conformite

- Least privilege sur scopes API.
- Rotation des credentials (90 jours max par defaut).
- Journal d'acces admin et audit trail sur modifications de connexion.
- Masquage PII dans logs (`email`, `phone`, `license_plate`, `VIN`).
- DPA fournisseur valide pour chaque connecteur traite.

## 9. Observabilite

Metriques minimales par connecteur:

- `sync_run_duration_seconds`
- `sync_records_fetched_total`
- `sync_records_failed_total`
- `sync_lag_minutes`
- `api_rate_limit_hits_total`
- `webhook_events_lag_seconds`

Alertes:

- echec de 3 runs consecutifs
- lag > SLA
- taux d'erreur > 5% sur 15 minutes

## 10. Strategie de livraison

## 10.1 Phases

1. **Phase A - Foundation**: socle core + tables + admin de connexion.
2. **Phase B - P1 Connectors**: Salesforce, UKG, Toast, Olo, CDK, Reynolds, Geotab, Fourth.
3. **Phase C - P2 Connectors**: Oracle TM, SAP TM, Blue Yonder, Manhattan, NCR Aloha.
4. **Phase D - Hardening**: performance, certifications, runbooks support.

## 10.2 Priorisation execution

- Commencer par connecteurs avec API publiques stables (`Salesforce`, `UKG`, `Toast`, `Geotab`).
- Traiter connecteurs `partner-gated` en parallele contractuel (`CDK`, `Reynolds`, `NCR Aloha`).
- Ajouter fallback `SFTP CSV` pour cas blocage API fournisseur.

## 11. Plan de test global

1. Tests unitaires par mapper/extractor.
2. Tests integration avec mocks fournisseurs.
3. Tests resilience (timeouts, 429, payload incomplet, schema drift).
4. Tests securite (secret leak, auth revoke, privilege check).
5. Tests de charge sur volume cible client pilote.

## 12. Definition of Done globale

- Tous FR/NFR du connecteur implantes.
- Documentation operationnelle + runbook incident.
- Dashboard monitoring actif.
- Reprocessing valide en preproduction.
- Au moins un dry-run client termine sans erreur bloquante.

## 13. Dependencies externes

- Contrats API partenaire fournisseur.
- Credentials techniques + sandbox client.
- Validation legale des flux PII.
- Disponibilite d'un referent IT client.

## 14. Parcours onboarding client (low pain)

### J0 - Kickoff (30 min)

- valider le connecteur (`Salesforce`, `UKG`, etc.)
- choisir les objets V1 (3 a 5 objets max)
- confirmer les sites/entites a integrer

### J0/J1 - Branchement acces (30 a 90 min cote client)

- le client cree un compte integration lecture seule
- il autorise l'app Praedixa (OAuth/API key)
- il partage tenant URL + credentials via canal securise

### J1 - Activation technique Praedixa

- creation de la connexion dans admin
- test de connexion + test de permissions
- full sync initiale (backfill)

### J2 - Mise en production

- incremental sync activee
- controles qualite et reconciliation metier
- validation client sur 2-3 KPI de reference

## 15. Modes de branchement pour minimiser l'effort SI client

1. **Mode A - OAuth self-service (recommande)**
   Le client clique "Connect", se loggue, consent, c'est termine.
2. **Mode B - API key/service account**
   Le client cree une cle lecture seule, la colle dans l'admin Praedixa.
3. **Mode C - SFTP managed fallback**
   Si API impossible, export standard (CSV) depose automatiquement; Praedixa ingere sans dev client.

Principe: pas de middleware client, pas d'agent a installer, pas de projet ESB.

## 16. SLA onboarding cible

- Time-to-first-data: `< 48h` apres reception credentials valides.
- Time-to-first-dashboard: `< 5 jours ouvres` sur scope V1.
- Extension objets supplementaires: `< 2 jours ouvres` par lot.
