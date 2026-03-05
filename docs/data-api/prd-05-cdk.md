# PRD Connecteur - CDK (DMS/CRM Concessionnaire)

- Statut: `Ready for build` (implementation), `Blocked by vendor` (acces partenaire)
- Priorite: `P1`
- Verticales ciblees: concessionnaire auto
- Dependance: programme partenaire CDK + autorisation concession

## 1. Objectif

Capter les flux DMS/CRM CDK (ventes, atelier, stock vehicules) pour modeliser capacite atelier, performance commerciale et revenus front/back.

## 2. Donnees cibles et mapping canonique

| Domaine | Objets CDK | Champs minimum | Frequence | Canonical |
| --- | --- | --- | --- | --- |
| Ventes | deals / opportunities | deal id, VIN, stage, gross, close date | 30 min | `sales_deal` |
| Atelier | repair orders | RO id, advisor, labor hours, status | 15-30 min | `service_order` |
| Stock | vehicle inventory | VIN, make/model, age, price, status | 60 min | `inventory_snapshot` |
| CRM | leads / activities | lead source, owner, follow-up | 30 min | `customer_account`, `activity_event` |

## 3. Specification d'integration

### 3.1 Checklist de branchement client

- [ ] contrat API CDK actif pour le concessionnaire
- [ ] credentials integration (prod + test)
- [ ] scopes lecture DMS + CRM
- [ ] mapping stores/departements -> sites Praedixa

### 3.2 Authentification

- OAuth/API token selon offre CDK retenue
- secret store chiffre + rotation planifiee

### 3.3 Extraction

- V1: API REST partenaire si disponible
- V1 fallback: depots fichiers `SFTP CSV` (daily + intraday)
- incremental par `updated_at` ou watermark fichier

### 3.4 Strategie resiliente

- pipeline dual-mode (`api` / `sftp`) avec meme mapper
- detection schema drift automatique sur fichiers

## 4. Exigences fonctionnelles

- `FR-CDK-01`: ingest ventes VN/VO et statuts funnel.
- `FR-CDK-02`: ingest ordres de reparation atelier et temps MO.
- `FR-CDK-03`: ingest stock vehicules et ageing.
- `FR-CDK-04`: rapprocher ventes + atelier par VIN/client.

## 5. Exigences non-fonctionnelles

- `NFR-CDK-01`: coherence transactions financieres au centime.
- `NFR-CDK-02`: ingestion robuste meme si API indisponible temporairement.
- `NFR-CDK-03`: respect strict PII (client, VIN, coordonnees).

## 6. Plan d'implementation

1. Créer interface `dealer_dms_connector`.
2. Implementer adaptateur CDK API.
3. Implementer adaptateur CDK SFTP fallback.
4. Construire mappers `deal`, `repair_order`, `vehicle_inventory`.
5. Ajouter controles qualite VIN, montants, statuts.

## 7. Plan de test

- Unit: parse API et parse CSV fallback.
- Integration: bascule automatique API -> SFTP.
- E2E: reconciliation mensuelle ventes/atelier vs exports concession.

## 8. Definition of Done

- Connecteur operationnel en mode API et mode fallback batch.
- Donnees ventes + atelier + stock disponibles en canonical.
- Runbook incident "CDK unavailable" livre.

## 9. Risques

- Acces API parfois long a obtenir -> lancer onboarding fournisseur en amont.
- Heterogeneite de configuration concession -> mapping configurable par tenant.
