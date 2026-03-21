J’ai cadré ce PRD comme une plateforme d’intégration multi-tenant, parce que les surfaces d’accès ne sont pas homogènes selon les éditeurs: Deliverect fournit un staging puis un accès production après certification, Combo documente la lecture des contrats/plannings et l’import de CA, Skello documente surtout une Analytics API accessible via Partner Tools, Zelty et L’Addition passent par marketplace/partenariat et API ouverte, Tiller annonce une API ouverte, Oracle Simphony expose des APIs de configuration, de transaction et de notifications, Zenchef couvre réservations/guest/webhooks avec préproduction sur demande, et TheFork réserve l’accès à “all your data via TheFork APIs” à son pack Enterprise tout en documentant les flux POS ↔ réservation.

# PRD

# Praedixa Hospitality Connect

## Plateforme d’intégration end-to-end, production ready, pour POS, WFM, delivery et réservation

**Version**: 1.0
**Statut**: Ready for build
**Owner**: Product / Platform / CEO
**Audience**: Product, Engineering, Data, SRE, Security, Ops, Partnerships
**Segments cibles**: restauration rapide, chaînes, franchises, dark kitchens, restauration traditionnelle multisite
**Connecteurs couverts**: Zelty, Skello, Combo, Deliverect, L’Addition, Tiller, Oracle Simphony, Zenchef, TheFork

---

## 1. Résumé exécutif

Praedixa doit construire une plateforme d’intégration unique, multi-tenant, capable de connecter les principaux systèmes utilisés par les restaurants et chaînes en France et en Europe, puis d’exposer une couche canonique standardisée pour l’analytics, l’optimisation du staffing, la performance commerciale, le pilotage des canaux et les automatisations.

Le problème à résoudre n’est pas seulement “parler à 9 APIs”. Le vrai problème est de rendre ces intégrations fiables, exploitables et industrialisées malgré :

- des modèles d’authentification hétérogènes
- des niveaux de maturité très différents selon les éditeurs
- des schémas de données non standardisés
- des dépendances commerciales ou de certification chez certains vendors
- des contraintes de webhooks, de polling, de sandbox et de préproduction non homogènes
- des enjeux de sécurité, de PII, de réconciliation comptable et de support client

La solution cible est une **platform-as-a-product** avec :

- un **control plane** de gestion des connecteurs, credentials, installations, permissions, health et audit
- un **data plane** d’ingestion brute, de normalisation, de stockage canonique, de replay et de diffusion événementielle
- un **unified API layer** pour les produits Praedixa
- un **ops console** pour le support, la réconciliation et le troubleshooting
- une **stratégie read-first, webhook-first, replayable-by-design**
- un **lotissement par connecteur** mais un **socle transverse commun**

Cette PRD couvre le design complet “production ready” des 9 connecteurs, avec un lotissement réaliste en plusieurs vagues de livraison.

---

## 2. Contexte et problème

### 2.1 Contexte business

Praedixa veut servir des prospects et clients dans :

- la restauration rapide
- les chaînes et franchises
- les restaurants traditionnels multisite
- les dark kitchens
- les acteurs hybrides salle + livraison + click & collect

Pour ces clients, la performance opérationnelle se joue à l’intersection de 4 mondes :

1. **POS / ventes / tickets / menus / canaux**
2. **WFM / planning / temps / contrats / productivité**
3. **delivery / agrégation / order orchestration**
4. **réservation / table management / guest history**

Aujourd’hui, chaque intégration isolée crée un petit monstre de tuyauterie. Demain, Praedixa doit disposer d’un moteur d’intégration commun qui permet d’onboarder vite, d’observer finement, de réconcilier les données, et d’exploiter la donnée de manière homogène.

### 2.2 Problèmes observés

- Les clients ont plusieurs systèmes qui se recouvrent sans langage commun.
- Les identifiants site, menu, employé, table, ordre et canal ne matchent pas naturellement.
- Certaines APIs sont publiques et bien documentées, d’autres sont partner-managed ou partiellement publiées.
- Les modes d’accès diffèrent: clé API, token, OAuth2, URL d’analytics, comptes de staging, certification, webhook registration, API account.
- Les événements ne sont pas toujours rejouables côté vendor.
- Les métiers restaurant ont des règles spécifiques: business day qui dépasse minuit, split tickets, voids, remises, click & collect, livraison, no-shows, seatings, service periods, staffing par quart d’heure.
- Les équipes client veulent une intégration fiable, pas un bricolage héroïque qui casse le vendredi à 19h45.

### 2.3 Problème produit

Construire 9 intégrations “à la main” créerait :

- 9 systèmes de credentials
- 9 logiques de retry
- 9 modèles de mapping
- 9 surfaces d’alerting
- 9 runbooks divergents
- 9 manières de perdre du temps

Le produit à construire est donc **une plateforme d’intégration standardisée**, pas une collection de scripts.

---

## 3. Vision produit

Créer la couche d’intégration de référence pour la restauration et la restauration rapide, permettant à Praedixa de :

- connecter un nouveau client en quelques jours plutôt qu’en plusieurs semaines
- unifier ventes, staffing, réservations et canaux
- fournir des données fraîches, explicables et auditables
- supporter des automatisations métier sans dépendre de pipelines fragiles
- servir à la fois les SMB structurés, les groupes et les franchises

---

## 4. Objectifs

### 4.1 Objectifs business

1. Réduire drastiquement le délai d’onboarding d’un nouveau client.
2. Créer un avantage structurel de distribution face aux outils purement analytics.
3. Rendre Praedixa compatible avec les stacks les plus fréquentes du marché.
4. Permettre des offres mid-market et enterprise avec SLA et support.
5. Poser les fondations pour forecasting, staffing optimization, anomaly detection et BI.

### 4.2 Objectifs produit

1. Supporter les 9 connecteurs dans un cadre commun.
2. Fournir un modèle canonique partagé entre tous les downstream consumers.
3. Garantir replay, auditabilité, observabilité, idempotence et réconciliation.
4. Permettre des modes d’installation adaptés:
   - self-serve quand possible
   - assisted setup quand nécessaire
   - partner-managed quand imposé par le vendor
5. Exposer un Unified API interne et éventuellement externe.

### 4.3 Objectifs techniques

