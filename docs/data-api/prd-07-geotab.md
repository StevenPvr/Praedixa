# PRD Connecteur - Geotab (Telematics)

- Statut: `Ready for build`
- Priorite: `P1`
- Verticales ciblees: logistique, transport
- Dependance: compte MyGeotab client + acces API lecture

## 1. Objectif

Recuperer les signaux telematics (vehicule, trajet, conduite, incidents) pour enrichir prevision d'activite, fiabilite ETA et risque operationnel.

## 2. Donnees cibles et mapping canonique

| Domaine  | Objets Geotab           | Champs minimum                            | Frequence | Canonical                           |
| -------- | ----------------------- | ----------------------------------------- | --------- | ----------------------------------- |
| Flotte   | Device / Vehicle        | id, plate, vehicle group, status          | 30 min    | `vehicle`                           |
| Trajets  | Trip summary            | start/end time, distance, idle, driver id | 5-15 min  | `shipment_trip`, `telematics_event` |
| Geo      | GPS records             | timestamp, lat/lon, speed                 | 1-5 min   | `route_stop_event`                  |
| Securite | fault/diagnostic/events | code, severity, detected_at               | 5-15 min  | `telematics_event`                  |

## 3. Specification d'integration

### 3.1 Checklist de branchement client

- [ ] serveur Geotab (`my.geotab.com` ou regional)
- [ ] database name + credentials integration
- [ ] autorisation objets `Device`, `Trip`, `LogRecord`, `FaultData`
- [ ] mapping flotte/groupe -> sites Praedixa

### 3.2 Authentification

- API MyGeotab JSON-RPC avec session/token
- renouvellement session automatique

### 3.3 Extraction

- Full sync initiale referentiel flotte + conducteurs
- Incremental par `fromDate` / `lastVersion`
- fenetre de securite pour donnees GPS retardees

### 3.4 Resilience

- decoupage temporel pour grands volumes GPS
- retry sur timeouts + segmentation par groupe

## 4. Exigences fonctionnelles

- `FR-GEO-01`: ingestion positions et trajets par vehicule.
- `FR-GEO-02`: ingestion evenements securite et panne.
- `FR-GEO-03`: calcul KPI idle time, vitesse moyenne, retard ETA.
- `FR-GEO-04`: jointure vehicule/driver avec planning WFM.

## 5. Exigences non-fonctionnelles

- `NFR-GEO-01`: support gros volume events sans perte.
- `NFR-GEO-02`: lag P95 <= 10 min pour indicateurs operationnels.
- `NFR-GEO-03`: anonymisation coordonnees sensibles hors besoin.

## 6. Plan d'implementation

1. Client JSON-RPC Geotab avec gestion session.
2. Extractors `Device`, `Trip`, `LogRecord`, `FaultData`.
3. Pipeline de normalisation geospatial.
4. Agrégations ETA / performance flotte.
5. Alerting derivee securite (fault spikes).

## 7. Plan de test

- Unit: conversion geospatial + fuseau horaire.
- Integration: gros volume log records.
- E2E: comparaison distance/temps trajet avec baseline client.

## 8. Definition of Done

- Flux flotte + trajets + incidents stabilises.
- Dashboard transport alimente avec latence cible.
- Procedure replay d'une journee flotte validee.

## 9. Risques

- Volume data eleve -> partitionnement temporel obligatoire.
- Qualite GPS variable -> filtres outliers geospatiaux.
