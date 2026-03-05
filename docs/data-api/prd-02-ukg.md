# PRD Connecteur - UKG (Workforce Management)

- Statut: `Ready for build`
- Priorite: `P1`
- Verticales ciblees: logistique, transport, fast food
- Dependance: acces API UKG + service account integration

## 1. Objectif

Recuperer les donnees workforce (planning, pointage, absences) pour fiabiliser la prediction d'absenteisme et la couverture des shifts.

## 2. Donnees cibles et mapping canonique

| Domaine | Objets UKG | Champs minimum | Frequence | Canonical |
| --- | --- | --- | --- | --- |
| Workforce | Employee profile | employee id, site, job code, status | 60 min | `employee` |
| Planning | Schedules / shifts | start/end, role, location, published flag | 15 min | `shift_plan` |
| Realise | Punches / timesheets | clock in/out, source terminal, approved flag | 15 min | `timesheet` |
| RH | Absence / leave | type, start/end, status, paid flag | 30 min | `absence_event` |

## 3. Specification d'integration

### 3.1 Checklist de branchement client

- [ ] tenant UKG, endpoint API region
- [ ] credentials OAuth/service auth
- [ ] acces lecture aux modules Scheduling + Timekeeping + Absence
- [ ] mapping site UKG -> site Praedixa

### 3.2 Authentification

- OAuth 2.0 client credentials ou mecanisme vendor equivalent selon edition
- renouvellement token automatise

### 3.3 Extraction

- Full sync initiale employees + 90 jours historiques shifts/timesheets
- Incremental par `lastChangedDateTime` (ou champ equivalent edition)
- Pagination curseur vendor

### 3.4 Latence cible

- planning/punch: `<= 15 min`
- absences: `<= 30 min`

### 3.5 Gestion erreurs

- retries sur `429/5xx`
- dead letter pour payload incoherent
- replay d'une journee/site

## 4. Exigences fonctionnelles

- `FR-UKG-01`: importer employes actifs + metadata metier.
- `FR-UKG-02`: differencier planning publie vs brouillon.
- `FR-UKG-03`: reconciler planning vs pointage reel.
- `FR-UKG-04`: ingest absences avec motif standardise.
- `FR-UKG-05`: vue de sante integration par site.

## 5. Exigences non-fonctionnelles

- `NFR-UKG-01`: tolerance decalage timezone/site.
- `NFR-UKG-02`: SLA sync journaliere >= 99%.
- `NFR-UKG-03`: chiffrement des identifiants employe sensibles.

## 6. Plan d'implementation

1. Client API UKG + couche auth.
2. Extractors `employees`, `schedules`, `punches`, `absences`.
3. Mapper normalisation vers modeles workforce.
4. Jobs orchestration distincts (planning vs realize).
5. Ecran admin pour delta planning/reel.

## 7. Plan de test

- Unit: timezone, overnight shifts, split shifts.
- Integration: pagination, retry, rate limit.
- Contract tests sur payload reellement observes.

## 8. Definition of Done

- Couverture complete employes/planning/pointage/absences.
- KPI "coverage gap" alimente en donnees UKG.
- Reprocessing site/jour valide.

## 9. Risques

- Variantes UKG selon edition -> couche `edition_profile`.
- Donnees RH sensibles -> minimisation et masquage PII strict.
