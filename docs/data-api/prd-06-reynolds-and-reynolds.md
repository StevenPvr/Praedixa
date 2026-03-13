# PRD Connecteur - Reynolds & Reynolds (DMS)

- Statut: `Ready for build` (implementation), `Blocked by vendor` (acces partenaire)
- Priorite: `P1`
- Verticales ciblees: concessionnaire auto
- Dependance: programme integration Reynolds + autorisation dealer

## 1. Objectif

Connecter Reynolds pour capter ventes, service et parts afin de piloter productivite atelier, qualite de conversion et performance operationnelle concession.

## 2. Donnees cibles et mapping canonique

| Domaine  | Objets Reynolds             | Champs minimum                         | Frequence | Canonical            |
| -------- | --------------------------- | -------------------------------------- | --------- | -------------------- |
| Sales    | deal / desking data         | deal id, VIN, F&I amount, close status | 30 min    | `sales_deal`         |
| Service  | repair order / appointments | RO id, op codes, promised time, status | 15-30 min | `service_order`      |
| Parts    | parts sales/inventory       | part number, qty on hand, movement     | 60 min    | `inventory_snapshot` |
| Customer | customer profile light      | id, segment, contact flags             | 60 min    | `customer_account`   |

## 3. Specification d'integration

### 3.1 Checklist de branchement client

- [ ] contrat d'acces integration Reynolds valide
- [ ] credentiels API ou flux export autorises
- [ ] mapping rooftop/departments -> sites Praedixa
- [ ] validation legale donnees clients et VIN

### 3.2 Authentification

- token/API credentials selon programme Reynolds
- support de rotation credentiels sans interruption

### 3.3 Extraction

- API prioritaire si acces direct autorise
- fallback batch fichiers securises si API limitee
- incremental par timestamp de mise a jour

### 3.4 Regles specifiques

- preservation des identifiants metier dealer
- normalisation codes operation atelier

## 4. Exigences fonctionnelles

- `FR-REY-01`: importer pipeline vente et issue de transaction.
- `FR-REY-02`: importer charge atelier par ordre de reparation.
- `FR-REY-03`: importer flux pieces pour relier charge et disponibilite.
- `FR-REY-04`: fournir vue unifiee ventes/service par concession.

## 5. Exigences non-fonctionnelles

- `NFR-REY-01`: robustesse en mode batch/API interchangeable.
- `NFR-REY-02`: securisation forte des donnees client et vehicule.
- `NFR-REY-03`: audit trail des transformations.

## 6. Plan d'implementation

1. Reutiliser socle `dealer_dms_connector`.
2. Ajouter adaptateur Reynolds API.
3. Ajouter parser exports batch Reynolds.
4. Construire mapping `deal`, `service`, `parts`.
5. Ajouter controles qualite montants + VIN.

## 7. Plan de test

- Unit: mapping codes atelier -> taxonomy Praedixa.
- Integration: fichiers incomplets/retardes.
- E2E: validation KPI atelier et conversion.

## 8. Definition of Done

- Flux ventes, service, pieces integres.
- Backfill historique + incremental stables.
- Dashboard concession alimente automatiquement.

## 9. Risques

- Variantes de schema selon version DMS -> adaptateur versionne.
- Disponibilite sandbox faible -> jeux de donnees certifies internes.
