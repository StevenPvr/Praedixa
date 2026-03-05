# PRD Connecteur - Manhattan (WMS/TMS)

- Statut: `Ready for build`
- Priorite: `P2`
- Verticales ciblees: logistique, transport
- Dependance: acces Manhattan Active API ou export securise

## 1. Objectif

Connecter Manhattan pour exploiter execution entrepot/transport et pilotage de productivite terrain.

## 2. Donnees cibles et mapping canonique

| Domaine | Objets Manhattan | Champs minimum | Frequence | Canonical |
| --- | --- | --- | --- | --- |
| Entrepot | work orders/tasks | task id, zone, assigned user, status, timestamps | 15-30 min | `warehouse_task` |
| Stock | inventory by location | item, bin, on hand, reserved | 60 min | `inventory_snapshot` |
| Transport | shipment/route | shipment id, route, status, eta | 15-30 min | `shipment`, `route_stop` |
| Main-d'oeuvre | labor performance | worker id, productivity metrics | 30-60 min | `labor_productivity_fact` |

## 3. Specification d'integration

### 3.1 Checklist de branchement client

- [ ] version Manhattan (Active vs legacy)
- [ ] credentials API ou acces export
- [ ] mapping warehouse/site/route
- [ ] conventions locales de statut process

### 3.2 Authentification

- OAuth/token pour Active API
- fallback integration batch securisee si on-prem legacy

### 3.3 Extraction

- full sync referentiels et snapshots initiaux
- incremental par `last_updated` ou watermark fichier
- polling 15-30 min sur tasks/shipments

### 3.4 Resilience

- mode hybride API + batch
- reprise selective par entrepot

## 4. Exigences fonctionnelles

- `FR-MAN-01`: ingestion taches entrepot et avancement.
- `FR-MAN-02`: ingestion stock par localisation.
- `FR-MAN-03`: ingestion expéditions et ETA.
- `FR-MAN-04`: calcul de productivite par equipe/zone.

## 5. Exigences non-fonctionnelles

- `NFR-MAN-01`: scalabilite sur pics de taches.
- `NFR-MAN-02`: exactitude stock >= 99%.
- `NFR-MAN-03`: mode degrade operationnel en cas API indisponible.

## 6. Plan d'implementation

1. Adaptateur Manhattan API + batch.
2. Extractors `tasks`, `inventory`, `shipments`.
3. Mappers vers entites logistiques.
4. Observabilite SLA par entrepot.

## 7. Plan de test

- Unit: mapping statuts taches.
- Integration: bascule API -> batch.
- E2E: reconciliation inventaire et throughput.

## 8. Definition of Done

- Flux taches/stock/shipments stable.
- KPI productivite entrepot calcules automatiquement.
- Guide operationnel support livre.

## 9. Risques

- Coexistence versions legacy/active chez clients.
- Mapping statuts tres personnalises par site.