1. Multi-tenant from day 1
2. Webhook-first quand disponible
3. Polling incrémental avec watermark quand webhook absent
4. Stockage brut immuable + couche canonique versionnée
5. Gestion centralisée des credentials
6. DLQ, replay, reconciliation jobs
7. SLOs mesurables

### 4.4 Non-objectifs

- Remplacer un POS, un WFM ou un PMS
- Stocker des données carte bancaire
- Produire une paie
- Construire un OMS complet propriétaire
- Supporter tout l’écosystème CHR dès v1
- Faire du write-back sur un vendor si la capacité n’est pas contractuellement confirmée

---

## 5. Principes directeurs

1. **One platform, many connectors**
   Le socle est plus important que le premier connecteur livré.

2. **Read-first, then write with guardrails**
   On ne push dans un vendor qu’avec une surface documentée, testée, auditée et protégée.

3. **Raw first, canonical second**
   Chaque payload source est archivé avant transformation.

4. **Webhook-first, polling-safe**
   Les webhooks accélèrent. Le polling garantit qu’on ne dépend pas uniquement d’eux.

5. **Idempotent by default**
   Tout traitement doit tolérer doublons, retries et désordre.

6. **Customer-visible health**
   Une intégration invisible est une bombe à retardement.

7. **Partner-gated reality accepted**
   Certains connecteurs demanderont activation, sandbox, certification, ou accord commercial.

8. **Business-day aware**
   Le temps restaurant n’est pas le temps d’un bureau.

---

## 6. Personas

### 6.1 Persona A: COO / Directeur de réseau

Veut unifier la performance de plusieurs établissements et comparer vente, staffing, réservations et canaux.

### 6.2 Persona B: Responsable Ops / SI client

Veut connecter les systèmes existants sans changer toute la stack.

### 6.3 Persona C: Manager terrain

Veut que les chiffres du jour soient justes, que les réservations collent à la salle, et que les alertes aient du sens.

### 6.4 Persona D: Équipe Partnerships / Integration Ops Praedixa

Veut installer, monitorer, corriger, relancer, certifier et supporter les connecteurs.

### 6.5 Persona E: Data / Product Praedixa

Veut un schéma canonique stable, versionné et exploitable pour l’analytics et le ML.

---

## 7. Cas d’usage prioritaires

### 7.1 Fast food / QSR / dark kitchen

- corréler ventes et staffing par quart d’heure
- suivre le mix delivery / click & collect / comptoir
- détecter les dérives de prep time
- comparer performance par site, marque et canal
- brancher Deliverect + POS + WFM

### 7.2 Restaurant traditionnel

- relier réservations et ticket moyen
- suivre no-show, seatings, rotation, dépense par service
- mesurer staffing vs couverts vs CA
- brancher Zenchef ou TheFork + POS + WFM

### 7.3 Chaîne / franchise

- gérer plusieurs sites, plusieurs brands, plusieurs systèmes
- déployer centralement
- réconcilier au niveau groupe et au niveau site
- suivre health de toutes les intégrations dans un cockpit unique

---

## 8. Périmètre fonctionnel

### 8.1 In scope

- gestion des installations connecteurs
- credentials et rotation
- discovery des comptes / brands / locations / revenue centers
- backfill initial
- sync incrémental
- ingestion de webhooks
- normalisation canonique
- reconciliation jobs
- unified API interne
- ops console
- audit log
- alerting
- reporting de santé
- support multi-locations et multi-brands
- write-back uniquement sur connecteurs où le scope est explicitement défini

### 8.2 Out of scope v1

- mapping comptable avancé type ERP fiscal complet
- paie complète
- CRM marketing omnicanal complet
- inventaire profond multi-entrepôts
- terminal payment orchestration
- moteur de réservation propriétaire
- orchestration de livraison propriétaire complète hors flux vendor supportés

---

## 9. Matrice des connecteurs

| Connecteur      | Catégorie                      | Mode v1                            | Direction                        | Valeur principale                              | Niveau de complexité |
| --------------- | ------------------------------ | ---------------------------------- | -------------------------------- | ---------------------------------------------- | -------------------- |
| Zelty           | POS / omnicanal                | Read-first                         | Inbound prioritaire              | ventes, canaux, menus, multisite               | Moyen                |
| Skello          | WFM / analytics                | Read-only                          | Inbound                          | performance staffing, corrélation ventes/temps | Moyen                |
| Combo           | WFM                            | Read + revenue write               | Bidirectionnel ciblé             | contrats, plannings, productivité              | Faible à moyen       |
| Deliverect      | Delivery / order orchestration | Bidirectionnel opérationnel        | Inbound + outbound + webhooks    | commandes, statuts, menus, locations           | Élevé                |
| L’Addition      | POS                            | Read-first                         | Inbound prioritaire              | tickets, reporting, multi-établissements       | Moyen                |
| Tiller          | POS                            | Read-first                         | Inbound prioritaire              | tickets, catalogue, établissements             | Moyen                |
| Oracle Simphony | Enterprise POS                 | Read + write ciblé                 | Bidirectionnel opérationnel      | checks, menus, config, notifications           | Très élevé           |
| Zenchef         | Réservation                    | Bidirectionnel                     | Inbound + outbound + webhooks    | disponibilités, réservations, tables, guests   | Moyen                |
| TheFork         | Réservation / POS bridge       | Partner-managed + read/write ciblé | Inbound + outbound selon contrat | réservations, spend linkage, offers            | Élevé                |

**Règle produit**: le “mode v1” est une décision Praedixa de livraison, pas une affirmation absolue sur tout ce que le vendor saura faire contractuellement.

---

## 10. Success metrics

### 10.1 Business KPIs

- Time-to-first-data par nouveau client
- Nombre de sites connectés par mois
- Taux d’activation client après signature
- Nombre de clients multi-connecteurs
- Taux de renouvellement / expansion sur comptes intégrés

### 10.2 Product KPIs

- % d’installations terminées sans intervention engineering
- % d’intégrations healthy au quotidien
- Latence moyenne de fraîcheur de données
- Taux d’erreurs par connecteur
- Taux de réussite de backfill
- Temps moyen de résolution incident

### 10.3 Data KPIs

- écart de réconciliation CA journalier
- taux d’objets dupliqués
- taux d’objets non mappés
- taux d’événements rejetés
- couverture du schéma canonique

