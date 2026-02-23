# Topic Map FR (Ops/DAF Multi-sites)

## Objectif

Déployer un champ de bataille SEO sur 30 requêtes FR business-critical, avec une page dédiée et un asset différenciant par requête.

## Clusters de conquête

### A) Sous-couverture et early-warning

| #   | Requête cible                        | Intent        | URL cible                                          | Asset différenciant           |
| --- | ------------------------------------ | ------------- | -------------------------------------------------- | ----------------------------- |
| 1   | sous-couverture définition           | Info          | `/fr/ressources/sous-couverture-definition`        | Diagnostic en 5 questions     |
| 2   | sous-couverture logistique           | Info/Decision | `/fr/ressources/sous-couverture-logistique`        | Cas chiffré complet           |
| 3   | trous de couverture planning         | Info          | `/fr/ressources/trous-de-couverture-planning`      | Template revue hebdo          |
| 4   | écart capacité charge logistique     | Info          | `/fr/ressources/ecart-capacite-charge`             | Modèle Excel/Sheets           |
| 5   | taux de couverture planning          | Info          | `/fr/ressources/taux-de-couverture-planning`       | Calculateur taux couverture   |
| 6   | early warning sous-effectif          | Info/Decision | `/fr/ressources/early-warning-sous-effectif`       | Démo interactive de détection |
| 7   | anticiper sous-effectif entrepôt     | Info          | `/fr/ressources/anticiper-sous-effectif-entrepot`  | Checklist + scoring           |
| 8   | carte des risques de sous-couverture | Decision      | `/fr/ressources/carte-des-risques-sous-couverture` | Livrable carte des risques    |

### B) Planification et dimensionnement

| #   | Requête cible                          | Intent        | URL cible                                           | Asset différenciant          |
| --- | -------------------------------------- | ------------- | --------------------------------------------------- | ---------------------------- |
| 9   | planification des effectifs logistique | Info/Decision | `/fr/ressources/planification-effectifs-logistique` | Maturity model + kit atelier |
| 10  | dimensionnement effectifs entrepôt     | Info/Decision | `/fr/ressources/dimensionnement-effectifs-entrepot` | Simulateur gratuit           |
| 11  | calcul besoin en effectifs entrepôt    | Tool          | `/fr/ressources/calcul-besoin-effectifs-entrepot`   | Calculateur FTE + export     |
| 12  | prévision charge de travail entrepôt   | Info          | `/fr/ressources/prevision-charge-travail-entrepot`  | Dataset d’exemple            |
| 13  | capacity planning logistique           | Info          | `/fr/ressources/capacity-planning-logistique`       | Framework revue capacité     |
| 14  | workforce planning multi-sites         | Info/Decision | `/fr/ressources/workforce-planning-multi-sites`     | Playbook multi-sites         |
| 15  | réallocation inter-sites effectifs     | Decision      | `/fr/ressources/reallocation-inter-sites-effectifs` | Matrice de décision          |

### C) Coûts et arbitrages

| #   | Requête cible                               | Intent              | URL cible                                            | Asset différenciant              |
| --- | ------------------------------------------- | ------------------- | ---------------------------------------------------- | -------------------------------- |
| 16  | coût de la sous-couverture                  | Decision            | `/fr/ressources/cout-sous-couverture`                | Calculateur coût de l’inaction   |
| 17  | coût du sous-effectif                       | Info/Decision       | `/fr/ressources/cout-sous-effectif`                  | Tableau de coûts direct/indirect |
| 18  | coût de l’intérim d’urgence                 | Decision            | `/fr/ressources/cout-interim-urgence`                | Simulateur urgence vs anticipé   |
| 19  | coût des heures supplémentaires entreprise  | Info/Decision       | `/fr/ressources/cout-heures-supplementaires`         | Calculateur HS complet           |
| 20  | arbitrage intérim vs heures supplémentaires | Decision            | `/fr/ressources/arbitrage-interim-vs-heures-supp`    | Arbre + comparateur              |
| 21  | coût absentéisme entrepôt                   | Decision            | `/fr/ressources/cout-absenteisme-entrepot`           | Modèle coût absentéisme          |
| 22  | coût turnover logistique                    | Decision            | `/fr/ressources/cout-turnover-logistique`            | Calculateur turnover             |
| 23  | pilotage masse salariale logistique         | Commercial/Decision | `/fr/ressources/pilotage-masse-salariale-logistique` | Template dashboard Ops/DAF       |

### D) Gouvernance et preuve

| #   | Requête cible                             | Intent        | URL cible                                               | Asset différenciant    |
| --- | ----------------------------------------- | ------------- | ------------------------------------------------------- | ---------------------- |
| 24  | coût de l’inaction logistique             | Decision      | `/fr/ressources/cout-inaction-logistique`               | Calculator + guide CFO |
| 25  | playbook actions sous-effectif            | Decision      | `/fr/ressources/playbook-actions-sous-effectif`         | Bibliothèque d’actions |
| 26  | traçabilité des décisions opérationnelles | Decision      | `/fr/ressources/traceabilite-decisions-operationnelles` | Template decision log  |
| 27  | mesure avant après performance logistique | Info/Decision | `/fr/ressources/mesure-avant-apres-performance`         | Toolkit de mesure      |

### E) Requêtes outils concurrentielles

| #   | Requête cible                                | Intent | URL cible                                                    | Asset différenciant                    |
| --- | -------------------------------------------- | ------ | ------------------------------------------------------------ | -------------------------------------- |
| 28  | logiciel planification personnel logistique  | Achat  | `/fr/ressources/logiciel-planification-personnel-logistique` | Checklist d’achat + scoring            |
| 29  | logiciel workforce management WFM logistique | Achat  | `/fr/ressources/wfm-logistique`                              | Matrice WFM vs intelligence couverture |
| 30  | taux de service logistique calcul            | Info   | `/fr/ressources/taux-de-service-logistique`                  | Calculateur taux de service            |

## Principes de production

- Une page = une requête primaire + une promesse claire.
- Chaque page inclut un asset concret (calculateur, template, playbook, comparatif).
- Chaque page relie explicitement:
  - signal early-warning 3-14 jours,
  - facteurs explicatifs,
  - arbitrage économique chiffré,
  - traçabilité des décisions.
- Maillage obligatoire:
  - vers `/fr/ressources`,
  - vers 3-7 ressources associées,
  - vers la page pilote.
