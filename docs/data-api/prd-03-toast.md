# PRD Connecteur - Toast (POS + Operations)

- Statut: `Ready for build`
- Priorite: `P1`
- Verticales ciblees: franchise fast food
- Dependance: compte partenaire Toast + permissions multi-locations

## 1. Objectif

Connecter Toast pour capter ventes, cadence de service et donnees operations magasin afin d'alimenter:

- previsions de charge intra-journee
- analyse menu mix / productivite equipe
- pilotage staffing vs flux commandes

## 2. Donnees cibles et mapping canonique

| Domaine     | Objets Toast                    | Champs minimum                                             | Frequence | Canonical                    |
| ----------- | ------------------------------- | ---------------------------------------------------------- | --------- | ---------------------------- |
| Vente       | orders/checks/payments          | order id, location, opened/closed at, totals, payment type | 5-15 min  | `pos_ticket`, `order_header` |
| Produits    | item selections                 | item id, qty, modifiers, net sales                         | 15 min    | `order_line`                 |
| Operations  | labor/employee (si scope actif) | employee id, role, clock events                            | 15 min    | `timesheet`, `employee`      |
| Referential | menus/items                     | sku, category, active flag                                 | 24h       | `menu_item`                  |

## 3. Specification d'integration

### 3.1 Checklist de branchement client

- [ ] tenant Toast + environnement prod/sandbox
- [ ] `runtimeEnvironment=production|sandbox` confirme des le branchement
- [ ] credentials API (partner app)
- [ ] liste des locations autorisees
- [ ] timezone par location
- [ ] suffixes d'hotes autorises documentes pour l'environnement retenu

### 3.2 Authentification

- OAuth 2.0 (partner integration) ou credentiels API selon programme
- aucun host sandbox ne doit etre reutilise en `production`; si Toast fournit un host sandbox dedie, il doit vivre dans l'allowlist sandbox du runtime
- token refresh gere dans la couche core

### 3.3 Extraction

- Backfill initial 90 jours ventes
- Incremental par `modified`/`closeout` timestamp
- polling frequences distinctes:
  - tickets: 5-15 min
  - menus: 24h

### 3.4 Robustesse

- relecture fenetre glissante 2h pour corriger commandes tardives
- dedup par `(location_id, order_id, last_updated_at)`

## 4. Exigences fonctionnelles

- `FR-TOAST-01`: ingestion multi-locations avec isolat par site.
- `FR-TOAST-02`: conservation statut commande (open/closed/refunded/void).
- `FR-TOAST-03`: calcul minute-level traffic pour staffing.
- `FR-TOAST-04`: mapping des canaux (`in-store`, `drive-thru`, `delivery`).

## 5. Exigences non-fonctionnelles

- `NFR-TOAST-01`: lag P95 <= 20 min sur tickets fermes.
- `NFR-TOAST-02`: support volume pic repas midi/soir sans perte.
- `NFR-TOAST-03`: exactitude montants financiers au centime.

## 6. Plan d'implementation

1. Client Toast API et gestion scopes.
2. Extractor `orders` + `checks` + `payments`.
3. Mapper vers `pos_ticket` / `order_line`.
4. Jobs minute-level aggregations par site.
5. Observabilite: volume ticket/minute + erreur par location.

## 7. Plan de test

- Unit: remises, annulations, refund partiel.
- Integration: multi-locations, pagination, backfill.
- E2E: comparaison journaliere POS vs canonical total.

## 8. Definition of Done

- Donnees ventes near-real-time operationnelles.
- Dashboards staffing utilisaient flux Toast sans manuel CSV.
- Runbook incident (retard commandes / location offline) complete.

## 9. Risques

- Acces API partner parfois conditionne contractuellement.
- Incoherences canal delivery -> normalisation canal unifiee.
