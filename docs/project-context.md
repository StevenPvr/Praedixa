# Praedixa — Contexte du projet

## Positionnement

**Praedixa** aide les PME/ETI à piloter la capacité par rapport à la charge sur des équipes terrain multi-sites.

**One-liner :** Piloter la sous-couverture terrain, pas juste "gérer des absences".

**Objectif :** Éviter les trous de planning, sécuriser le niveau de service et réduire les coûts imprévus. Au lieu de subir absences, turnover et pics d'activité, Praedixa donne une lecture opérationnelle et économique pour décider vite et bien.

---

## Problème

Quand la capacité disponible ne suit pas la charge à tenir, l'entreprise compense dans l'urgence :

- Heures supplémentaires
- Intérim
- Dégradation de service
- Tensions managériales
- Turnover supplémentaire

Les données existent, mais elles sont souvent **dispersées et difficiles à transformer en décisions chiffrées**. Résultat : beaucoup d'arbitrages "à l'instinct" et une facture qui gonfle sans être clairement mesurée.

**Sources de l'écart capacité/charge :**

- **Absences** (prévisibles et imprévues)
- **Turnover** (départs, remplacements)
- **Demande clients** (pics d'activité, saisonnalité)
- **Offre fournisseurs** (contraintes supply chain)

---

## Signaux marché (données)

Quelques chiffres utiles pour objectiver "pourquoi maintenant" :

- **Recrutement sous tension** : en 2025, **50,1%** des projets de recrutement sont jugés difficiles (France Travail, BMO 2025) et le taux d'emplois vacants dans le privé est de **2,3%** au T3 2025 (Dares).[^bmo2025][^dares_vacants]
- **Absentéisme structurel (France)** : une étude sectorielle estime le taux d'absentéisme à **6,11%** en 2023 (baromètre Ayming x AG2R La Mondiale).[^ag2r_abs2023] Côté "signal macro", la dépense d'indemnités journalières pour arrêts maladie atteint **10,2 Md€** en 2023 et accélère depuis 2019 (DREES).[^drees_arrets]
- **Coût de la flexibilité** : les heures supplémentaires sont majorées **de 25% puis 50%** à défaut d'accord.[^hs_majoration] (L'intérim + la dégradation de service coûtent aussi cher, mais sont rarement mesurés proprement.)
- **Données enfin disponibles** : l'ERP et les outils de gestion se diffusent (43,3% des entreprises de l'UE utilisent un ERP en 2023 ; 86,3% des grandes entreprises).[^eurostat_erp]
- **IA en entreprise en hausse** : en France, **10%** des entreprises utilisent au moins une technologie d'IA en 2024 (vs 6% en 2023), et c'est **33%** pour les 250+ salariés (INSEE).[^insee_ai] Au niveau UE, la part d'entreprises utilisant l'IA atteint **20%** en 2025 (Eurostat).[^eurostat_ai_2025]

---

## Solution

Praedixa crée une **boucle actionnable : capacité → décision → preuve économique**.

### 1. Construire et raffiner la base de données

Prise en charge complète de la création d'une base de données structurée à partir des sources existantes (planning, activité, absences). Raffinement continu : chaque cycle d'usage améliore la qualité et la complétude des données.

### 2. Anticiper les risques de sous-couverture

Prévisions à l'horizon opérationnel (J+3 à J+14) par site, équipe, compétence.

### 3. Objectiver les arbitrages coût vs service

Chiffrer les options : HS, intérim, réallocation, accepter la dégradation. Comparer coût de l'action vs coût de l'inaction.

### 4. Suivre l'impact réel des décisions

Decision log traçable, mesure avant/après, preuve économique auditable.

---

## Approche technique

**ML séries temporelles + économétrie** pour :

- Exploiter les historiques (planning, activité, absences, contraintes opérationnelles)
- Identifier des patterns et estimer des impacts
- Produire des prévisions et indicateurs orientés ROI

**Privacy by design :**

- Conforme RGPD
- Pas de données individuelles — uniquement des données agrégées
- Données sécurisées, hébergement via Cloudflare (edge)

---

## ICP (Ideal Customer Profile)

**Cible prioritaire :**

- Directeur d'exploitation / Resp. planning / DAF
- Boîtes multi-sites main-d'œuvre intensive (100+ opérationnels)

**Wedge initial :** Logistique et opérations multi-sites (entrepôts, transport, 3PL), où les trous de planning ont un impact immédiat sur le service et les coûts. Secteur massif : **1 552 700** emplois salariés dans les transports et l'entreposage (France, T1 2025).[^sdes_transport]

**Critères de qualification :**

- Taux d'absentéisme > 5% (à titre indicatif, baromètre 2023 : 6,11%).[^ag2r_abs2023]
- Utilisation régulière d'intérim / HS
- Variabilité de charge significative
- Douleur visible sur la couverture

**Budget :** Ops/DAF (pas RH)

---

## Go-to-Market

**Approche :** Sell-first — validation terrain, cadrage du wedge et premiers pilotes sur un secteur unique avant d'industrialiser.

**Canal principal :** Cold LinkedIn + appels vers Dir. exploitation / Resp. planning

**Pitch :**

> On aide les équipes terrain à piloter la capacité vs la charge. En 48h, à partir d'exports simples, on calcule où vous allez être sous-couverts, combien ça coûte, et quoi faire. Pas d'intégration lourde, pas de données sensibles. L'objectif : moins de stress opérationnel, moins de coût imprévu, service stable.

---

## Offre

### 1. Diagnostic pilote (wedge)