### 10.4 Objectifs cibles

- 99.9% uptime control plane
- 99.95% disponibilité ingestion webhooks critiques
- < 60 sec p95 entre réception webhook et donnée canonique exploitable
- < 15 min p95 pour sync incrémental pull
- < 0.5% d’écart de réconciliation sur CA journalier
- < 1% d’objets “unknown mapping” après onboarding stabilisé
- 0 perte d’événement déjà acquitté côté Praedixa

---

## 11. Exigences fonctionnelles transverses

## 11.1 Tenancy, organisations et hiérarchie

**FR-101** Le système doit être multi-tenant.
**FR-102** Un tenant peut contenir plusieurs organisations.
**FR-103** Une organisation peut contenir plusieurs brands.
**FR-104** Une brand peut contenir plusieurs locations.
**FR-105** Une location peut contenir plusieurs sous-unités opérationnelles:

- revenue centers
- services
- zones
- tables
- équipes
- canaux
- kitchen lines

**FR-106** Chaque installation de connecteur doit être liée au niveau adéquat:

- org
- brand
- location
- revenue center
- restaurant unique

## 11.2 Catalogue des connecteurs

**FR-111** Le système doit exposer un catalogue de connecteurs avec:

- nom
- catégorie
- mode d’installation
- type d’auth
- support sandbox
- support webhooks
- support backfill
- support write-back
- dépendances commerciales
- statut global
- version du connector adapter

**FR-112** Chaque connecteur doit implémenter le même contrat d’exécution:

- validate_credentials()
- discover_resources()
- initial_backfill()
- incremental_sync()
- handle_webhook()
- reconcile()
- revoke()
- healthcheck()

## 11.3 Credentials et secrets

**FR-121** Les credentials doivent être stockés dans un coffre chiffré.
**FR-122** Les secrets ne doivent jamais être journalisés en clair.
**FR-123** Les credentials doivent être versionnés.
**FR-124** Le système doit supporter:

- API key
- bearer token
- OAuth2 client credentials
- webhook secret
- API account / account type vendor-specific
- URL-based connectors quand requis

**FR-125** Le système doit supporter rotation manuelle et rotation programmée.
**FR-126** Le système doit détecter expiration, révocation et permissions insuffisantes.

## 11.4 Installation d’un connecteur

**FR-131** Le système doit proposer un wizard d’installation standard:

1. choix du connector
2. saisie ou import des credentials
3. validation
4. discovery des ressources
5. mapping des sites
6. choix des objets à synchroniser
7. paramétrage business day
8. paramétrage timezone
9. activation du backfill
10. activation sync live

**FR-132** Le système doit distinguer:

- install ready
- awaiting vendor action
- awaiting certification
- sandbox ready
- live ready
- live
- degraded
- revoked

**FR-133** Le système doit supporter des steps manuels pour les vendors partner-managed.

## 11.5 Discovery et mapping

**FR-141** Praedixa doit découvrir automatiquement les ressources sources quand possible.
**FR-142** Le système doit mapper:

- location source -> location canonique
- brand source -> brand canonique
- revenue center -> sub-location canonique
- service / shift / table / channel quand applicable

**FR-143** Le système doit fournir :

- suggestions automatiques
- validation humaine
- override manuel
- versioning de mapping

**FR-144** Tout objet canonique doit conserver:

- source_connector
- source_account_id
- source_location_id
- source_object_id
- source_updated_at
- ingestion_timestamp
- raw_payload_ref
- canonical_version

## 11.6 Backfill initial

**FR-151** Le système doit exécuter un backfill initial asynchrone.
**FR-152** Backfill par défaut:

- POS/orders/reservations: 90 jours
- staffing/planning/contracts: 180 jours
- configurable par client et par connecteur

**FR-153** Le backfill doit être chunké, resumable et rejouable.
**FR-154** Le backfill ne doit pas bloquer la mise en live du sync incrémental.

## 11.7 Sync incrémental

**FR-161** Chaque connecteur doit définir sa stratégie incrémentale:

- webhook-first
- updated_since watermark
- cursor pagination
- polling window overlap
- daily reconciliation sweep

**FR-162** Le système doit tolérer:

- horloges non synchronisées
- updated_at non monotone
- pages dupliquées
- pages manquantes
- objets supprimés ou annulés

**FR-163** Chaque sync doit produire:

- compte rendu
- volume lu
- volume créé
- volume mis à jour
- volume ignoré
- volume en erreur
- watermark final

## 11.8 Webhooks

**FR-171** Le système doit fournir un endpoint webhook par connecteur et un endpoint generic gateway.
**FR-172** Chaque webhook doit être:

- authentifié
- vérifié
- persisté brut
- acquitté rapidement
- poussé en queue pour traitement async

**FR-173** Le système doit implémenter:

- signature/HMAC validation quand disponible
- replay protection
- déduplication
- idempotence
- TTL de messages
- dead-letter queue

**FR-174** Les webhooks ne doivent jamais faire de transformation lourde synchrone.

## 11.9 Normalisation et modèle canonique

**FR-181** Toutes les données doivent être transformées dans un schéma canonique stable.
**FR-182** Les règles de normalisation doivent être versionnées.
**FR-183** Toute transformation doit pouvoir être rejouée depuis la payload brute.
**FR-184** Le système doit conserver la traçabilité source -> canonique -> métrique.

## 11.10 Réconciliation

**FR-191** Le système doit exécuter des jobs de réconciliation périodiques.
**FR-192** Les réconciliations minimales:

- total tickets / orders par jour et site
- CA brut, net, taxes, remises, remboursements
- nombre de réservations et statuts
- nombre d’heures planifiées / travaillées
- nombre de menus / items ou version de catalogue quand utile

**FR-193** Toute anomalie doit créer:

- severity
- contexte
- suggestion
- owner
- statut de résolution

## 11.11 Ops console

**FR-201** Le système doit proposer une console opérateur avec:

- health des connecteurs
- backlog des sync jobs
- erreurs
- retry / replay
- état des webhooks
- état des credentials
- statut certification vendor
- mapping status
- anomalies de réconciliation
- audit log

## 11.12 Unified API Praedixa

**FR-211** Le système doit exposer des endpoints internes unifiés pour:

- organisations
- brands
- locations
- employees
- contracts
- shifts
- time entries
- orders
- order lines
- payments
- menus
- menu items
- reservations
- guests
- tables
- channels
- metrics

**FR-212** Ces endpoints doivent être stables même si les vendors changent.

## 11.13 Auditabilité

**FR-221** Toute action humaine ou système doit être auditée.
**FR-222** Tout changement de mapping, credential, connecteur, scope ou write-back doit être tracé.
**FR-223** Il doit être possible d’expliquer l’origine d’un KPI affiché à un client.

---

## 12. Modèle canonique

## 12.1 Entités de base

| Entité           | Clé canonique    | Champs clés                                                | Remarques                           |
| ---------------- | ---------------- | ---------------------------------------------------------- | ----------------------------------- |
| Organization     | org_id           | name, legal_entity, timezone_default                       | niveau client                       |
| Brand            | brand_id         | org_id, name                                               | utile pour groupes et franchises    |
| Location         | location_id      | brand_id, name, address, timezone, business_day_cutoff     | niveau site                         |
| SubLocation      | sub_location_id  | location_id, type, external_ref                            | revenue center, zone, service       |
| Channel          | channel_id       | type, name, marketplace, fulfillment_mode                  | delivery, click & collect, comptoir |
| Employee         | employee_id      | names, role, external identifiers                          | PII minimisée                       |
| Contract         | contract_id      | employee_id, start/end, contract_type, weekly_hours        | WFM                                 |
| Shift            | shift_id         | employee_id, location_id, planned_start/end, tags          | planning                            |
| TimeEntry        | time_entry_id    | employee_id, actual_start/end, breaks                      | pointage                            |
| Order            | order_id         | location_id, channel_id, source_status, timestamps, totals | ticket / order                      |
| OrderLine        | order_line_id    | order_id, menu_item_id, qty, price, modifiers              | granularité article                 |
| Payment          | payment_id       | order_id, method, status, amount                           | paiements / rembours                |
| Menu             | menu_id          | location_id, version, active_dates                         | menu / carte                        |
| MenuItem         | menu_item_id     | menu_id, sku/plu, name, category, price                    | article                             |
| Reservation      | reservation_id   | location_id, guest_id, service_time, party_size, status    | salle                               |
| Guest            | guest_id         | external ids, name, contact, preferences                   | forte sensibilité                   |
| Table            | table_id         | location_id, room, name, capacity                          | salle                               |
| WebhookEvent     | webhook_event_id | connector, delivery_id, received_at, verified              | brut                                |
| SyncJob          | sync_job_id      | connector_installation_id, type, status, cursor            | orchestration                       |
| MappingRecord    | mapping_id       | source_ref, canonical_ref, confidence, status              | rapprochement                       |
| DataQualityIssue | dq_issue_id      | severity, object_type, object_ref, reason                  | ops                                 |

## 12.2 Champs transverses obligatoires

Chaque objet canonique doit porter:

- `tenant_id`
- `connector_installation_id`
- `source_connector`
- `source_account_id`
- `source_location_id` si applicable
- `source_object_id`
- `source_updated_at`
- `ingested_at`
- `canonical_updated_at`
- `raw_payload_ref`
- `is_deleted` ou `status_final`
- `schema_version`

## 12.3 Enums canoniques

### Order status canonique

- CREATED
- ACCEPTED
- PREPARING
- READY
- ON_THE_WAY
- PICKED_UP
- COMPLETED
- CANCELLED
- FAILED
- REFUNDED
- PARTIALLY_REFUNDED

### Reservation status canonique

- REQUESTED
- CONFIRMED
- WAITLIST
- ARRIVED
- SEATED
- FINISHED
- CANCELLED
- NO_SHOW

### Shift status canonique

- DRAFT
- PUBLISHED
- STARTED
- ENDED
- CANCELLED
- ABSENT
- NO_SHOW_EMPLOYEE

## 12.4 Règles métier canoniques

1. **Business day**: configurable par location, par défaut coupure à 04:00 locale.
2. **Timezone**: stocker UTC + timezone source + timezone canonique.
3. **Taxes**: stocker brut, net, tax_amount, tax_mode si connu.
4. **Remises**: distinguer discount item-level, order-level, comp, promo marketplace, special offer, Yums.
5. **Annulations**: annulation métier distincte d’une suppression technique.
6. **Remboursements**: order-level et payment-level séparés.
7. **Split tickets**: parent-child relation si supporté.
8. **Tables**: lier réservation et check quand le matching est suffisamment confiant.
9. **Employee identity**: matching fort par identifiant stable, sinon matching faible ou pas de matching.
10. **Catalogue**: versionner les menus et ne pas écraser silencieusement les prix historiques.

---

## 13. Architecture cible

## 13.1 Vue logique

