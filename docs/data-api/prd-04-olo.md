# PRD Connecteur - Olo (Digital Ordering)

- Statut: `Ready for build`
- Priorite: `P1`
- Verticales ciblees: franchise fast food
- Dependance: contrat API Olo + credentials marque/franchise

## 1. Objectif

Integrer Olo pour recuperer la commande digitale (web/app/aggregateurs) et enrichir prevision de demande, delais de service et capacite equipe.

## 2. Donnees cibles et mapping canonique

| Domaine   | Objets Olo                | Champs minimum                               | Frequence | Canonical                    |
| --------- | ------------------------- | -------------------------------------------- | --------- | ---------------------------- |
| Commandes | order header/status       | order id, store id, channel, status timeline | 5-15 min  | `order_header`, `pos_ticket` |
| Lignes    | items/modifiers           | sku, qty, unit price, promo                  | 15 min    | `order_line`                 |
| SLA       | promised/ready/picked-up  | promised time, ready time, delay reason      | 15 min    | `service_timing_event`       |
| Client    | identifiers pseudonymises | customer id hash, loyalty flag               | 30 min    | `customer_profile_light`     |

## 3. Specification d'integration

### 3.1 Checklist de branchement client

- [ ] credentials API Olo (prod + sandbox si disponible)
- [ ] liste stores / brands
- [ ] mapping canaux (first-party / aggregator)
- [ ] politique retention PII validee

### 3.2 Authentification

- API key / bearer token selon contrat Olo
- stockage chiffre + rotation semestrielle minimum

### 3.3 Extraction

- Full backfill 60-90 jours commandes digitales
- Incremental par `updated_at` + filtre status
- relecture fenetre glissante 3h pour statuts tardifs

### 3.4 Evenements

- si webhook disponible: mode hybride webhook + polling
- sinon polling agressif 5-15 min

## 4. Exigences fonctionnelles

- `FR-OLO-01`: distinguer commande digitale des tickets POS natifs.
- `FR-OLO-02`: normaliser timeline de statut commande.
- `FR-OLO-03`: calculer retard vs promesse client.
- `FR-OLO-04`: joindre Olo a Toast/NCR sur cle de commande unifiee.

## 5. Exigences non-fonctionnelles

- `NFR-OLO-01`: P95 lag <= 15 minutes sur changements statut.
- `NFR-OLO-02`: tolerance aux doublons evenements >= 100%.
- `NFR-OLO-03`: minimisation des donnees personnelles.

## 6. Plan d'implementation

1. Client Olo + module signature si webhook.
2. Extractors `orders`, `status_events`, `items`.
3. Mapper vers modeles commande + SLA.
4. Jointure optionnelle avec POS via `external_order_id`.
5. Alerting sur derive de delai digital.

## 7. Plan de test

- Unit: mapping timeline statut.
- Integration: commandes annulees, retardees, remplacees.
- E2E: reconciliation volume Olo vs chiffre digital.

## 8. Definition of Done

- Flux digital disponible par store et tranche 15 min.
- KPI retard digital visible dans dashboard operations.
- Replay de journee complete possible.

## 9. Risques

- Modeles de canaux differents selon marques -> table de correspondance configurable.
- Dependance aux accords API franchiseur/brand owner.
