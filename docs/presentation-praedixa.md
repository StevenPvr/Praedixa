# Praedixa — Recherche de co-fondateurs

**Piloter la capacité terrain, pas subir les trous de planning.**

Je cherche 1-2 co-fondateurs pour construire Praedixa, un logiciel B2B qui aide les PME/ETI à anticiper et gérer l'écart entre capacité disponible et charge à tenir sur leurs équipes terrain.

---

## Le problème (et pourquoi personne ne le résout bien)

Chaque semaine, des milliers d'entreprises multi-sites (logistique, industrie, retail, BTP, santé) font face au même problème : **la capacité disponible ne suit pas la charge à tenir**.

Résultat :

- Heures sup en urgence
- Intérim à prix fort
- Service dégradé
- Tensions managériales
- Turnover qui s'accélère

**Les données existent** — planning, activité, absences, turnover — mais elles sont dispersées, mal structurées, impossibles à transformer en décisions chiffrées.

Les outils actuels ? Des dashboards RH qui comptent les absences après coup. De la "prédiction ML" qui ne débouche sur rien d'actionnable. Du conseil à la journée sans livrable concret.

**Personne ne répond à la vraie question : "Est-ce que je vais être sous-couvert la semaine prochaine, combien ça va me coûter, et qu'est-ce que je fais ?"**

---

## Notre approche

Praedixa crée une boucle actionnable :

1. **Construire la base de données** — Prise en charge complète, raffinement continu
2. **Anticiper** — Prévisions de sous-couverture à J+3/J+7/J+14
3. **Comprendre** — Interprétabilité du modèle : identifier les facteurs qui expliquent chaque prévision (saisonnalité, turnover, pics demande…) pour agir sur les causes, pas seulement les symptômes
4. **Décider** — Chiffrer les options (HS, intérim, réallocation, accepter la dégradation)
5. **Prouver** — Mesurer l'impact réel des décisions

Comprendre le **pourquoi** crée un cercle vertueux : les équipes agissent sur les causes racines, les problèmes structurels diminuent, et les prévisions deviennent plus fiables — c'est un levier d'amélioration continue.

**Privacy by design** : conforme RGPD, pas de données individuelles, uniquement agrégé, hébergement France.

---

## Pourquoi maintenant

- **Tension structurelle sur le recrutement** : en 2025, **50,1%** des projets de recrutement sont jugés difficiles (France Travail) et le taux d'emplois vacants dans le privé est de **2,3%** au T3 2025 (Dares).[^bmo2025][^dares_vacants]
- **Absences en hausse (signal macro)** : la dépense d'indemnités journalières pour arrêts maladie atteint **10,2 Md€** en 2023 et accélère depuis 2019 (DREES).[^drees_arrets]
- **Données enfin disponibles** : l'ERP et les outils de gestion structurent enfin planning/activité (43,3% des entreprises de l'UE utilisent un ERP en 2023 ; 86,3% des grandes entreprises).[^eurostat_erp]
- **IA/ML industrialisable** : l'usage de l'IA en entreprise progresse (France : 10% des entreprises en 2024, vs 6% en 2023).[^insee_ai]
- **Marché fragmenté** : WFM/planning et SIRH d'un côté, BI/RH dashboards de l'autre, et du conseil pour faire le lien — peu d'outils "décision + preuve économique" à horizon J+14.

---

## Où on en est

**Ce qui existe :**

- Landing page et contenu marketing
- Pipeline CI/CD prête (checks + déploiement Cloudflare)
- Stack web prête (Next.js, UI partagée, types partagés)

**Objectif immédiat :**
Valider l'idée au-delà des statistiques — trouver **3 entreprises pilotes** prêtes à s'engager dans un partenariat pour co-construire et tester la solution.

**Wedge :** Logistique et opérations multi-sites (entrepôts, transport, 3PL) — impact immédiat, douleur visible, cycle de décision court. Secteur massif : **1 552 700** emplois salariés dans les transports et l'entreposage (France, T1 2025).[^sdes_transport]

---

## Qui je cherche

