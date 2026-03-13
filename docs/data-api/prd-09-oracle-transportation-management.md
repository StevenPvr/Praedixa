# PRD Connecteur - Oracle Transportation Management (OTM)

- Statut: `Ready for build`
- Priorite: `P2`
- Verticales ciblees: logistique, transport
- Dependance: acces OTM Cloud/API + role integration

## 1. Objectif

Integrer OTM pour exploiter ordres transport, execution des expeditions et couts fret afin d'ameliorer prediction charge transport et performance OTIF.

## 2. Donnees cibles et mapping canonique

| Domaine        | Objets OTM               | Champs minimum                                 | Frequence | Canonical                            |
| -------------- | ------------------------ | ---------------------------------------------- | --------- | ------------------------------------ |
| Plan transport | order release / shipment | shipment id, mode, origin, destination, status | 15-30 min | `shipment`                           |
| Execution      | stops/events             | event code, milestone time, delay              | 15 min    | `route_stop`, `service_timing_event` |
| Cout           | charges/rates            | carrier, base cost, surcharge, currency        | 60 min    | `freight_cost_fact`                  |
| Referentiel    | carriers/locations       | carrier id, location id, timezone              | 24h       | `carrier`, `site`                    |

## 3. Specification d'integration

### 3.1 Checklist de branchement client

- [ ] URL OTM tenant + environnement
- [ ] compte integration lecture
- [ ] API whitelist/IP autorisees
- [ ] mapping locations OTM -> sites Praedixa

### 3.2 Authentification

- OAuth 2.0 / basic + token selon configuration OTM
- secrets stockes en coffre-fort, rotation trimestrielle

### 3.3 Extraction

- full sync historique expeditions (parametrable)
- incremental par `last_update`/event timestamp
- polling 15-30 min

### 3.4 Robustesse

- retry sur indisponibilite API
- reprise par shipment et par fenetre temporelle

## 4. Exigences fonctionnelles

- `FR-OTM-01`: importer expeditions et statuts execution.
- `FR-OTM-02`: importer milestones et retards.
- `FR-OTM-03`: importer couts transport par shipment.
- `FR-OTM-04`: calculer OTIF et derivee cout/km.

## 5. Exigences non-fonctionnelles

- `NFR-OTM-01`: precision timestamps timezone-safe.
- `NFR-OTM-02`: SLA sync quotidienne >= 99%.
- `NFR-OTM-03`: support multi-devise pour couts.

## 6. Plan d'implementation

1. Client OTM API avec auth adaptable.
2. Extractors `shipments`, `events`, `charges`.
3. Mappers transport -> schema canonique.
4. KPI OTIF/cout transport dans pipeline analytique.

## 7. Plan de test

- Unit: mapping milestones et codes status.
- Integration: erreurs auth, pagination, 429.
- E2E: reconciliation expeditions et couts.

## 8. Definition of Done

- Flux shipment/events/charges operationnels.
- OTIF et cout fret disponibles par site/client.
- Runbook OTM incident en place.

## 9. Risques

- Parametrage OTM fortement customise par client.
- Donnees cout parfois finalisees en fin de cycle -> reconciliation differee.