|            |                                                                         |
| ---------- | ----------------------------------------------------------------------- |
| **Input**  | Exports agrégés (planning, activité, absences)                          |
| **Output** | Rapport : carte de sous-couverture, coût évitable, actions prioritaires |
| **Délai**  | 48h après réception des données                                         |
| **Prix**   | Pilote fixe (packagé, pas du conseil)                                   |

### 2. Abonnement SaaS (après validation pilote)

- Dashboard temps réel par site
- Prévisions multi-horizons (J+3, J+7, J+14)
- Alertes et recommandations automatiques
- Decision log + preuve d'impact
- Pricing par taille (salariés, sites)

---

## Différenciation

**Ce que Praedixa n'est pas :**

- Un dashboard RH de plus
- De la "prédiction ML" pour faire joli
- Un outil qui nécessite 6 mois d'intégration
- Du conseil facturé à la journée

**Ce que Praedixa est :**

- Un outil de pilotage capacité/charge opérationnel
- Orienté décision et preuve économique
- Sans intégration lourde au départ
- Évolutif vers SaaS complet

---

## État d'avancement

**Ce qui existe :**

- Socle technique en place (Next.js, FastAPI, PostgreSQL, CI/CD)
- Architecture data/ML documentée

**Objectif immédiat :**
Valider l'idée au-delà des statistiques — trouver 3 entreprises pilotes prêtes à s'engager dans un partenariat pour co-construire et tester la solution en conditions réelles.

**Travail en cours :**

- Validation terrain (sell-first)
- Cadrage du wedge
- Recherche de partenaires pilotes sur logistique

---

## Architecture technique

**Repo actuel (landing-only) :** pnpm workspaces + Turbo

```
apps/landing/          # Marketing site (Next.js)
packages/ui/           # UI partagé
packages/shared-types/ # Types partagés
```

**Stack landing :**

- Frontend : Next.js 15, React 19, TypeScript, Tailwind CSS
- Cloud : Cloudflare Workers (landing)

> Les services backend/data/ML sont planifiés mais volontairement hors scope de ce repo.

---

## Ambition

Démarrer très wedge, prouver une valeur économique mesurable sur la logistique, puis étendre à des secteurs adjacents (industrie, retail, BTP, santé) **uniquement après traction et répétabilité**.

Trajectoire venture-scale.

---

## Glossaire

| Terme           | Définition                                            |
| --------------- | ----------------------------------------------------- |
| Capacité        | Ressources disponibles (effectif, compétences, temps) |
| Charge          | Travail à réaliser (demande, activité planifiée)      |
| Sous-couverture | Écart entre capacité disponible et charge à tenir     |
| ETP             | Équivalent temps plein                                |
| ICP             | Ideal Customer Profile                                |
| Wedge           | Produit d'entrée à friction minimale                  |

---

## Sources (sélection)

[^bmo2025]: France Travail — _Enquête Besoins en main-d'œuvre (BMO) 2025_ (publié le 11/04/2025, consulté le 05/02/2026) : 2,4M d'embauches potentielles ; 50,1% jugés difficiles. https://statistiques.francetravail.org/bmo/bmopub/225146

[^dares_vacants]: Dares — _Les emplois vacants_ (mis à jour le 16/12/2025, consulté le 05/02/2026) : taux d'emplois vacants 2,3% au T3 2025 (privé). https://dares.travail-emploi.gouv.fr/donnees/les-emplois-vacants

[^drees_arrets]: DREES — _Études et Résultats n°1321_ (13/12/2024, consulté le 05/02/2026) : dépense d'indemnités journalières d'arrêts maladie 10,2 Md€ en 2023 ; accélération depuis 2019. https://www.drees.solidarites-sante.gouv.fr/publications-communique-de-presse/etudes-et-resultats/241211_ER_Arrets-Maladie

[^hs_majoration]: Ministère de l'Économie — _Heures supplémentaires : règles de rémunération_ (consulté le 05/02/2026) : majoration 25% (puis 50%) à défaut d'accord. https://economie.gouv.fr/particuliers/heures-supplementaires-salaries-prive

[^eurostat_erp]: Eurostat — _E-business integration, 2023_ (news release 06/02/2024, consulté le 05/02/2026) : 43,3% des entreprises de l'UE utilisent un ERP ; 86,3% des grandes entreprises. https://ec.europa.eu/eurostat/documents/2995521/18404397/4-06022024-AP-EN.pdf

[^insee_ai]: INSEE — _Les entreprises utilisent de plus en plus l'intelligence artificielle en 2024_ (consulté le 05/02/2026) : 10% des entreprises en France utilisent l'IA en 2024 (vs 6% en 2023) ; 33% pour les 250+ salariés. https://www.insee.fr/fr/statistiques/8232138

[^eurostat_ai_2025]: Eurostat — _AI use in EU enterprises: 20% in 2025_ (15/04/2025, consulté le 05/02/2026). https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20250415-1

[^sdes_transport]: SDES (Ministère de la Transition écologique) — _Emploi salarié et marché du travail dans les transports au 1er trimestre 2025_ (consulté le 05/02/2026). https://www.statistiques.developpement-durable.gouv.fr/emploi-salarie-et-marche-du-travail-dans-les-transports-au-premier-trimestre-2025

[^ag2r_abs2023]: AG2R LA MONDIALE — _Une hausse de l'absentéisme des salariés en 2023_ (baromètre Ayming x AG2R La Mondiale, 05/09/2024, consulté le 05/02/2026) : taux d'absentéisme 6,11% en 2023. https://www.ag2rlamondiale.fr/espace-presse/communiques-de-presse/unehausse-de-labsenteisme-desalaries-en-2023

---

## Contact

steven.poivre@outlook.com / 06 24 08 20 12
