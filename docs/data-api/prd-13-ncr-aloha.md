# PRD Connecteur - NCR Aloha (POS Restaurant)

- Statut: `Ready for build` (implementation), `Blocked by vendor` (selon edition)
- Priorite: `P2`
- Verticales ciblees: franchise fast food
- Dependance: edition Aloha (cloud/on-prem) + acces API/export

## 1. Objectif

Integrer NCR Aloha pour recuperer ventes POS, cadence service et donnees de main-d'oeuvre en complement ou alternative a Toast.

## 2. Donnees cibles et mapping canonique

| Domaine | Objets Aloha | Champs minimum | Frequence | Canonical |
| --- | --- | --- | --- | --- |
| POS | checks/orders/payments | check id, store, open/close time, totals | 5-15 min | `pos_ticket`, `order_header` |
| Produits | line items/modifiers | item, qty, price, discount | 15 min | `order_line` |
| Main-d'oeuvre | labor/timesheet | employee, clock events, role | 15-30 min | `timesheet`, `employee` |
| Referential | menu/store metadata | menu item, category, active flag | 24h | `menu_item`, `site` |

## 3. Specification d'integration

### 3.1 Checklist de branchement client

- [ ] edition Aloha identifiee (`Cloud`, `Connect`, `on-prem`)
- [ ] acces API/exports valide
- [ ] mapping stores et terminaux
- [ ] timezone / business date rules par store

### 3.2 Authentification

- API token/OAuth pour editions cloud
- credentials securises + tunnel/export pour on-prem

### 3.3 Extraction

- API cloud prioritaire en incremental
- fallback batch fichiers securises pour on-prem
- relecture fenetre glissante pour corrections tardives

### 3.4 Contraintes specifiques

- gestion `business date` restaurant (journee metier decalee)
- dedup checks modifies apres cloture

## 4. Exigences fonctionnelles

- `FR-ALO-01`: ingest tickets et paiements par store.
- `FR-ALO-02`: ingest lignes article et promotions.
- `FR-ALO-03`: ingest pointage equipe si module disponible.
- `FR-ALO-04`: fournir traffic 15 min pour staffing.

## 5. Exigences non-fonctionnelles

- `NFR-ALO-01`: tolerance aux environnements hybrides cloud/on-prem.
- `NFR-ALO-02`: exactitude ventes au centime.
- `NFR-ALO-03`: P95 lag <= 20 min sur tickets clos.

## 6. Plan d'implementation

1. Interface `restaurant_pos_connector` commune Toast/Aloha.
2. Adaptateur Aloha cloud API.
3. Parser exports batch Aloha on-prem.
4. Normalisation `business date` + mapping articles.
5. Monitoring de latence par store.

## 7. Plan de test

- Unit: day rollover et corrections tardives.
- Integration: API indisponible + batch fallback.
- E2E: reconciliation CA journalier et volume tickets.

## 8. Definition of Done

- Connecteur Aloha operationnel cloud + fallback batch.
- KPI trafic/service disponibles pour restaurants pilotes.
- Runbook edition cloud/on-prem documente.

## 9. Risques

- Accessibilite API dependante edition/licence client.
- Donnees on-prem heterogenes -> normalisation renforcee.
