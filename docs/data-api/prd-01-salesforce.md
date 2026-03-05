# PRD Connecteur - Salesforce

- Statut: `Ready for build`
- Priorite: `P1`
- Verticales ciblees: logistique, transport, concessionnaire, franchise
- Dependance: Salesforce Connected App + API enabled user

## 1. Objectif

Connecter Salesforce pour recuperer pipeline commercial, activites et comptes clients afin d'alimenter:

- la prevision de charge commerciale par site/region
- la priorisation des actions terrain
- les indicateurs de conversion et de qualite de service

## 2. Donnees cibles et mapping canonique

| Domaine | Objets Salesforce | Champs minimum | Frequence | Canonical |
| --- | --- | --- | --- | --- |
| CRM B2B | `Account`, `Contact` | `Id`, `Name`, `Industry`, `Billing*`, `OwnerId` | 30 min | `customer_account`, `site` |
| Funnel | `Lead`, `Opportunity` | `Status`, `StageName`, `Amount`, `CloseDate`, `LastModifiedDate` | 15 min | `sales_deal` |
| Activites | `Task`, `Event` | `WhoId`, `WhatId`, `Status`, `ActivityDate` | 15 min | `activity_event` |
| Support | `Case` (optionnel V1.1) | `Priority`, `Status`, `Origin` | 60 min | `service_case` |

## 3. Specification d'integration

### 3.1 Checklist de branchement client

- [ ] `client_id` / `client_secret` de la Connected App
- [ ] utilisateur integration dedie avec profil lecture
- [ ] URL `login` ou `test` selon environnement
- [ ] scopes OAuth valides (`api`, `refresh_token`)

### 3.2 Authentification

- OAuth 2.0 Authorization Code (si consentement admin) ou JWT Bearer Flow (service-to-service)
- Token refresh gere automatiquement
- Rotation secrete cote Praedixa sans downtime

### 3.3 Extraction

- Full sync initiale par objet (fenetre historique parametree)
- Incremental par `SystemModstamp`/`LastModifiedDate`
- Pagination `nextRecordsUrl`
- Filtrage SOQL strict sur champs necessaires

### 3.4 Webhooks / quasi temps reel

- V1: polling incremental 15 min
- V1.1: Platform Events / Change Data Capture sur `Opportunity`, `Task` (si edition client compatible)

### 3.5 Resilience

- Retries exponentiels sur `429`, `5xx`
- Backoff sur limite API quotidienne Salesforce
- Reprise par objet via watermark persistante

## 4. Exigences fonctionnelles

- `FR-SF-01`: test connexion dans l'admin integration
- `FR-SF-02`: selection des objets a synchroniser par tenant
- `FR-SF-03`: mapping de proprietaire vers equipe/site Praedixa
- `FR-SF-04`: ingestion multi-objet idempotente
- `FR-SF-05`: reprocessing d'une periode (`from` / `to`)

## 5. Exigences non-fonctionnelles

- `NFR-SF-01`: lag median < 20 minutes pour objets funnel
- `NFR-SF-02`: taux d'echec extraction < 1% par run
- `NFR-SF-03`: aucun champ secret/token en logs

## 6. Plan d'implementation

1. Creer `integrations/connectors/salesforce/client.py`.
2. Implementer extractors `accounts`, `opportunities`, `activities`.
3. Ajouter mappers vers `customer_account`, `sales_deal`, `activity_event`.
4. Brancher orchestration dans scheduler global.
5. Exposer statut + dernier run dans admin.

## 7. Plan de test

- Unit: parse payload Salesforce -> schema canonique.
- Integration: mock OAuth + pagination + 429.
- E2E: connexion sandbox, full sync, incremental, re-run.
- Security: revoke token, secret rotation, audit logs.

## 8. Definition of Done

- Sync `Account`, `Contact`, `Lead`, `Opportunity`, `Task` operationnelle.
- Watermark incremental stable.
- Dashboard monitoring actif.
- Runbook incident Salesforce redige.

## 9. Risques

- Variabilite des custom objects client -> mitiguer via mapping declaratif.
- Limites API quotidiennes -> throttling + planification hors pics.