### Co-fondateur Product / Tech

Tu veux construire un produit qui résout un vrai problème, pas empiler des features. Tu es obsédé par la qualité des données et l'usage terrain.

- Python avancé (Polars, typing strict) ou TypeScript/React moderne
- Capacité à livrer un output clair, pas juste un notebook
- À l'aise avec les outils IA pour accélérer (Claude Code, Codex, Cursor)

### Co-fondateur Business / Ops

Tu sais parler aux Dir. exploitation et DAF. Tu as vu de l'intérieur comment les entreprises gèrent (ou subissent) leurs trous de planning.

- Expérience terrain en exploitation, planning, logistique ou finance
- À l'aise avec la prospection et la vente B2B
- Connaissance des PME/ETI françaises

---

## Format

1. **Échange** (30-45 min) — Se découvrir, valider l'alignement
2. **Trial sprint** (14 jours) — Livrable concret, travail en autonomie, évaluation mutuelle
3. **Formalisation** — Équité + vesting 4 ans, cliff 1 an

---

## Pourquoi rejoindre maintenant

- **Problème économique réel** : le sous-effectif se compense en heures sup (majorées 25% puis 50% par défaut) et/ou intérim — sur quelques centaines d'opérationnels, 1 point d'absentéisme suffit souvent à créer un coût annuel à 5 chiffres.[^hs_majoration]
- **Pas de solution satisfaisante** : le marché est ouvert
- **Socle technique solide** : on ne part pas de zéro
- **Approche sell-first** : validation terrain avant industrialisation
- **Trajectoire venture-scale** : wedge → traction → expansion sectorielle

---

## Contact

**Steven Poivre**
steven.poivre@outlook.com / 06 24 08 20 12

Tu veux voir le code, l'architecture, les specs ? MP ouvert.

---

## Sources (sélection)

[^bmo2025]: France Travail — _Enquête Besoins en main-d'œuvre (BMO) 2025_ (publié le 11/04/2025, consulté le 05/02/2026) : 2,4M d'embauches potentielles ; 50,1% jugés difficiles. https://statistiques.francetravail.org/bmo/bmopub/225146

[^dares_vacants]: Dares — _Les emplois vacants_ (mis à jour le 16/12/2025, consulté le 05/02/2026) : taux d'emplois vacants 2,3% au T3 2025 (privé). https://dares.travail-emploi.gouv.fr/donnees/les-emplois-vacants

[^drees_arrets]: DREES — _Études et Résultats n°1321_ (13/12/2024, consulté le 05/02/2026) : dépense d'indemnités journalières d'arrêts maladie 10,2 Md€ en 2023 ; accélération depuis 2019. https://www.drees.solidarites-sante.gouv.fr/publications-communique-de-presse/etudes-et-resultats/241211_ER_Arrets-Maladie

[^hs_majoration]: Ministère de l'Économie — _Heures supplémentaires : règles de rémunération_ (consulté le 05/02/2026) : majoration 25% (puis 50%) à défaut d'accord. https://economie.gouv.fr/particuliers/heures-supplementaires-salaries-prive

[^eurostat_erp]: Eurostat — _E-business integration, 2023_ (news release 06/02/2024, consulté le 05/02/2026) : 43,3% des entreprises de l'UE utilisent un ERP ; 86,3% des grandes entreprises. https://ec.europa.eu/eurostat/documents/2995521/18404397/4-06022024-AP-EN.pdf

[^insee_ai]: INSEE — _Les entreprises utilisent de plus en plus l'intelligence artificielle en 2024_ (consulté le 05/02/2026) : 10% des entreprises en France utilisent l'IA en 2024 (vs 6% en 2023). https://www.insee.fr/fr/statistiques/8232138

[^sdes_transport]: SDES (Ministère de la Transition écologique) — _Emploi salarié et marché du travail dans les transports au 1er trimestre 2025_ (consulté le 05/02/2026). https://www.statistiques.developpement-durable.gouv.fr/emploi-salarie-et-marche-du-travail-dans-les-transports-au-premier-trimestre-2025
