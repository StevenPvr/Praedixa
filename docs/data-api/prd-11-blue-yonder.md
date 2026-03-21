# PRD Connecteur - Blue Yonder (TMS/WMS Planning)

- Statut: `L2 core delivered`
- Priorite: `P2`
- Verticales ciblees: logistique, transport
- Dependance: acces APIs Blue Yonder modules clients

## 1. Objectif

Integrer Blue Yonder pour synchroniser planification supply chain, execution transport et donnees operationnelles entrepot.

## 2. Donnees cibles et mapping canonique

| Domaine    | Objets Blue Yonder | Champs minimum                       | Frequence | Canonical                 |
| ---------- | ------------------ | ------------------------------------ | --------- | ------------------------- |
| TMS        | loads / shipments  | load id, route, status, eta          | 15-30 min | `shipment`                |
| WMS        | tasks / waves      | task id, area, start/end, completion | 15-30 min | `warehouse_task`          |
| Inventaire | stock snapshots    | item, location, qty, timestamp       | 60 min    | `inventory_snapshot`      |
| Ressources | labor assignments  | employee/task assignment, shift      | 30 min    | `shift_plan`, `timesheet` |

## 3. Specification d'integration

### 3.1 Checklist de branchement client

- [ ] modules BY actifs (TMS, WMS, Labor)
- [ ] credentials API + environnement
- [ ] definitions sites/entrepots
- [ ] mapping codes process client

### 3.2 Authentification

- OAuth/token selon stack Blue Yonder du client
- renouvellement token automatique

### 3.3 Extraction

- full sync referentiels puis backfill historique
- incremental par `lastUpdateDateTime`
- polling 15-30 min sur flux critiques

### 3.4 Qualite et drift

- controle schema drift par objet
- fallback batch CSV si endpoint indisponible

## 4. Exigences fonctionnelles

- `FR-BY-01`: ingest transport loads et statuts.
- `FR-BY-02`: ingest taches entrepot et execution.
- `FR-BY-03`: ingest snapshots inventaire.
- `FR-BY-04`: alimenter KPI throughput et couverture ressources.

## 5. Exigences non-fonctionnelles

- `NFR-BY-01`: support forte volumetrie operations entrepot.
- `NFR-BY-02`: latence < 30 min sur taches critiques.
- `NFR-BY-03`: robustesse aux variations de version API.

## 6. Plan d'implementation

1. Créer adaptateur API Blue Yonder.
2. Extractors `loads`, `warehouse_tasks`, `inventory`.
3. Mapper vers schema canonique supply chain.
4. Dashboard health + SLA de sync.

## 7. Plan de test

- Unit: mapping task statuses.
- Integration: gros batch + pagination.
- E2E: throughput compare aux rapports BY.

## 8. Definition of Done

- Donnees TMS/WMS remontees automatiquement.
- KPI entrepot/transport alimentes en continu.
- Runbook de reprise disponible.

## 9. Risques

- Diversite des modules deployes par client.
- APIs parfois restreintes selon licence -> fallback CSV.
