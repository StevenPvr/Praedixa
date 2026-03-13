# PRD Connecteur - Fourth (WFM + Back Office Restaurant)

- Statut: `Ready for build`
- Priorite: `P1`
- Verticales ciblees: franchise fast food
- Dependance: acces API Fourth modules activables par client

## 1. Objectif

Connecter Fourth pour obtenir planning, heures travaillees, cout main-d'oeuvre et donnees back-office afin d'optimiser staffing et rentabilite par restaurant.

## 2. Donnees cibles et mapping canonique

| Domaine  | Objets Fourth                    | Champs minimum                          | Frequence | Canonical            |
| -------- | -------------------------------- | --------------------------------------- | --------- | -------------------- |
| RH       | employee profile                 | employee id, role, contract, store      | 60 min    | `employee`           |
| Planning | roster / shift plan              | shift start/end, role, published status | 15 min    | `shift_plan`         |
| Temps    | time records                     | clock in/out, breaks, overtime          | 15 min    | `timesheet`          |
| Cout     | labor cost / forecast            | labor cost, budget, variance            | 30-60 min | `labor_cost_fact`    |
| Stock    | purchasing/inventory (optionnel) | item, qty, waste                        | 60 min    | `inventory_snapshot` |

## 3. Specification d'integration

### 3.1 Checklist de branchement client

- [ ] modules Fourth actifs (WFM, Inventory, Purchasing)
- [ ] credentials API et permissions lecture
- [ ] mapping restaurant -> site Praedixa
- [ ] definitions locales des roles equipes

### 3.2 Authentification

- OAuth/API token selon offre Fourth
- refresh token automatise + coffre-fort secrets

### 3.3 Extraction

- backfill employees + 90 jours shifts/timesheets
- incremental par champ modifie
- polling prioritaire toutes 15 minutes pour staffing

### 3.4 Gestion qualite

- controle cohérence shift vs pointage vs cout
- detection des doublons de pointage

## 4. Exigences fonctionnelles

- `FR-FOU-01`: synchroniser planning publie des restaurants.
- `FR-FOU-02`: synchroniser pointages reels et heures sup.
- `FR-FOU-03`: calculer ecart staffing planifie/reel.
- `FR-FOU-04`: alimenter KPI cout MO et variance.

## 5. Exigences non-fonctionnelles

- `NFR-FOU-01`: exactitude temps/cout >= 99.5%.
- `NFR-FOU-02`: lag P95 <= 20 min sur shifts/punches.
- `NFR-FOU-03`: gestion forte des donnees employes (PII).

## 6. Plan d'implementation

1. Client API Fourth.
2. Extractors `employees`, `roster`, `time_records`, `labor_cost`.
3. Mappers vers entites workforce/cost.
4. Regles reconciliation planning vs realise.
5. Monitoring ecarts par restaurant.

## 7. Plan de test

- Unit: overtime, shift overnight, break compliance.
- Integration: modules absents/inactifs.
- E2E: coherence cout MO journalier avec reporting Fourth.

## 8. Definition of Done

- Connecteur fournit planning + pointage + cout.
- Ecart staffing visible dans dashboard operations.
- Reprocessing restaurant/jour possible.

## 9. Risques

- Couverture fonctionnelle variable selon modules clients.
- Definitions role/cout non standard -> dictionnaire configurable.