```text
Vendor APIs / Webhooks
        |
        v
[Webhook Gateway]   [Pull Workers / Schedulers]
        |                    |
        +---------+----------+
                  v
         [Raw Payload Store]
                  |
                  v
        [Normalization Engine]
                  |
                  +--> [Canonical OLTP Store]
                  +--> [Event Bus]
                  +--> [Warehouse / Lakehouse]
                  |
                  v
       [Unified API] [Ops Console] [Alerting] [Downstream ML/BI]
13.2 Composants
A. Control Plane
Responsable de:
catalogue connecteurs
installations
credentials
scopes
mapping
health
audit
statut certification / activation
B. Webhook Gateway
Responsable de:
réception
auth / signature validation
persist raw
ack rapide
publication asynchrone en queue
C. Pull Scheduler
Responsable de:
planification polling
window overlap
watermarks
job chunking
backfills
D. Connector Workers
Responsable de:
appels vendor
pagination
parsing
vendor-specific retries
rate-limit handling
write-back si applicable
E. Raw Payload Store
Responsable de:
stockage immuable des payloads
indexation par vendor / installation / object / date
replay source of truth
F. Normalization Engine
Responsable de:
mapping vendor -> canonique
transformations
versioning
validation schéma
quarantines
G. Canonical Store
Responsable de:
lecture transactionnelle
APIs internes
jointures opérationnelles
last known state
H. Warehouse / Lakehouse
Responsable de:
analytics
historisation
métriques
data science
backtests
I. Reconciliation Engine
Responsable de:
jobs de vérification
comparaison agrégats source vs canonique
data quality issues
auto-heal si possible
J. Ops Console
Responsable de:
visibilité
debugging
replay
retry
suspension / resume
état client
13.3 Choix d’architecture imposés
raw payload store obligatoire
queue/event bus obligatoire
canonical store séparé du raw
pas de logique vendor dans le front
pas de write-back synchrones depuis le front opérateur
support d’egress IP statiques pour vendors qui en ont besoin
support du TLS moderne et de ports/URLs conformes pour webhooks vendor
14. API interne Praedixa
14.1 Endpoints de control plane
POST /v1/integrations/installations
GET /v1/integrations/installations
GET /v1/integrations/installations/{id}
POST /v1/integrations/installations/{id}/validate
POST /v1/integrations/installations/{id}/discover
POST /v1/integrations/installations/{id}/backfill
POST /v1/integrations/installations/{id}/pause
POST /v1/integrations/installations/{id}/resume
POST /v1/integrations/installations/{id}/revoke
GET /v1/integrations/installations/{id}/health
GET /v1/integrations/installations/{id}/audit
14.2 Endpoints webhook
POST /v1/webhooks/deliverect
POST /v1/webhooks/zenchef
POST /v1/webhooks/simphony
POST /v1/webhooks/thefork si contrat direct
POST /v1/webhooks/generic/{connector}
14.3 Endpoints de lecture canoniques
GET /v1/organizations
GET /v1/locations
GET /v1/orders
GET /v1/order-lines
GET /v1/payments
GET /v1/menus
GET /v1/menu-items
GET /v1/employees
GET /v1/contracts
GET /v1/shifts
GET /v1/time-entries
GET /v1/reservations
GET /v1/guests
GET /v1/tables
GET /v1/channels
GET /v1/metrics
14.4 Endpoints de write-back internes
POST /v1/actions/combo/revenue-sync
POST /v1/actions/zenchef/reservation
POST /v1/actions/deliverect/order-status
POST /v1/actions/simphony/check
POST /v1/actions/simphony/config
POST /v1/actions/thefork/partner-sync selon contrat
14.5 Contrat d’événement canonique
Chaque événement doit inclure:
event_id
event_type
tenant_id
connector_installation_id
object_type
object_id
source_connector
source_timestamp
ingested_at
schema_version
trace_id
raw_payload_ref
15. Exigences détaillées par connecteur
15.1 Zelty Connector
Objectif
Capturer les ventes, commandes, canaux et catalogues d’un POS/OMS fortement utilisé en multisite, fast food, dark kitchen et click & collect.
Mode v1
Read-first, partner-managed onboarding, priorité à la donnée opérationnelle et analytique.
Cas d’usage
CA par site / jour / quart d’heure
mix comptoir / livraison / click & collect
analyse menu / article / catégorie
comparaison multi-sites
corrélation avec staffing et réservations
Données cibles v1
locations
brands ou groupes si exposés
menus / cartes / catégories / items / prix
orders / tickets / order lines
paiements agrégés
canaux de vente
statuts commandes
horaires d’ouverture si disponibles
métriques de performance si disponibles
Install flow
Activation du partenaire côté Zelty marketplace
récupération de credential / clé API
validation d’accès
discovery des sites
mapping vers locations Praedixa
backfill
live sync
Sync strategy
polling incrémental principal
webhook optionnel si disponible dans la doc signée
overlap window obligatoire pour éviter les trous de sync
réconciliation journalière sur CA et nombre de tickets
Règles spécifiques
gérer multisite nativement
distinguer canaux internes et marketplaces
gérer business day tardif
stocker la source de canal pour le delivery
historiser les versions de carte
Non objectifs v1
write-back menu
write-back store status
write-back promos
sauf si les capacités sont validées en phase d’intégration partenaire
Critères d’acceptation
au moins 1 site découvert et mappé
backfill 90 jours terminé
delta sync stable
reconciliation gap journalier < 0.5%
aucune duplication d’order sur retries
15.2 Skello Connector
Objectif
Consommer les données de pilotage et de staffing pour calculer productivité, couverture d’effectif et corrélations ventes / temps de travail.
Mode v1
Read-only analytics connector.
Cas d’usage
vente par heure travaillée
couverture planning vs réel
staffing cost proxy
comparaison site à site
pilotage par jour/service
Données cibles v1
organisation
établissements
jeux de données analytics exposés
indicateurs de performance
éventuellement exports calendrier / planning si exposés
méta de connexion avec outils partenaires si utile au debugging
Install flow
activation côté Partner Tools / Analytics API
récupération du lien / scope / credential nécessaire
validation
discovery établissements
mapping
backfill
live refresh
Sync strategy
polling incrémental
refresh planifié
snapshot journalier si l’API est plus analytique que transactionnelle
Règles spécifiques
ne pas supposer l’existence d’un write-back RH
prioriser les métriques site/service/jour
corréler avec POS par location et business day
gérer connecteurs croisés si client a Skello + Zelty ou Skello + L’Addition
Critères d’acceptation
extraction sans erreur des établissements
métriques staffing visibles côté Praedixa
jointure location-level stable avec POS
rafraîchissement sans duplication
15.3 Combo Connector
Objectif
Récupérer les contrats et plannings, puis pousser les données de revenus nécessaires au calcul de productivité.
Mode v1
Bidirectionnel ciblé.
Cas d’usage
staffing par contrat / équipe / site
planning publié
performance quotidienne salarié/site
revenu réel ou prévisionnel injecté dans Combo
Données cibles v1
Inbound:
établissements
partner identifiers
contrats
plannings
équipes
positions
absences / rests si confirmés dans la doc signée
Outbound:
CA HT réel
CA HT prévisionnel
Install flow
vérifier souscription adaptée
obtenir token API
récupérer partner identifier par établissement si nécessaire
valider l’accès
importer structure d’établissements
backfill contrats + plannings
activer revenue sync
Sync strategy
contrats: sync journalier + change detection
plannings: sync incrémental 15 min
revenus: push horaire ou near-real-time configurable
Règles spécifiques
le revenue write-back doit être idempotent
conserver une piste d’audit des valeurs poussées
ne jamais écraser une donnée manuelle client sans règle explicite
prévoir mode dry-run avant push live
Critères d’acceptation
contrats et plannings remontent sans perte
revenue write-back confirmé
productivité journalalière cohérente entre Praedixa et Combo
logs de push exhaustifs
15.4 Deliverect Connector
Objectif
Intégrer l’agrégation de commandes, les statuts opérationnels, les menus, les locations et les flux de dispatch / order lifecycle.
Mode v1
Bidirectionnel opérationnel, webhook-first, certification-ready.
Cas d’usage
centraliser les commandes multicanal
suivre accepted / preparing / ready / finalized
gérer register location
synchroniser menu / opening hours / item availability
alimenter SLA prep et fulfillment
éventuellement dispatch integration
Données cibles v1
Inbound:
accounts
brands
locations
channel links
stores
menus
opening hours
out-of-stock
order status updates
courier / guest status updates
busy mode / menu changes selon scope
Outbound:
register POS response
order create / cancel / status
store status update
item availability updates
delivery updates si dispatch mode
checkout / partner webhook responses selon rôle
Install flow
onboarding partenaire
récupération Client ID / Client Secret staging
configuration standardized URLs
test customer account
register location test
certification
passage en production avec nouveaux credentials
Sync strategy
webhook-first pour statuts
API fetch pour stores, menus, links, hours, OOS
replay interne obligatoire
réconciliation quotidienne des commandes et statuts finaux
Sécurité
vérification HMAC des webhooks
conservation des headers nécessaires à la validation
rotate secrets sans downtime
isolate staging and production credentials
Règles spécifiques
standardiser les URLs de partner webhooks
différencier Deliverect locationId et external location ID POS
ne pas parser le payload avant validation HMAC
gérer store status et OOS comme entités de configuration quasi temps réel
Critères d’acceptation
register webhook fonctionne
order status arrive en < 60 sec p95
HMAC validé correctement
certification vendor passée
zero loss sur événements déjà reçus
réconciliation orders finalisés < 0.5% d’écart
15.5 L’Addition Connector
Objectif
Connecter un POS très présent en France dans les chaînes, franchises et restaurants traditionnels, avec besoin de reporting consolidé.
Mode v1
Read-first, assisted setup.
Cas d’usage
consolidation groupe / site
récupération tickets, ventes, remises, paiements
suivi multi-établissements
jointure avec réservations et staffing
Données cibles v1
comptes / compte master si exposé
établissements
ventes / tickets / lignes / remises / paiements
cartes / menus / tarifications si disponibles dans la surface contractuelle
métriques live / reporting si disponibles
Install flow
récupération clé API
validation
discovery des établissements
mapping
backfill
sync live
Sync strategy
polling incrémental
reconciliation journalière
snapshots de reporting si nécessaire
Règles spécifiques
gérer sites multiples
historiser les tarifs si accessibles
supporter une couche de mapping manuelle renforcée
write-back explicitement out of scope v1 sauf contrat dédié
Critères d’acceptation
lecture multi-établissements stable
réconciliation CA journalière
tickets exploitables dans le schéma canonique
support d’un compte groupe
15.6 Tiller Connector
Objectif
Supporter un POS iPad européen avec écosystème d’apps et API ouverte.
Mode v1
Read-first avec extension future vers write-back si besoin commercial.
Cas d’usage
ventes et tickets
menus et catalogue
établissements et analyse multi-sites
jointure avec réservation ou staffing
Données cibles v1
établissements
catalogue / items / catégories
orders / tickets / lignes
paiements / remises
employés / utilisateurs si exposés
statuts opérationnels si exposés
Install flow
création / activation intégration Appmarket
récupération credentials
validation
discovery
backfill
live sync
Sync strategy
polling incrémental
overlap window
réconciliation journalière
Règles spécifiques
read-first v1
write-back conditionné à surfaces signées
journaliser version du connecteur et scopes exacts
Critères d’acceptation
données ventes + catalogue cohérentes
mapping établissements stable
absence de duplication au backfill
health checks exposés
15.7 Oracle Simphony Connector
Objectif
Supporter les grands comptes, chaînes et environnements enterprise avec configuration complexe, plusieurs organisations, locations et revenue centers.
Mode v1
Bidirectionnel ciblé, enterprise-grade.
Cas d’usage
lecture organisations / locations / revenue centers
récupération menus et configuration
lecture et éventuellement création/gestion de checks
réception de notifications sur checks/config/employees
support des environnements multi-rvc
pont possible vers analytics/staffing via autres briques
Données cibles v1
Inbound:
organizations
locations
revenue centers
menus summary + menus détaillés
taxes / discounts / service charges / tenders
checks
printed checks si utile
employee references
configuration content utile
notifications check/config/employees
Outbound ciblé:
create check
update check / round / totals
update configuration sur zones explicitement validées
Install flow
création des API accounts requis
récupération orgShortName / locRef / rvcRef
validation permissions
registration notifications/webhook
discovery org/locations/rvc
config fetch
backfill checks
live mode
Sync strategy
discovery quotidien des org/location/rvc
webhook-first pour notifications
polling safety net sur checks et config
health check connection status
re-fetch ciblé des resources après notification
Sécurité
endpoint TLS 1.2, port 443
traitement asynchrone
ack rapide
comme certains events n’ont pas de retry vendor, persistance immédiate impérative
Règles spécifiques
forte complexité de hiérarchie
certains appels peuvent avoir une latence supérieure
gestion stricte du contexte org/location/rvc
distinction CCAPI configuration vs STS Gen2 transaction/configuration
write-back limité aux opérations validées contractuellement
Critères d’acceptation
org/location/rvc correctement découverts
menu fetch fonctionnel
checks ingérés et normalisés
notifications reçues, persistées, traitées
aucune perte après ack
compatibilité multi-rvc démontrée
runbook enterprise complet
15.8 Zenchef Connector
Objectif
Connecter la réservation, les disponibilités, la salle, les guests et le contexte de service.
Mode v1
Bidirectionnel complet côté réservation.
Cas d’usage
visibilité disponibilité
création / modification / annulation de réservations
gestion des statuts salle
guest history
table management light
corrélation réservation -> dépense POS
no-show analytics
Données cibles v1
Inbound:
restaurant metadata
opening hours / availability
reservations
services
rooms / tables
guests
sold experiences / gift vouchers / takeaway overview si utile
reviews
webhooks réservation
Outbound:
create reservation
modify reservation
cancel reservation / status update
guest create/update si utile
Install flow
vérifier prérequis de souscription / accord
demander doc détaillée + restaurant de démo préprod
récupérer credentials
configurer webhook URL
discovery restaurant/services/tables
backfill
live
Sync strategy
webhook-first pour création/update réservation
initial backfill large
ensuite delta sync sur updated resources
polling de sécurité périodique
Règles spécifiques
une seule webhook URL par restaurant
pagination large et sync delta après onboarding
gestion explicite des statuses
prudence forte sur PII guests
mapping tables / services / rooms
Critères d’acceptation
disponibilité lisible
réservation créée et modifiée correctement
webhooks reçus sans duplication
join reservation -> location -> service cohérent
no-show analytics possible
préprod validée avant prod
15.9 TheFork Connector
Objectif
Connecter les réservations, les statuts d’arrivée et la dépense POS pour enrichir le parcours client et les analyses de table spend.
Mode v1
Partner-managed, scope variable selon contrat, cible bidirectionnelle.
Cas d’usage
synchroniser réservations avec POS
ouvrir une table au moment ARRIVED / SEATED
relier ticket dépensé à la réservation
propager offres, remises et mécanismes type Yums
enrichir historique client
Données cibles v1
Inbound:
réservation
statuts de réservation / seating
guest / booking context
spend linkage / receipt linkage selon surface accordée
offers / discounts / loyalty context
Outbound:
POS table open/seat sync
status updates nécessaires au workflow partenaire
retour de dépense / ticket lié à réservation
Install flow
vérification package / accès API / partenariat
définition du mode:
direct API si disponible contractuellement
bridge partner-managed sinon
mapping POS supporté
backfill des réservations si accessible
live sync
Sync strategy
event-first sur lifecycle réservation
ticket/spend return async
join fort par reservation reference si disponible
fallback par table + horaire + party size + fenêtre d’arrivée
Règles spécifiques
la valeur clé du connecteur est le pont réservation <-> POS <-> spend
si API directe partielle, prévoir un adapter “managed bridge”
journaliser la confiance du matching dépense/réservation
Critères d’acceptation
transition ARRIVED/SEATED correctement exploitée
ticket lié à réservation dans Praedixa
offers/discounts visibles dans le contexte client
support au moins d’un POS prioritaire
runbook partenaire complet
16. Matching et rapprochement inter-sources
16.1 Matching des locations
Ordre de priorité:
external_ref stable
mapping manuel existant
adresse exacte
nom + ville
heuristique assistée
16.2 Matching des tables
Ordre de priorité:
table external ID
nom de table exact
room + nom
mapping manuel
16.3 Matching des employés
Ordre de priorité:
identifiant employé source stable
social / payroll identifier si autorisé et justifié
email pro
nom + site + rôle avec confiance faible
16.4 Matching réservation -> ticket
Ordre de priorité:
reservation_id propagé au POS
table + arrival/seated time + party size
table + window + montant + covers
matching probabiliste avec confidence score
16.5 Policy
un matching faible ne doit jamais être présenté comme certain
toute liaison probabiliste doit exposer un score
possibilité de validation humaine
versioning de chaque décision de mapping
17. Règles de données et métriques
17.1 Métriques canoniques minimum
sales_gross
sales_net
taxes
discounts
refunds
covers
orders_count
avg_ticket
labor_hours_planned
labor_hours_actual
revenue_per_labor_hour
labor_cost_ratio proxy ou réel si disponible
reservations_count
seated_count
no_show_count
reservation_show_rate
channel_mix
prep_time
completion_time
occupancy_rate si calculable
17.2 Fenêtres analytiques
par quart d’heure
par heure
par service
par business day
par semaine
par mois
par site / brand / groupe
17.3 Règles d’agrégation
ne jamais sommer des snapshots sans delta rules
distinguer event time et processing time
stocker la granularité d’origine
calculer les rollups dans une couche dédiée
18. Sécurité, privacy, compliance
18.1 Exigences sécurité
chiffrement au repos et en transit
KMS / vault pour secrets
RBAC strict
séparation staging / prod
séparation tenant logique stricte
IP allowlisting si requis
journaux redacts
rotation secrets
revue sécurité avant tout write-back
SAST, DAST, dependency scan, secrets scan
18.2 Exigences privacy
minimisation PII
classification des données
pseudonymisation des guests quand l’usage analytique le permet
support des demandes de suppression / export
traçabilité des accès à la PII
conservation configurable selon contrat et DPA
18.3 Exigences compliance
aucun stockage de PAN/CVV
preuve d’audit des modifications
journal des write-backs
contractualisation des sub-processors
documentation des flux transfrontaliers si applicables
19. Fiabilité, SRE et observabilité
19.1 SLOs
control plane availability: 99.9%
webhook ingestion critical path: 99.95%
p95 webhook-to-canonical: < 60 sec
p95 polling freshness: < 15 min
p99 sync job completion under expected window
failed jobs unresolved after 1h: < 0.1%
19.2 Error handling
retries exponentiels avec jitter
vendor-aware retry classification
DLQ par connecteur
quarantine pour payloads invalides
replay manuel et programmatique
19.3 Metrics techniques
success rate API calls
rate-limit hits
auth failures
webhook verification failures
queue lag
job runtime
records processed/sec
replay volume
reconciliation discrepancy count
19.4 Metrics métier
CA diff source vs canonique
reservations diff
shifts diff
duplicate object rate
unmapped locations
unmatched reservations-to-spend
19.5 Alerting
secret expiré
401 / 403 récurrents
webhook silence anormal
queue lag élevé
reconciliation gap élevé
connector degraded
certification environment misconfigured
19.6 Runbooks obligatoires
Un runbook par connecteur doit couvrir:
prérequis
auth
installation
tests
erreurs fréquentes
replay
rollback
vendor escalation path
health checks
customer communication template
20. QA, tests et certification
20.1 Types de tests
Unit tests
Integration tests
Contract tests
Schema tests
Sandbox / preprod tests
Replay tests sur payloads réels anonymisés
Load tests
Chaos tests
Reconciliation tests
UAT client
Certification vendor si applicable
20.2 Test harness
Le framework de test doit fournir:
fixtures versionnées par vendor
générateur de données synthétiques restaurant
simulation business day
simulation duplicates / out-of-order events
simulation expired credentials
simulation webhook retries / no retry / malformed signatures
snapshot testing du schéma canonique
20.3 Données synthétiques minimales
3 brands
12 locations
4 revenue centers per enterprise site
200 employés
500 contrats
5 000 shifts
100 000 orders
20 000 reservations
4 canaux de vente
4 états métier par commande
remises, remboursements, split, no-show
20.4 Certification gates
Un connecteur ne passe pas “GA” si :
pas de runbook
pas de reconciliation
pas d’alerting
pas de replay
pas d’environnement de test validé
pas de health checks
pas de support docs internes
pas de security review
21. Plan de livraison
21.1 Vague 0: Socle plateforme
Durée cible: 3 à 4 semaines
Contenu:
control plane
vault / credentials
connector SDK
raw payload store
canonical core schema
webhook gateway
scheduler
ops console v1
unified API skeleton
observability baseline
21.2 Vague 1: Quick win business
Connecteurs:
Combo
Zenchef
Deliverect
Pourquoi:
couvrent staffing, réservation et delivery
surfaces relativement cadrées
forte valeur démontrable sur QSR et restaurant classique
21.3 Vague 2: France core POS
Connecteurs:
Zelty
L’Addition
Skello
Pourquoi:
forte pertinence marché France
connecteurs clés pour prospection restauration / multisite
Skello complète le triangle ventes / staffing / performance
21.4 Vague 3: Ecosystème POS additionnel
Connecteurs:
Tiller
TheFork
Pourquoi:
élargit la couverture et la compatibilité
TheFork renforce réservation <-> POS <-> spend
21.5 Vague 4: Enterprise
Connecteur:
Oracle Simphony
Pourquoi:
forte complexité
forte valeur sur grands groupes
nécessité probable de setup enterprise et certification plus lourde
22. Staffing recommandé
Équipe minimale
1 Product Lead
1 Engineering Manager / Tech Lead
3 Integration Engineers backend
1 Platform Engineer
1 Data Engineer
1 QA automation engineer
0.5 SRE
0.5 Security/Compliance support
1 Partnerships / Integration Ops
Répartition
Squad Platform: socle, control plane, webhook gateway, observability
Squad Connectors: adapters vendor
Squad Data/QA: canonical model, warehouse, tests, reconciliation
23. Risques et mitigations
Risque	Impact	Probabilité	Mitigation
Accès vendor retardé	élevé	élevé	statut partner-managed, plan de contingence par vague
Docs publiques incomplètes	élevé	élevé	read-first, discovery phase, contract tests basés sur sandbox
Certification vendor longue	élevé	moyen	démarrer tôt Deliverect / Simphony / TheFork
Rate limits ou quotas	moyen	élevé	scheduler adaptatif, backoff, priorisation
Webhooks sans retry	élevé	moyen	persistance immédiate + ack rapide + polling safety net
IDs non stables	élevé	élevé	mapping store + heuristiques + validation humaine
Join réservation-spend ambigu	moyen	élevé	confidence score + matching rules + fallback manuel
PII guests	élevé	moyen	minimisation, masking, ACL strictes
Multi-site hétérogène	élevé	élevé	hiérarchie canonique robuste
Breaking changes vendor	élevé	moyen	versioning adapters + smoke tests quotidiens
Dette par connecteur	élevé	élevé	SDK commun + DoD uniforme
24. Critères d’acceptation globaux
Un lancement “production ready” n’est validé que si:
Plateforme
installation, pause, reprise, revoke fonctionnent
health visible par tenant / connector / location
raw payload archive actif
replay opérationnel
audit log complet
RBAC en place
SLO dashboards en place
alerting en place
Donnée
schéma canonique stable
mapping locations validé
reconciliation jobs actifs
écarts sous seuil
pas de duplications massives
traçabilité source -> canonique démontrée
Support
runbooks complets
ownership clair
playbooks incident
pages status internes
documentation d’onboarding client
Sécurité
security review passée
secret storage validé
masking logs validé
environnements séparés
tests d’accès réalisés
25. Definition of Done par connecteur
Un connecteur est “Done” quand:
installation possible sans code manuel
credentials validés
discovery fonctionne
au moins 1 client test onboardé
backfill terminé
sync incrémental stable
webhooks gérés si disponibles
reconciliation en place
runbook écrit
dashboards / alertes actifs
QA automatisée en CI
security checklist validée
support ops formé
release notes écrites
26. Open questions à trancher avant build complet
Quelle stack cloud cible de référence pour la première version production ?
Veut-on exposer un Unified API externe au client ou uniquement interne à Praedixa au départ ?
Quel niveau de rétention brute par client et par domaine PII ?
Sur Zelty / L’Addition / Tiller / TheFork, quelles surfaces write-back sont contractuellement souhaitées à court terme ?
Veut-on supporter un matching employé cross-system fort ou rester location-level au départ ?
Quelle profondeur de backfill vend-on par défaut dans l’offre commerciale ?
Faut-il rendre les health dashboards visibles côté client dès la v1 ou seulement côté ops ?
27. Décisions produit proposées
Construire la plateforme avant de multiplier les connecteurs.
Prioriser Combo + Zenchef + Deliverect pour la première démonstration forte.
Traiter Zelty, L’Addition, Tiller et TheFork comme connecteurs à surface variable tant que la doc signée n’est pas récupérée.
Traiter Skello comme connecteur analytics en v1.
Traiter Simphony comme un projet enterprise au sein de la plateforme, pas comme un simple connecteur POS.
Imposer replay, reconciliation et ops console comme conditions non négociables du “production ready”.
Interdire tout write-back sans trace d’audit et protection idempotente.
28. Conclusion
Le livrable à construire n’est pas un “hub d’APIs”.
C’est une infrastructure produit de vérité opérationnelle pour la restauration.
Si Praedixa exécute ce plan correctement, l’entreprise obtient:
un avantage de compatibilité marché immédiat
un onboarding plus rapide
une base de données canonique réutilisable
des connecteurs maintenables
une crédibilité enterprise
une fondation pour tout le reste: forecasting, optimisation staffing, alerting, BI, copilots ops
En d’autres termes: moins de câbles volants, plus de colonne vertébrale.
```
