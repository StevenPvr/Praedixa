# PRD Connecteur - SAP Transportation Management (SAP TM)

- Statut: `Ready for build`
- Priorite: `P2`
- Verticales ciblees: logistique, transport
- Dependance: API SAP TM (OData/REST) + utilisateur integration

## 1. Objectif

Connecter SAP TM pour ingerer planification/execution transport et donnees de cout afin de piloter service level, charge operationnelle et performance transport.

## 2. Donnees cibles et mapping canonique

| Domaine     | Objets SAP TM              | Champs minimum                          | Frequence | Canonical                            |
| ----------- | -------------------------- | --------------------------------------- | --------- | ------------------------------------ |
| Transport   | freight order / booking    | FO id, mode, status, source/destination | 15-30 min | `shipment`                           |
| Execution   | event management           | event type, planned vs actual, delay    | 15 min    | `service_timing_event`, `route_stop` |
| Cout        | freight settlement         | charge type, amount, currency, carrier  | 60 min    | `freight_cost_fact`                  |
| Referentiel | business partner, location | bp id, location id, timezone            | 24h       | `carrier`, `site`                    |

## 3. Specification d'integration

### 3.1 Checklist de branchement client

- [ ] endpoint SAP TM (S/4HANA ou standalone)
- [ ] service user lecture + scopes OData
- [ ] certificat/SSO si requis par client
- [ ] mapping company code / plant -> sites Praedixa

### 3.2 Authentification

- OAuth2/SAML/basic selon architecture client
- credentials et certificats geres dans secret manager

### 3.3 Extraction

- full sync initiale des FO actifs + historique defini
- incremental via `ChangedOn` / event timestamp
- partitionnement par organization unit pour gros volumes

### 3.4 Resilience

- retry et backoff sur erreurs temporaires SAP
- file dead letter pour payload non conforme

## 4. Exigences fonctionnelles

- `FR-SAPTM-01`: importer ordres transport et statuts.
- `FR-SAPTM-02`: importer evenements planifies/reels.
- `FR-SAPTM-03`: importer reglements fret/couts.
- `FR-SAPTM-04`: consolider KPI punctualite + cout.

## 5. Exigences non-fonctionnelles

- `NFR-SAPTM-01`: gestion robuste des fuseaux et calendrier usine.
- `NFR-SAPTM-02`: audit trail complet de transformation.
- `NFR-SAPTM-03`: compatibilite multi-instance SAP.

## 6. Plan d'implementation

1. Client SAP OData/REST dans un adaptateur dedie.
2. Extractors `freight_orders`, `events`, `settlements`.
3. Mappers vers entites transport canonique.
4. Regles qualite et reconciliation couts.

## 7. Plan de test

- Unit: mapping codes SAP -> taxonomie Praedixa.
- Integration: authentification certif, pagination OData.
- E2E: comparaison KPI OTIF/couts sur periode pilote.

## 8. Definition of Done

- Connecteur SAP TM fournit plan + execution + cout.
- KPI transport visibles sans manipulation manuelle.
- Procedure replay et support documentee.

## 9. Risques

- Complexite auth entreprise (SSO/certificats).
- Customizing SAP differents selon client -> mapping configurable.
