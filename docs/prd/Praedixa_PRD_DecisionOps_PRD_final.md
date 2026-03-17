| **PRAEDIXA** |
| ------------ |

**PRD PRODUIT**

**Praedixa DecisionOps Platform**

Spécification produit détaillée pour une plateforme souveraine de
fédération de données, d’anticipation, de simulation et d’optimisation
des décisions opérationnelles.

| **Version**   | v1.6                                                        |
| ------------- | ----------------------------------------------------------- |
| **Date**      | 16 mars 2026                                                |
| **Auteur**    | CEO & Lead Product brief consolidé par ChatGPT              |
| **Statut**    | PRD cible + état réel du socle build-ready au 16 mars 2026  |
| **Périmètre** | Core platform + 3 packs métier (Coverage, Flow, Allocation) |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p><strong>Résumé exécutif en une phrase</strong></p>
<p>Praedixa ne doit pas être construit comme une data platform
“générique”.</p>
<p>Praedixa doit être construit comme un système souverain de
DecisionOps qui se branche sur l’existant, fédère les données critiques,
transforme les arbitrages récurrents en Decision Contracts, calcule les
meilleures options, déclenche l’action validée dans les outils déjà en
place et prouve le ROI décision par décision.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

**CE DOCUMENT RÉPOND À TROIS QUESTIONS**

- Qu’est-ce qu’on construit exactement pour être différenciant sur le
  marché français ?

- Qu’est-ce qu’on ne construit pas, même si la tentation est forte ?

- Dans quel ordre faut-il le construire pour sortir une V1 crédible et
  vendable ?

# **Sommaire**

1.  1\. Résumé exécutif

2.  2\. Cadrage stratégique

3.  3\. Utilisateurs, personas et jobs-to-be-done

4.  4\. Périmètre produit et séquencement

5.  5\. Architecture produit et principes de build

6.  6\. Spécification détaillée par module

7.  7\. Modèle de données, contrats de décision et événements

8.  8\. UX, écrans, workflows et états métier

9.  9\. IA, optimisation, explicabilité et garde-fous

10. 10\. Sécurité, souveraineté, conformité et exploitation

11. 11\. API, intégrations, observabilité et tests

12. 12\. Roadmap de développement, équipe et plan 24 semaines

13. 13\. Risques, arbitrages structurants et critères de succès

14. Annexes : exemples de packs, schémas JSON, matrice de
    différenciation, références

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p><strong>Lecture recommandée pour le CEO/Lead Product</strong></p>
<p>Lire d’abord les sections 1, 2, 4 et 12 pour comprendre la promesse,
le scope V1 et le plan de build.</p>
<p>Lire ensuite les sections 5 à 9 pour valider la structure du produit
et les modules à implémenter.</p>
<p>Garder les annexes comme matière pour le backlog, les démos design
partner et l’alignement avec la tech.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# **1. Résumé exécutif**

La meilleure version de Praedixa n’est ni un dashboard de plus, ni un
entrepôt de données de plus, ni un copilote IA générique. Le produit
doit être conçu comme une plateforme de DecisionOps souveraine pour les
entreprises françaises et européennes qui doivent arbitrer, plusieurs
fois par jour ou par semaine, entre coût, service, risque, capacité et
délai.

Le wedge réaliste et différenciant consiste à fédérer les données qui
comptent réellement pour une famille de décisions, à rendre ces
décisions modélisables et gouvernables, puis à exécuter les actions dans
les systèmes déjà en place. Le cœur du moat produit n’est pas le
stockage. Le cœur du moat est la combinaison Decision Graph + Decision
Contracts + Action Mesh + Decision Ledger + ROI finance-grade.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p><strong>Décision de cadrage</strong></p>
<p>Nom de catégorie recommandé : DecisionOps Platform.</p>
<p>Promesse produit : fédérer les données critiques sur une
infrastructure souveraine, anticiper les besoins, simuler les
arbitrages, recommander l’option optimale, orchestrer l’action validée
et prouver le ROI.</p>
<p>Scope V1 recommandé : core platform + pack Coverage GA + pack Flow
bêta + pack Allocation design-partner.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## **1.1 Le problème à résoudre**

- Les entreprises multi-sites ont déjà des systèmes de record: CRM, ERP,
  WFM, TMS, WMS, POS, finance, tableurs. Le problème n’est pas l’absence
  de données. Le problème est l’absence de contexte décisionnel commun.

- Les arbitrages critiques restent éclatés entre équipes, systèmes et
  horizons temporels. On voit des signaux, mais on ne sait pas quel
  levier actionner, à quel coût, avec quel niveau de risque et avec
  quelle preuve d’impact.

- Les couches BI et data rendent visibles les données. Elles
  n’industrialent pas la qualité des décisions. Les couches métier
  exécutent des workflows. Elles n’arbitrent pas plusieurs options sous
  contraintes multi-fonctions.

- Sur le marché français, la souveraineté, l’explicabilité, la
  supervision humaine et la capacité à prouver le ROI sont des prérequis
  commerciaux, pas des bonus.

## **1.2 Le produit en une architecture**

| **Couche**            | **Rôle**                                                                                            | **Livrable V1**                                                |
| --------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Connect & Federation  | Se brancher aux sources existantes, synchroniser, valider, harmoniser, suivre fraîcheur et lineage. | Framework de connecteurs + mapping studio + monitoring de sync |
| Decision Graph        | Représenter les objets métier, relations, métriques et contraintes utiles à la décision.            | Modèle canonique multi-pack + API de requête + versioning      |
| Decision Contracts    | Formaliser objectifs, leviers, contraintes, seuils d’approbation et formule ROI.                    | Contrats versionnés + bibliothèque de templates                |
| Signal & Optimization | Prévoir, détecter les écarts, générer scénarios, optimiser et expliquer.                            | Forecasts quantiles + solver + compare scenarios               |
| Action Mesh           | Déclencher l’action validée dans les systèmes cibles.                                               | Connecteurs write-back + file d’actions + retries              |
| Decision Ledger       | Tracer baseline, recommandation, validation, exécution, résultat et ROI.                            | Journal immuable + cockpit ROI + exports                       |

## **1.3 Ce que Praedixa ne doit pas devenir**

- Un data lake ou data warehouse “universel” qui cherche à absorber
  l’intégralité du patrimoine data client avant de créer de la valeur.

- Un outil de planning, de GTA, de TMS, de WMS ou d’ERP remplaçant les
  systèmes transactionnels déjà en place.

- Une plateforme low-code généraliste de workflows internes.

- Un copilote conversationnel qui produit de jolies phrases mais pas de
  décisions actionnables et auditées.

- Une machine de scoring individuel opaque sur les salariés. Par défaut,
  Praedixa doit travailler au niveau équipe, site, flux, capacité ou
  stock.

## **1.4 Critères de succès du produit**

| **Horizon** | **Succès visé**                                                                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 90 jours    | Connecter 3 systèmes, publier 1 contrat de décision, générer des recommandations utilisables, tracer chaque décision de bout en bout.                                                |
| 180 jours   | Mettre 2 packs métier en production pilotée, déclencher des actions dans les outils existants, produire un premier ROI mensuel défendable devant COO + DAF.                          |
| 12 mois     | Standardiser une bibliothèque de contrats réutilisables par verticale, réduire le temps de déploiement par nouveau compte, rendre la gouvernance et la preuve ROI industrialisables. |

# **2. Cadrage stratégique**

## **2.1 Catégorie produit**

Praedixa doit se positionner comme une plateforme de DecisionOps
souveraine. La catégorie “DecisionOps” signifie que le produit opère la
boucle complète entre données, règles métier, prévision, simulation,
décision, action et preuve d’impact.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p><strong>Formule de positionnement recommandée</strong></p>
<p>Praedixa est la plateforme française de DecisionOps qui se branche
sur vos systèmes existants, fédère vos données critiques sur une
infrastructure souveraine, anticipe les besoins, calcule les meilleurs
arbitrages, orchestre l’action validée et prouve le ROI décision par
décision.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## **2.2 ICP et segment d’attaque**

| **Critère**            | **Cible prioritaire**                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| Type d’organisation    | ETI et grands réseaux multi-sites, ou business units complexes de grands groupes           |
| Taille opérationnelle  | 20 à 500 sites / agences / ateliers / entrepôts / magasins / hubs                          |
| Systèmes déjà en place | Au moins 3 systèmes distincts impliqués dans la décision: CRM/ERP/WFM/TMS/WMS/POS/Finance  |
| Pain structurel        | Arbitrages fréquents entre coût, service, délai, capacité ou risque                        |
| Sponsor                | COO / directeur réseau / directeur supply / DAF avec relais DSI ou data                    |
| Verticales de départ   | Retail, logistique, transport, réseaux de service, automobile après-vente, HCR multi-sites |

## **2.3 Wedge de départ**

- Ne pas démarrer par “toutes les décisions de l’entreprise”.

- Démarrer par trois familles de décisions répétables, à ROI rapide et
  données disponibles : Coverage, Flow, Allocation.

- Chaque pack doit réutiliser le même cœur technologique, mais fournir
  un vocabulaire métier, des templates, des KPIs, des contraintes et des
  actions spécifiques.

| **Pack**   | **Décision visée**                                                  | **Verticales naturelles**                              | **Statut recommandé** |
| ---------- | ------------------------------------------------------------------- | ------------------------------------------------------ | --------------------- |
| Coverage   | Couverture de besoin, staffing, capacité équipe, service risk       | Retail, HCR, réseau de service, automobile après-vente | GA V1                 |
| Flow       | Flux, dispatch, capacité transport, priorisation de backlog, délais | Logistique, transport, field service                   | Beta V1               |
| Allocation | Réappro, transfert, affectation de stock et capacité réseau         | Retail, supply chain, commerce omnicanal               | Design-partner V1.5   |

## **2.4 Différenciation visée**

| **Capacité**                                             | **Data platform** | **BI / analytics** | **WFM / planning**     | **Praedixa cible**  |
| -------------------------------------------------------- | ----------------- | ------------------ | ---------------------- | ------------------- |
| Relier les sources existantes                            | Oui               | Partiel            | Partiel                | Oui                 |
| Créer un contexte métier décisionnel                     | Partiel           | Partiel            | Rare                   | Oui, nativement     |
| Encoder les arbitrages comme contrats                    | Rare              | Non                | Non                    | Oui, cœur produit   |
| Comparer des scénarios sous contraintes                  | Parfois           | Partiel            | Parfois                | Oui, cœur produit   |
| Déclencher une action dans les outils opérationnels      | Rare              | Rare               | Oui mais métier unique | Oui, cross-systèmes |
| Journal de décision + contre-factuel + ROI finance-grade | Rare              | Rare               | Rare                   | Oui, cœur produit   |
| Souveraineté française / européenne by design            | Variable          | Variable           | Variable               | Oui                 |

## **2.5 Principes produit non négociables**

- Brancher, ne pas remplacer. Praedixa vient au-dessus des systèmes de
  record et ne cherche pas à les dupliquer.

- Décider, pas seulement analyser. Toute vue doit déboucher sur au moins
  une action ou une approbation possible.

- Humain dans la boucle par défaut. Toute action à impact opérationnel
  ou humain significatif doit être validable et traçable.

- Agrégé d’abord. Site, équipe, flux, stock, capacité, tournée avant
  toute logique fine au niveau individuel.

- Souverain by design. Hébergement, logs, gestion des secrets,
  politiques d’accès et résidence des données doivent être compatibles
  avec les attentes du marché français.

- ROI finance-grade. Toute recommandation importante doit être reliée à
  une hypothèse explicite et à une mesure d’impact ex post.

- Packaged verticality. Le cœur est horizontal, l’adoption se fait par
  packs métier immédiatement compréhensibles.

## **2.6 Build versus buy**

| **Composant**                | **Recommandation** | **Justification**                                                                     |
| ---------------------------- | ------------------ | ------------------------------------------------------------------------------------- |
| Long-tail connectors         | Buy/adapt          | Utiliser un framework type Airbyte/ELT plutôt que coder 50 connecteurs propriétaires. |
| Workflow engine              | Buy/adapt          | Temporal ou équivalent pour approvals, retries, timeouts et saga patterns.            |
| Optimization solver          | Buy/open source    | OR-Tools / CP-SAT / Pyomo pour accélérer le time-to-market.                           |
| Identity & access            | Buy/adapt          | Keycloak ou solution self-hosted équivalente pour RBAC, SSO, OIDC.                    |
| Observabilité                | Buy/open source    | OpenTelemetry + Grafana/Loki/Tempo pour logs, métriques et traces.                    |
| Decision Graph               | Build              | Cœur de différenciation métier.                                                       |
| Decision Contracts           | Build              | Cœur de différenciation et de packaging par verticale.                                |
| Action Mesh                  | Build              | Cœur de la boucle fermée entre décision et exécution.                                 |
| Decision Ledger + ROI engine | Build              | Cœur de la preuve de valeur et du discours DAF/COO.                                   |
| Pack templates               | Build              | Cœur du wedge commercial et de la répétabilité du déploiement.                        |

# **3. Utilisateurs, personas et jobs-to-be-done**

Le produit doit être conçu pour des utilisateurs qui n’ont ni le temps
ni l’envie de “faire de la data”. Ils veulent sécuriser une décision,
comprendre les options, faire valider la bonne action et en mesurer
l’impact. La surface produit doit donc séparer clairement:
administration, design des contrats, pilotage opérationnel, validation,
revue finance et audit.

| **Persona**                   | **Objectif**                                            | **Fréquence**          | **Ce que Praedixa doit lui donner**                                                      |
| ----------------------------- | ------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------- |
| COO / Directeur réseau        | Arbitrer coût, service, risque sur plusieurs sites      | Quotidienne / hebdo    | Une vue priorisée des tensions, des scénarios comparables et un suivi d’impact consolidé |
| Directeur supply / transport  | Réduire retards, coût variable et saturation            | Quotidienne / intraday | Des arbitrages de capacité et de flux exécutables dans les outils du terrain             |
| DAF / FP&A                    | Valider les hypothèses économiques, suivre le ROI réel  | Hebdo / mensuel        | Une lecture baseline vs recommandé vs réel, avec hypothèses et audit trail               |
| Ops analyst / PMO             | Configurer le périmètre, challenger les recommandations | Quotidienne            | Des contrats réutilisables, des paramètres testables et une qualité de données visible   |
| Manager local / chef de site  | Valider ou refuser une action selon le contexte terrain | Quotidienne            | Une explication claire, un seuil d’impact et une action simple à approuver ou rejeter    |
| DSI / data / admin            | Assurer intégration, sécurité, conformité, exploitation | Hebdo                  | Des connecteurs robustes, des logs, du RBAC et des politiques de gouvernance             |
| Auditeur interne / conformité | Comprendre qui a décidé quoi, sur quelle base           | Ponctuelle             | Un ledger immuable, des versions de contrats et des preuves d’explicabilité              |

## **3.1 Jobs-to-be-done prioritaires**

| **JTBD**                                                                                                                    | **Utilisateur**                | **Déclencheur**                       | **Résultat attendu**                                                  |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------- | --------------------------------------------------------------------- |
| Quand un site ou un flux risque de décrocher, je veux savoir quel levier actionner avant que le problème ne frappe les KPI. | COO / directeur réseau         | Signal de sous-capacité ou surcoût    | Une recommandation actionnable avec risque, coût et service expliqués |
| Quand la demande future diverge du plan, je veux comparer 2 à 5 scénarios réalistes sous contraintes avant de valider.      | Ops analyst / directeur supply | Forecast gap / backlog / promo / aléa | Un comparatif scénario avec score, contraintes bloquantes et impacts  |
| Quand une décision est prise, je veux qu’elle soit poussée dans les bons outils sans ressaisie.                             | Manager / planner              | Action approuvée                      | Création automatique de tâche, demande, ordre ou notification         |
| Quand on me demande si le produit crée de la valeur, je veux une réponse chiffrée et auditable.                             | DAF / COO                      | Revue mensuelle                       | Un ledger consolidé et un rapport ROI par contrat, site et période    |

## **3.2 Rôles et permissions recommandés**

| **Rôle**          | **Peut faire**                                                               | **Ne peut pas faire**                                              |
| ----------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Org Admin         | Créer workspaces, gérer connecteurs, rôles, politiques, secrets              | Approuver seul des décisions au nom d’un métier sans délégation    |
| Decision Designer | Créer et versionner des contracts, configurer objectifs, contraintes, seuils | Changer la résidence des données, les secrets ou le RBAC global    |
| Operator          | Voir signaux, lancer scénarios, comparer options                             | Publier un contrat sans circuit d’approbation                      |
| Approver          | Approuver, rejeter, annoter les recommandations selon seuils                 | Modifier silencieusement le moteur ou les contraintes sans version |
| Finance Reviewer  | Valider hypothèses ROI, reclasser coûts/gains, commenter                     | Déclencher des actions opérationnelles si non autorisé             |
| Auditor           | Consulter ledger, logs, versions, justifications                             | Modifier ou supprimer les traces                                   |
| Viewer            | Consulter dashboards et exports                                              | Créer contrats, actions ou politiques                              |

# **4. Périmètre produit et séquencement**

## **4.1 Scope V1**

- Core platform multi-tenant avec authentification, RBAC, audit log,
  workspaces et résidence France.

- Framework de connecteurs avec au moins 6 connecteurs standards
  exploitables: Salesforce, fichier/SFTP, base SQL, API REST générique,
  WFM export/import, ERP export/import.

- Mapping studio pour relier les champs source au modèle canonique.

- Decision Graph V1 couvrant les objets communs + Coverage + Flow.

- Decision Contracts versionnés avec template builder et publication
  contrôlée.

- Signal Engine V1: forecasting batch quotidien + détection d’écarts et
  alertes.

- Scenario Engine V1: baseline + 2 à 5 options + explication des
  contraintes.

- Approval workflow et Action Mesh avec au moins 4 destinations
  write-back.

- Decision Ledger et cockpit ROI mensuel.

- Coverage Pack en GA sur un design partner.

- Flow Pack en bêta sur un design partner.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p><strong>Définition de done V1</strong></p>
<p>Un client pilote doit pouvoir connecter ses sources, mapper ses
entités, publier un contrat Coverage ou Flow, recevoir des
recommandations, approuver une action, envoyer cette action dans ses
outils et revoir un ROI mensuel défendable.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## **4.2 Hors périmètre V1**

- Absorption complète de données non structurées, documents, e-mails et
  médias comme brique cœur du produit.

- Data catalog enterprise complet ou MDM généraliste.

- Planification fine de shifts en remplacement d’un WFM.

- Optimisation autonome sans validation humaine sur des décisions à
  impact humain élevé.

- Marketplace de centaines de connecteurs custom maintenus en direct par
  Praedixa.

- Moteur de facturation, procurement, ERP, TMS ou WMS complet.

- No-code app builder universel.

- Scoring individuel de salariés, recrutement ou promotion.

## **4.3 Scope V1.5 puis V2**

| **Release** | **Ajouts recommandés**                                                                                                                                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1.5        | Allocation Pack bêta, API publique, overrides avancés, assistant NLQ sur Decision Graph, règles temporelles avancées, exports finance PDF/CSV enrichis.                                                              |
| V2          | Self-service pack designer, catalogue de templates par verticale, triggers temps quasi réel, causal ROI avancé, multi-région UE, customer-managed keys, sandbox dédiée par client, library de policies sectorielles. |

## **4.4 Séquencement logique**

15. 1\. Construire le squelette de confiance: identité, RBAC, audit,
    tenant isolation, secrets, observabilité.

16. 2\. Construire la fédération minimale de données: connecteurs, sync,
    validation, mapping, fraîcheur.

17. 3\. Construire le modèle canonique et le Decision Graph V1.

18. 4\. Construire le Contract DSL et son exécution.

19. 5\. Construire le moteur de signaux, scénarios et optimisation.

20. 6\. Construire approbation + action mesh + ledger.

21. 7\. Emballer le tout dans Coverage Pack, puis Flow Pack.

22. 8\. Ajouter seulement ensuite la couche conversationnelle et
    l’expansion pack.

## **4.5 Build order pour le fondateur**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p><strong>Si tu ne peux financer que 5 briques en
premier</strong></p>
<p>1. Decision Contract schema + versioning</p>
<p>2. Decision Graph metadata service</p>
<p>3. Scenario/solver service</p>
<p>4. Action Mesh</p>
<p>5. Decision Ledger</p>
<p>Le reste peut être plus simple au départ. Ces cinq briques portent
l’identité du produit.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## **4.6 État réel du socle au 16 mars 2026**

Ce PRD reste la cible produit. En parallèle, le repo porte désormais un
socle réel qu’il faut distinguer clairement de la vision complète pour
éviter de sur-vendre l’existant.

| **Brique**                            | **État réel dans le repo**                                                                                                                                                                                                                                                      | **Lecture produit correcte**                                                                                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Webapp auth et shell de prod          | Auth OIDC webapp durcie pour la prod: origine publique explicite, pas de fallback implicite en production, tests et docs à jour. Le build `app-webapp`, l’image `linux/amd64` standalone et le smoke conteneurisé `/login` sont validés.                                        | Le shell webapp est crédible pour un vrai usage opérateur, mais la boucle DecisionOps complète n’est pas encore fermée.                                         |
| Control plane trust                   | Le repo a déjà des guards role-based, du scoping tenant/site, une MFA admin bloquante, une politique de break-glass et une fondation append-only typée; mais le nettoyage demo/legacy complet, l’audit append-only étendu et la fermeture des accès implicites restent ouverts. | La confiance du control plane progresse nettement, mais le `trust gate` n’est pas encore assez fermé pour considérer tous les chemins critiques comme durcis.   |
| Operational decisions                 | `GET/POST /api/v1/operational-decisions` et `override-stats` sont branchés sur une persistance réelle.                                                                                                                                                                          | Les décisions coverage existantes ne sont plus des faux succès frontend.                                                                                        |
| Live scenarios / decision workspace   | `GET /live/scenarios/alert/:alertId` et `GET /live/decision-workspace/:alertId` lisent déjà `coverage_alerts` + `scenario_options` persistants.                                                                                                                                 | Le produit sait déjà relire une vérité scenario coverage existante, mais la génération persistante, versionnée et explicable reste encore à fermer.             |
| Approval / action / ledger UI         | L’approval inbox admin est actionnable (`approve/reject`); `action dispatch detail` est désormais actionnable sur le lifecycle et le fallback humain avec garde-fous de permissions; `ledger detail` est branché sur une persistance réelle.                                    | La boucle est plus opérable côté validation et exploitation, mais la matrice d’approbation configurable et la fermeture finance-grade restent encore ouvertes.  |
| Decision Contracts                    | Un runtime persistant `DecisionContract` existe avec versioning, transition, fork, rollback, audit append-only, templates de pack et routes admin org-scoped.                                                                                                                   | Le contrat devient une vraie primitive gouvernée du produit; restent ouverts les hooks de policy globaux et la compatibilité transverse complète.               |
| Decision Graph / scenario foundations | Les fondations typées `DecisionGraph`, les helpers de compatibilité et les surfaces read-only existent déjà, mais pas encore le vrai graph sémantique versionné ni le runtime scenario complet associé.                                                                         | Le socle logiciel existe, mais le noyau `graph + scenario runtime` reste le principal trou fonctionnel du PRD V1.                                               |
| Mapping Studio / connecteurs          | Les fondations typées existent; replay/backfill est désormais opérable via surface admin/API; mais le mapping studio complet, la quarantaine et la vue dataset health unifiée ne sont pas encore fermés.                                                                        | L’activation connecteur progresse vers un vrai self-service, mais n’est pas encore suffisamment fermée pour promettre un onboarding sans intervention dev.      |
| Data plane Gold / medallion           | Le Gold live et le pipeline medallion rejettent fail-close les datasets et colonnes runtime legacy `mock_*`. La résolution client/site Gold est stricte: pas d’alias demo, pas d’heuristique d’overlap, pas de site hors allowlist.                                             | Le socle data-plane est plus crédible pour une boucle de simulation quasi-prod; il faut encore finir le pilotage du mapping, de la quarantaine et de la health. |
| Action Mesh runtime                   | Le lifecycle principal `dry-run -> dispatch -> acknowledged -> failed -> retried -> canceled` est posé et persisté, avec permissions de write-back, fallback humain explicite et premiers garde-fous d’idempotence.                                                             | Le write-back DecisionOps n’est plus théorique, mais il reste à fermer la sandbox, les actions composites et la prévention des doublons de bout en bout.        |
| Ledger finance-grade                  | Les fondations `baseline / recommended / actual`, la méthode contrefactuelle, la validation finance et le recalcul versionné sont déjà présentes; `ledger detail` est persistant et le Gold live fail-close sans inputs BAU / optimized valides.                                | Le ROI finance-grade progresse nettement, mais les exports mensuels, le drill-down KPI et les tests de cohérence restent à fermer.                              |

Conséquence de cadrage: Praedixa dispose maintenant d’un socle
DecisionOps réel, de contrats gouvernés persistants et d’un write-back
plus crédible, mais la V1 PRD n’est pas encore atteinte tant que le
`DecisionGraph` sémantique versionné, le runtime scenario persistant et
explicable, le mapping studio opérable et la clôture ledger
finance-grade ne sont pas fermés.

## **4.7 Lecture du PRD et artefacts vivants au 16 mars 2026**

| **Artefact**                                              | **Rôle**                                                               | **Quand le lire**                                                                                                             |
| --------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `docs/prd/TODO.md`                                        | Checklist structurelle build-ready                                     | Quand il faut savoir ce qui reste ouvert et ce qui est vraiment prouvé dans le repo                                           |
| `docs/prd/coverage-v1-thin-slice-spec.md`                 | Boucle Coverage V1 canonique                                           | Quand il faut lire le produit comme une seule tranche end-to-end                                                              |
| `docs/prd/connector-activation-and-dataset-trust-spec.md` | Activation connecteur + dataset trust                                  | Quand le sujet touche onboarding, mapping, replay, quarantaine ou freshness                                                   |
| `docs/prd/decision-contract-governed-publish-spec.md`     | Lifecycle et gouvernance du contrat                                    | Quand le sujet touche publish, SoD, rollback, permissions et lien vers approval/action/ledger                                 |
| `docs/prd/decision-graph-and-scenario-runtime-spec.md`    | Noyau `DecisionGraph` + runtime scenario                               | Quand le sujet touche semantic query API, generation scenario, explicabilite ou compatibilite transverse                      |
| `docs/prd/decision-ledger-and-roi-proof-spec.md`          | Ledger finance-grade et preuve ROI                                     | Quand le sujet touche source de verite economique, revisions, drill-down, exports ou frontiere avec les proof packs           |
| `docs/prd/control-plane-trust-gate-spec.md`               | Trust gate control plane                                               | Quand le sujet touche demo/legacy cleanup, auth/RBAC/tenant safety, audit append-only, break-glass ou support least-privilege |
| `docs/prd/ux-and-e2e-trust-paths-spec.md`                 | Shells et parcours critiques                                           | Quand le sujet touche page models, etats degrades, fetch/retry patterns, neutralite multi-pack ou E2E critiques               |
| `docs/prd/approval-and-action-mesh-governance-spec.md`    | Gouvernance d'execution                                                | Quand le sujet touche matrice d'approbation, justification structuree, SoD critique, idempotence, composites ou sandbox       |
| `docs/prd/decisionops-operating-loop-spec.md`             | Runtime quotidien `signal -> compare -> approve -> dispatch -> ledger` | Quand le sujet touche UX operationnelle, etats degrades ou preuves E2E critiques                                              |
| `docs/prd/build-release-sre-readiness-spec.md`            | Merge/release/SRE                                                      | Quand le sujet touche CI, rollback, restore, observabilite ou exit gate                                                       |
| `docs/prd/decisionops-v1-execution-backbone.md`           | Ordre de fermeture                                                     | Quand il faut prioriser les streams avant de creer du backlog                                                                 |
| `docs/prd/matrice-verification-parcours-confiance.md`     | Preuves merge/release                                                  | Quand il faut lier une exigence produit a une evidence de test, smoke ou observabilite                                        |

# **5. Architecture produit et principes de build**

L’architecture recommandée n’est pas un zoo de microservices prématurés.
Praedixa doit être développé comme un modular monolith ou un monorepo
modulaire avec quelques workers spécialisés, de manière à accélérer le
build, limiter la dette d’intégration et garder une sémantique
cohérente. Les frontières de services doivent être posées dès le début,
mais l’exploitation peut rester simple jusqu’à l’obtention du
product-market fit.

## **5.1 Architecture logique**

| **Couche**        | **Services principaux**                                                                | **Notes de build**                                                         |
| ----------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Experience        | Web app, notification center, approval inbox, ROI cockpit                              | Front-end unique, navigation par rôle, priorité à la clarté opérationnelle |
| Control plane     | Auth, RBAC, tenant config, secrets, audit, policy admin                                | Brique de confiance à livrer avant toute write-back action                 |
| Decision plane    | Contract engine, signal engine, scenario engine, solver, explainability                | Cœur métier; versionner explicitement les algorithmes et paramètres        |
| Data plane        | Connector gateway, sync jobs, mappings, raw snapshots, canonical views, Decision Graph | Séparer données brutes, tables harmonisées et sémantique métier            |
| Execution plane   | Approval workflow, Action Mesh, dispatch, retries, acknowledgments                     | Tout write-back passe par une file et un journal d’exécution               |
| Measurement plane | Ledger, KPI snapshots, baseline/counterfactual, ROI engine                             | Indispensable pour fermer la boucle et vendre au DAF                       |
| Platform ops      | Monitoring, traces, alerting, admin tools, backups                                     | Traiter l’exploitation comme un produit dès le pilote                      |

## **5.2 Recommandation de stack technique**

| **Domaine**             | **Stack recommandée**                        | **Pourquoi**                                                                                                                                 |
| ----------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Front-end               | Next.js / React + TypeScript                 | Vitesse de build, écosystème riche, UI modulaire                                                                                             |
| API / control plane     | TypeScript + Node.js                         | Aligne webapps, BFF, auth, APIs online, surfaces admin et services HTTP connecteurs dans le même runtime                                     |
| Data / ML / workers     | Python                                       | Conserve la vélocité sur ingestion, medallion, forecasting, optimisation et workloads data/ML                                                |
| Workflow orchestration  | Temporal ou équivalent                       | Cible toujours valable pour approvals, retries, timeouts, sagas et idempotence, mais le repo n’est pas encore branché dessus de bout en bout |
| Metadata / transactions | PostgreSQL                                   | Robuste pour contrats, tenants, audit, états métier                                                                                          |
| Analytics & time-series | ClickHouse (ou Postgres au tout début)       | Rapidité sur événements, KPIs, logs et snapshots                                                                                             |
| Raw storage             | Scaleway Object Storage                      | Historique brut, snapshots, exports et replay                                                                                                |
| Cache / queue           | Redis + Temporal queues                      | Locks, job state, caching court terme                                                                                                        |
| Optimization            | OR-Tools / CP-SAT + heuristiques Python      | Très bon compromis entre puissance et time-to-market                                                                                         |
| Forecasting             | StatsForecast / Prophet / LightGBM selon cas | Commencer simple et mesurable avant toute sophistication                                                                                     |
| Identity                | Keycloak self-hosted ou équivalent           | SSO, OIDC, SCIM, RBAC sans dépendance SaaS US                                                                                                |
| Observabilité           | OpenTelemetry + Grafana + Loki/Tempo         | Logs, traces, métriques, drill-down par tenant                                                                                               |

## **5.3 Structure de code recommandée**

**MONOREPO CIBLE**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th>/apps<br />
/web<br />
/admin<br />
/services<br />
/api<br />
/worker-sync<br />
/worker-scenario<br />
/worker-action<br />
/packages<br />
/decision-contracts-sdk<br />
/decision-graph-model<br />
/policy-engine<br />
/ui-kit<br />
/events-schema<br />
/infra<br />
/terraform<br />
/k8s-or-deploy<br />
/docs<br />
/runbooks<br />
/api-spec<br />
/playbooks</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

**Implémentation actuelle du monorepo**

Le repo réel suit déjà cette logique avec une séparation explicite entre
`app-webapp`, `app-admin`, `app-api-ts`, `app-api`,
`app-connectors`, `packages/shared-types` et `packages/ui`. Le travail
à venir consiste moins à réécrire la structure qu’à fermer les briques
produit encore ouvertes au-dessus de ce socle.

## **5.4 SLO et enveloppes de performance V1**

| **Dimension**                     | **Cible V1**                                                    |
| --------------------------------- | --------------------------------------------------------------- |
| Disponibilité applicative         | 99,5 % sur pilote, hors fenêtres de maintenance planifiées      |
| Temps de rendu UI                 | \< 2 s pour les vues liste; \< 5 s pour les vues cockpit riches |
| Temps de calcul scénario standard | p95 \< 30 s                                                     |
| Temps d’ack d’action write-back   | p95 \< 10 s après approbation                                   |
| Détection de sync cassée          | \< 5 min après échec critique                                   |
| RPO / RTO                         | RPO \< 1 h ; RTO \< 4 h au pilote                               |
| Retention audit log               | 24 mois minimum, configurable                                   |

## **5.5 Résidence, tenancy et sécurité logique**

- Région France par défaut pour l’hébergement des clients français.

- Tenant isolation logique stricte dès V1; single-tenant optionnelle
  pour comptes sensibles à partir de V1.5.

- Chiffrement des données au repos et en transit; rotation des secrets
  et journalisation de tout accès privilégié.

- Pas de partage implicite de modèles ou de données entre clients.

- Séparation explicite entre données brutes, vues harmonisées, features
  et traces d’audit.

# **6. Spécification détaillée par module**

## **6.1 Module Connect & Data Federation**

Objectif: connecter les systèmes existants, synchroniser les données
utiles à une décision, harmoniser les champs sur un modèle canonique et
rendre visible la qualité de données. Ce module n’a pas vocation à être
un ETL universel. Il doit être excellent sur la connexion rapide aux
sources qui comptent pour un pack donné.

**WORKFLOW CIBLE**

23. L’admin choisit une source ou un type de connecteur.

24. Praedixa gère l’authentification, la sélection d’objets ou tables et
    la stratégie de sync.

25. Le mapping studio propose un pré-mapping vers le modèle canonique du
    pack.

26. L’admin valide les champs, clés, règles de fraîcheur et règles de
    validation.

27. Le système exécute une première sync, affiche les erreurs et crée
    les vues harmonisées.

**EXIGENCES FONCTIONNELLES**

**FR-CON-001** _(Must)_ **Registry de connecteurs standards**

> Le système doit fournir un registry de connecteurs versionnés avec au
> minimum: API REST générique, base SQL, fichiers CSV/XLSX/SFTP,
> Salesforce, exports WFM, exports ERP, webhook entrant.
>
> **Critère d’acceptation:** Un admin peut créer un connecteur sans
> intervention dev sur ces familles standards.

**FR-CON-002** _(Must)_ **Sync incrémentale et full refresh**

> Chaque connecteur doit supporter une stratégie de sync initiale et une
> stratégie de sync récurrente. Si le delta n’est pas possible, le full
> refresh doit être encadré et monitoré.
>
> **Critère d’acceptation:** Un connecteur expose sa stratégie, sa
> fréquence et sa dernière sync réussie.

**FR-CON-003** _(Must)_ **Validation et quarantaines de records**

> Les enregistrements invalides doivent être isolés dans une file de
> quarantaine avec motif d’erreur, sans bloquer tout le pipeline si la
> politique le permet.
>
> **Critère d’acceptation:** L’admin voit le nombre de records rejetés,
> les causes et peut relancer après correction.

**FR-CON-004** _(Must)_ **Mapping studio**

> Le produit doit proposer une UI de mapping entre champs source et
> modèle canonique, avec suggestions automatiques, fonctions de
> transformation simples et tests d’aperçu.
>
> **Critère d’acceptation:** Un opérateur peut valider un mapping sans
> écrire de code pour les cas standards.

**FR-CON-005** _(Must)_ **Fraîcheur, lineage et health status**

> Chaque dataset harmonisé doit afficher fraîcheur, source, job
> d’origine, volume, taux d’erreur et last successful run.
>
> **Critère d’acceptation:** Un manager ou admin peut savoir
> immédiatement si une recommandation s’appuie sur des données à jour.

**FR-CON-006** _(Must)_ **Scopes de résidence et séparation des
données**

> Le module doit appliquer la résidence des données définie par tenant
> et séparer données brutes, données harmonisées et métadonnées de
> configuration.
>
> **Critère d’acceptation:** Aucune donnée d’un tenant n’est accessible
> ou visible depuis un autre tenant.

**FR-CON-007** _(Should)_ **Assistants de mapping non bloquants**

> Un assistant IA peut suggérer des correspondances de champs, des
> unités et des clés, mais ne doit jamais publier un mapping sans
> validation humaine.
>
> **Critère d’acceptation:** Le mapping suggéré est traçable, modifiable
> et rejetable.

**FR-CON-008** _(Should)_ **Replay et backfill**

> Le produit doit permettre de rejouer une sync ou de backfiller une
> fenêtre historique sans recréer manuellement tout le connecteur.
>
> **Critère d’acceptation:** Un admin peut recalculer une période de
> données après incident ou ajout de source.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p><strong>Décision de build</strong></p>
<p>Ne pas coder un connecteur propriétaire pour chaque nouveau
client.</p>
<p>Construire un framework de connecteurs et un mapping studio;
s’appuyer sur des briques open source pour le long tail.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## **6.2 Decision Graph**

Objectif: transformer des tables hétérogènes en objets métier reliés,
exploitables par les scénarios, les politiques, l’UI et le ledger. Le
Decision Graph n’est pas un simple schéma de base de données. C’est la
couche sémantique qui rend la décision calculable.

**FR-GRA-001** _(Must)_ **Modèle canonique versionné**

> Le système doit fournir un modèle canonique versionné couvrant les
> entités communes et pack-specific, avec compatibilité ascendante quand
> possible.
>
> **Critère d’acceptation:** Chaque contrat référence explicitement une
> version de modèle.

**FR-GRA-002** _(Must)_ **Objets, relations et métriques**

> Le graph doit représenter entités, relations, métriques calculées,
> dimensions et horizons temporels. Les métriques doivent être
> recalculables et auditables.
>
> **Critère d’acceptation:** Une recommandation peut être expliquée par
> les objets et métriques qui la fondent.

**FR-GRA-003** _(Must)_ **Scope multi-granularité**

> Le graph doit supporter au minimum les granularités organisation,
> site, équipe, flux, tournée, commande agrégée, stock node et période.
>
> **Critère d’acceptation:** Un même contrat peut lire des métriques
> agrégées au site et des contraintes au niveau équipe ou tournée.

**FR-GRA-004** _(Must)_ **Entity resolution contrôlée**

> Le système doit réconcilier des identifiants venant de sources
> différentes via règles et tables de correspondance contrôlées.
>
> **Critère d’acceptation:** Un site ou un SKU ne doit pas apparaître en
> double dans le graph sans signal explicite.

**FR-GRA-005** _(Must)_ **API de requête sémantique**

> Le backend doit exposer une API stable pour interroger entités,
> relations, métriques et snapshots par période ou horizon.
>
> **Critère d’acceptation:** Les modules scénario, UI et ROI lisent via
> la même couche sémantique.

**FR-GRA-006** _(Should)_ **Graph explorer**

> Une UI exploratoire doit permettre de naviguer dans les objets,
> métriques et dépendances utiles au debugging produit et au design de
> contrats.
>
> **Critère d’acceptation:** Un decision designer peut vérifier
> visuellement les dépendances d’un contrat.

**FR-GRA-007** _(Should)_ **Change impact analysis**

> Toute modification du modèle ou d’un mapping critique doit afficher
> les contrats, scénarios et vues qui seront impactés.
>
> **Critère d’acceptation:** Impossible de casser silencieusement un
> contrat publié.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p><strong>Point d’attention</strong></p>
<p>Le produit ne doit pas forcer un vrai graph database au démarrage. Un
modèle sémantique construit sur Postgres + vues matérialisées + API
métier suffit pour V1.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## **6.3 Decision Contracts**

Objectif: faire de chaque famille d’arbitrage un objet logiciel
versionné, gouverné et réutilisable. Le Decision Contract est la brique
la plus distinctive du produit.

**FR-CONTR-001** _(Must)_ **Schema formel de contrat**

> Un contrat doit contenir au minimum: périmètre, objectif, variables de
> décision, contraintes dures, contraintes souples, seuils
> d’approbation, actions possibles, formule ROI et explication attendue.
>
> **Critère d’acceptation:** Le contrat est sérialisable en JSON/YAML et
> versionné.

**FR-CONTR-002** _(Must)_ **Contrats draft/test/published**

> Le produit doit supporter des états de vie pour les contrats: draft,
> testing, approved, published, archived.
>
> **Critère d’acceptation:** Un contrat non publié ne peut pas générer
> d’actions en production.

**FR-CONTR-003** _(Must)_ **Templates par pack**

> Coverage, Flow et Allocation doivent disposer de templates avec
> objets, métriques, contraintes et actions préchargées.
>
> **Critère d’acceptation:** Le time-to-first-contract pour un nouveau
> client est inférieur à une journée de configuration assistée.

**FR-CONTR-004** _(Must)_ **Simulation avant publication**

> Tout contrat doit pouvoir être rejoué sur historique ou sandbox avant
> publication, avec comparaison baseline vs recommandations.
>
> **Critère d’acceptation:** Le decision designer voit la stabilité et
> l’impact attendu avant mise en prod.

**FR-CONTR-005** _(Must)_ **Versioning et rollback**

> Chaque version de contrat doit être historisée avec auteur, date,
> motifs de changement et possibilité de rollback.
>
> **Critère d’acceptation:** Un incident peut être corrigé par revert
> sans intervention base de données.

**FR-CONTR-006** _(Must)_ **Policy hooks**

> Le contrat doit pouvoir référencer des politiques globales: labour
> rules, seuils finance, SLA minimaux, plafonds d’impact, séparation des
> rôles.
>
> **Critère d’acceptation:** Les règles d’entreprise s’appliquent sans
> dupliquer la logique dans chaque contrat.

**FR-CONTR-007** _(Should)_ **Overrides et notes métier**

> Un manager ou designer doit pouvoir appliquer un override
> circonstancié sur un paramètre ou un résultat, avec justification.
>
> **Critère d’acceptation:** L’override est visible dans le ledger et
> dans les audits.

**FR-CONTR-008** _(Should)_ **Library et clonage**

> Les contrats doivent être clonables par région, pays, enseigne ou
> business unit.
>
> **Critère d’acceptation:** Un template validé peut être adapté
> rapidement à un nouveau contexte.

**EXEMPLE DE STRUCTURE DE CONTRAT**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th>{<br />
"id": "dc_coverage_store_network_fr",<br />
"pack": "coverage",<br />
"scope": {"entity_type": "site", "sites": ["*"], "horizon":
"D+7"},<br />
"objective": {<br />
"primary": "minimize_total_cost_and_service_risk",<br />
"weights": {"labor_cost": 0.35, "service_risk": 0.40,
"overtime_penalty": 0.15, "temp_penalty": 0.10}<br />
},<br />
"decision_variables": ["shift_extension", "cross_site_reassignment",
"temp_request", "slot_closure"],<br />
"hard_constraints": ["labour_code_fr", "skills_match",
"manager_approval_above_1500_eur"],<br />
"soft_constraints": ["service_level_target_95pct",
"fairness_by_team"],<br />
"approvals": {"required": true, "matrix": ["site_manager",
"regional_ops_if_cost_gt_threshold"]},<br />
"actions": ["create_staffing_request", "notify_manager",
"open_approval_task"],<br />
"roi_formula": "avoided_revenue_loss + avoided_penalties -
incremental_labor_cost"<br />
}</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## **6.4 Signal Engine**

Objectif: anticiper les besoins et détecter les écarts entre plan,
capacité et réalité. Le signal n’est pas une fin en soi: il doit être
directement exploitable par un contrat.

**FR-SIG-001** _(Must)_ **Forecasts quantiles**

> Le moteur doit produire des prévisions avec incertitude, pas seulement
> un point estimate. Au minimum: P50, P80, P90 selon pack.
>
> **Critère d’acceptation:** L’UI montre un intervalle de confiance et
> non une fausse certitude.

**FR-SIG-002** _(Must)_ **Features exogènes standard**

> Les modèles doivent pouvoir intégrer calendrier, jours fériés,
> promotions, météo si disponible, événements commerciaux et historiques
> d’activité.
>
> **Critère d’acceptation:** Le forecast ne dépend pas uniquement des
> volumes passés.

**FR-SIG-003** _(Must)_ **Anomaly & drift detection**

> Le système doit détecter anomalies de données, dérive de performance
> de modèle et cassures structurelles.
>
> **Critère d’acceptation:** Une recommandation dégradée est signalée
> comme telle et peut être bloquée.

**FR-SIG-004** _(Should)_ **Manual forecast override**

> Un opérateur doit pouvoir ajuster un signal de demande ou de capacité
> avec justification et horizon contrôlé.
>
> **Critère d’acceptation:** L’override apparaît dans le ledger et peut
> être comparé au forecast natif.

**FR-SIG-005** _(Should)_ **Hierarchical forecasting**

> Quand le pack s’y prête, le moteur doit réconcilier les prévisions par
> site/région/réseau pour éviter les incohérences entre niveaux.
>
> **Critère d’acceptation:** La somme des prévisions enfants reste
> cohérente avec le total parent.

**FR-SIG-006** _(Could)_ **Feature lineage**

> Le système peut exposer quelles features ont été utilisées par modèle
> et version.
>
> **Critère d’acceptation:** Un auditeur ou designer peut relier un
> signal à sa base technique.

## **6.5 Scenario & Optimization Engine**

Objectif: traduire un signal et un contrat en plusieurs options
comparables sous contraintes. Le solveur doit rester transparent: il
optimise sous règles explicites et ne décide jamais de manière muette.

**FR-OPT-001** _(Must)_ **Baseline + alternatives**

> Pour chaque déclenchement, le système doit générer au minimum une
> baseline et 2 à 5 scénarios alternatifs viables.
>
> **Critère d’acceptation:** L’utilisateur peut comparer plusieurs
> options et pas seulement la “meilleure”.

**FR-OPT-002** _(Must)_ **Contraintes dures inviolables**

> Les contraintes marquées hard dans le contrat ne doivent jamais être
> violées par le solveur.
>
> **Critère d’acceptation:** Si aucune solution n’existe, le système
> remonte un état no-feasible-solution avec motifs.

**FR-OPT-003** _(Must)_ **Soft constraints et score composite**

> Le moteur doit convertir les objectifs et contraintes souples en score
> composite lisible et paramétrable.
>
> **Critère d’acceptation:** Le score détaillé montre le poids de chaque
> composante coût/service/risque.

**FR-OPT-004** _(Must)_ **Binding constraints explanation**

> Chaque scénario doit exposer les contraintes les plus structurantes
> qui limitent la solution.
>
> **Critère d’acceptation:** L’utilisateur comprend pourquoi le solveur
> n’a pas choisi une autre action.

**FR-OPT-005** _(Should)_ **What-if interactif**

> Un opérateur doit pouvoir verrouiller une variable, changer un
> paramètre ou retirer un levier puis relancer le calcul.
>
> **Critère d’acceptation:** Le moteur recalcule en conservant la
> traçabilité du what-if.

**FR-OPT-006** _(Must)_ **Timeouts et fallback**

> Si un solveur dépasse son budget temps, le système doit retourner la
> meilleure solution trouvée ou un fallback heuristique, plutôt
> qu’échouer silencieusement.
>
> **Critère d’acceptation:** Le produit reste utile dans les contextes
> opérationnels contraints en temps.

**FR-OPT-007** _(Should)_ **Reusable solver adapters**

> Le moteur doit permettre d’associer un contrat à un solveur ou
> heuristique spécifique selon le pack.
>
> **Critère d’acceptation:** Coverage et Flow peuvent partager la
> plateforme sans être forcés dans le même moule algorithmique.

**FR-OPT-008** _(Should)_ **Shadow mode**

> Le moteur doit pouvoir tourner sans actionner l’UI métier finale, pour
> comparer ses recommandations à la pratique actuelle.
>
> **Critère d’acceptation:** Permet de dé-risquer les premiers
> déploiements.

## **6.6 Governance & Approval**

Objectif: rendre l’IA utilisable dans un contexte français et européen
exigeant. La supervision humaine, l’auditabilité et la séparation des
rôles doivent être intégrés nativement.

**FR-GOV-001** _(Must)_ **Approval matrix**

> Le système doit permettre de configurer qui valide quoi selon le
> contrat, le périmètre, le coût, le risque et le type d’action.
>
> **Critère d’acceptation:** Une action au-dessus d’un seuil ne part
> jamais sans approbateur adéquat.

**FR-GOV-002** _(Must)_ **Justification structurée**

> Tout rejet, override ou approbation exceptionnelle doit pouvoir être
> accompagné d’un motif structuré et d’un commentaire libre.
>
> **Critère d’acceptation:** Le ledger permet de distinguer
> l’algorithme, le jugement humain et l’issue finale.

**FR-GOV-003** _(Must)_ **Separation of duties**

> La personne qui modifie un contrat critique ne doit pas être la seule
> à pouvoir le publier en production, sauf policy explicite.
>
> **Critère d’acceptation:** Le système impose une revue ou une
> approbation secondaire.

**FR-GOV-004** _(Must)_ **Policy engine**

> Les politiques globales doivent être évaluables à l’exécution:
> plafonds de coût, restrictions RH, zones géographiques, seuils
> financiers, périodes sensibles.
>
> **Critère d’acceptation:** Une action interdite est bloquée avant
> dispatch.

**FR-GOV-005** _(Must)_ **Audit immuable**

> Le système doit écrire un audit trail append-only pour contrats,
> approbations, actions, changements de permissions et accès sensibles.
>
> **Critère d’acceptation:** Un auditeur peut reconstituer la chaîne de
> décision complète.

**FR-GOV-006** _(Should)_ **Model card / contract card**

> Chaque contrat ou modèle associé doit exposer objectifs, périmètre,
> données, limites connues, date de dernière revue et owner.
>
> **Critère d’acceptation:** La gouvernance n’est pas cachée dans du
> code.

**FR-GOV-007** _(Must)_ **Human-in-loop guardrails**

> Par défaut, aucune recommandation à effet direct sur une personne
> n’est exécutée sans validation humaine explicite.
>
> **Critère d’acceptation:** Le produit reste commercialement acceptable
> sur le marché français.

## **6.7 Action Mesh**

Objectif: transformer la décision approuvée en première action concrète
dans les systèmes du client. C’est ici que Praedixa passe du cockpit à
l’exécution.

**FR-ACT-001** _(Must)_ **Action templates**

> Le produit doit gérer des templates d’action versionnés par
> destination: création de tâche, ticket, demande staffing, ajustement
> ordre, notification, export structuré, webhook.
>
> **Critère d’acceptation:** Une recommandation se convertit en action
> sans dev custom à chaque fois.

**FR-ACT-002** _(Must)_ **Dry-run puis dispatch**

> Toute action doit pouvoir être prévisualisée avant envoi, avec payload
> final, destination et identifiants concernés.
>
> **Critère d’acceptation:** L’approbateur comprend exactement ce qui
> sera écrit dans le système cible.

**FR-ACT-003** _(Must)_ **Idempotence et retries**

> Le dispatch doit être idempotent, journalisé et résilient aux erreurs
> réseau ou API.
>
> **Critère d’acceptation:** Une double approbation ou un retry ne crée
> pas une action dupliquée.

**FR-ACT-004** _(Must)_ **Acks et feedback loop**

> Le système doit recevoir ou simuler un accusé de réception et suivre
> le statut de l’action: pending, dispatched, acknowledged, failed,
> retried, canceled.
>
> **Critère d’acceptation:** Le workbench voit si une décision a
> vraiment quitté Praedixa.

**FR-ACT-005** _(Must)_ **Fallback humain**

> Si l’écriture cible échoue, le système doit proposer un fallback
> manuel: export, lien, notification, task copy.
>
> **Critère d’acceptation:** L’opération n’est pas bloquée par un
> incident d’intégration.

**FR-ACT-006** _(Should)_ **Actions composites**

> Une recommandation peut déclencher plusieurs actions ordonnées:
> approbation finance puis notification puis création de ticket.
>
> **Critère d’acceptation:** Temporal ou moteur équivalent orchestre la
> séquence.

**FR-ACT-007** _(Must)_ **Write-back permissions by contract**

> Chaque contrat doit définir précisément quelles destinations et
> quelles actions il peut utiliser.
>
> **Critère d’acceptation:** Impossible qu’un contrat Coverage modifie
> un périmètre non autorisé.

**FR-ACT-008** _(Could)_ **Sandbox de connecteur cible**

> Pour les destinations critiques, une sandbox ou mode test doit être
> disponible.
>
> **Critère d’acceptation:** Les pilotes peuvent être testés sans
> impacter la prod métier.

Etat actuel du repo au 16 mars 2026: le lifecycle principal du dispatch,
les permissions de write-back, le fallback humain et la lecture
persistente des details d'action existent deja. En revanche, la matrice
d'approbation configurable, la justification structuree de bout en bout,
l'idempotence complete, les actions composites et la sandbox restent
encore des fermetures a realiser pour une couche d'execution
completement gouvernee.

## **6.8 Decision Ledger & ROI Engine**

Objectif: fermer la boucle économique du produit. Sans ledger et sans
méthode ROI explicite, Praedixa ressemblera à un outil d’aide à la
décision parmi d’autres. Avec un ledger finance-grade, Praedixa devient
une machine à standardiser les bonnes décisions.

**FR-LED-001** _(Must)_ **Entry complète par décision**

> Chaque recommandation importante doit générer une entry de ledger
> contenant contexte, baseline, alternatives, choix final, approbations,
> action, résultat observé et ROI estimé/réalisé.
>
> **Critère d’acceptation:** Aucune décision significative ne disparaît
> dans un log technique illisible.

**FR-LED-002** _(Must)_ **Baseline / recommended / actual**

> Le ledger doit distinguer explicitement la baseline, le recommandé et
> le réel observé.
>
> **Critère d’acceptation:** Le DAF peut lire ce que l’outil aurait
> laissé faire, ce qu’il a suggéré et ce qui s’est réellement passé.

**FR-LED-003** _(Must)_ **Counterfactual method explicite**

> Le moteur ROI doit stocker la méthode utilisée pour estimer le
> contrefactuel: forecast baseline, règle métier, comparaison de
> cohorte, etc.
>
> **Critère d’acceptation:** Impossible de présenter un ROI sans
> expliciter sa méthode de calcul.

**FR-LED-004** _(Should)_ **Validation finance**

> Un reviewer finance doit pouvoir classer certaines composantes du ROI
> comme validées, estimées ou contestées.
>
> **Critère d’acceptation:** Le cockpit distingue valeur constatée,
> estimée et contestée.

**FR-LED-005** _(Must)_ **Exports et clôture périodique**

> Le système doit produire des vues mensuelles par contrat, site, région
> et pack avec export CSV/PDF/JSON.
>
> **Critère d’acceptation:** Une revue mensuelle Ops + Finance peut être
> tenue sans extractions ad hoc.

**FR-LED-006** _(Must)_ **Drill-down**

> À partir d’un KPI consolidé, l’utilisateur doit pouvoir remonter aux
> décisions sous-jacentes.
>
> **Critère d’acceptation:** Le cockpit n’est pas une agrégation opaque.

**FR-LED-007** _(Should)_ **Recalculation**

> Si un volume réel ou une donnée de coût arrive plus tard, une entry
> peut être recalculée en conservant l’historique des versions.
>
> **Critère d’acceptation:** Le ledger supporte la réalité des données
> d’entreprise.

**FR-LED-008** _(Could)_ **Dispute workflow**

> Une décision ou un ROI peut être contesté avec circuit de revue.
>
> **Critère d’acceptation:** Utile pour les comptes matures et les
> environnements régulés.

Etat actuel du repo au 16 mars 2026: `Ledger Detail` est deja branche
sur une persistance reelle et les fondations `baseline / recommended /
actual`, methode contrefactuelle, validation finance et recalcul
versionne existent deja. En revanche, le cockpit ROI complet, les
exports mensuels defendables, le drill-down consolide et la separation
totale entre proof packs et ledger economique restent encore a fermer.

**EXEMPLE D’ENTRÉE DE LEDGER**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th>{<br />
"ledger_id": "led_2026_03_00125",<br />
"contract_id": "dc_coverage_store_network_fr@v3",<br />
"scope": {"site": "store_45", "date": "2026-03-09"},<br />
"baseline": {"service_risk": 0.31, "labor_cost": 12800},<br />
"recommended": {"action": "shift_extension+cross_site_reassignment",
"expected_service_risk": 0.12, "expected_cost": 13150},<br />
"approved_by": ["site_manager_45"],<br />
"action_status": "acknowledged",<br />
"actual": {"service_risk": 0.14, "labor_cost": 13080, "revenue":
45800},<br />
"counterfactual_method": "forecast_baseline_v2",<br />
"roi": {"estimated": 1750, "realized": 1420, "validation_status":
"estimated"},<br />
"explanation": {"top_drivers": ["absence_peak", "promo_volume",
"skill_gap"], "binding_constraints": ["skills_match",
"max_overtime_per_team"]}<br />
}</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## **6.9 Workbench UI & Notifications**

Objectif: donner une interface quotidienne simple à des rôles différents
sans transformer le produit en cockpit illisible. Le workbench doit
hiérarchiser les tensions, montrer les options, permettre l’approbation
et donner accès au ledger.

**FR-UI-001** _(Must)_ **Signal inbox priorisée**

> L’écran d’accueil métier doit lister les signaux priorisés par impact
> potentiel, horizon, confiance et état d’action.
>
> **Critère d’acceptation:** Un opérateur sait où agir en premier.

**FR-UI-002** _(Must)_ **Scenario compare view**

> Une vue doit comparer baseline et alternatives avec coût, service,
> risque, contraintes, confiance et action associée.
>
> **Critère d’acceptation:** L’arbitrage est lisible sans quitter
> l’écran.

**FR-UI-003** _(Must)_ **Approval inbox**

> Les approbateurs doivent disposer d’une file dédiée avec impact
> attendu, urgence, payload d’action et justification.
>
> **Critère d’acceptation:** Le temps médian d’approbation est
> mesurable.

**FR-UI-004** _(Must)_ **Ledger detail**

> Chaque décision doit avoir une page détail retraçant toute la chaîne
> de bout en bout.
>
> **Critère d’acceptation:** Le produit ne renvoie pas vers des logs
> techniques pour expliquer le passé.

**FR-UI-005** _(Must)_ **Role-based navigation**

> La navigation et les vues doivent se simplifier selon le rôle, sans
> exposer la complexité entière à tout le monde.
>
> **Critère d’acceptation:** Un manager terrain ne voit pas le studio de
> contrat par défaut.

**FR-UI-006** _(Should)_ **Notifications configurables**

> Le système doit notifier par e-mail, Teams, Slack ou webhook selon
> rôle et criticité.
>
> **Critère d’acceptation:** Les signaux critiques ne restent pas
> prisonniers de l’interface web.

**FR-UI-007** _(Should)_ **Natural language summaries**

> Le produit peut générer un résumé en langage naturel des
> recommandations et du ROI, en français ou anglais.
>
> **Critère d’acceptation:** L’IA générative reste une couche de
> synthèse, pas le moteur de vérité.

**FR-UI-008** _(Must)_ **Empty, degraded and failure states**

> Toutes les vues clés doivent gérer explicitement les états sans
> données, données dégradées, sync en erreur et no-feasible-solution.
>
> **Critère d’acceptation:** L’utilisateur comprend ce qui se passe au
> lieu de voir une page vide.

## **6.10 Admin, sécurité et exploitation**

Objectif: rendre le produit exploitable dans des comptes français
exigeants. L’admin et l’exploitabilité ne doivent pas être pensés après
la démo.

**FR-ADM-001** _(Must)_ **Workspace lifecycle**

> Le système doit gérer création, activation, suspension, archivage et
> suppression contrôlée d’un workspace/tenant.
>
> **Critère d’acceptation:** Les environnements pilote, sandbox et
> production sont distingués.

**FR-ADM-002** _(Must)_ **Secret management**

> Les secrets de connecteurs et destinations doivent être stockés de
> manière chiffrée, rotatables et auditables.
>
> **Critère d’acceptation:** Aucun secret ne vit en clair dans la base
> ou dans les logs.

**FR-ADM-003** _(Should)_ **Support console**

> Une console support doit permettre de voir la santé des jobs, actions
> et erreurs par tenant, sans accès à plus de données que nécessaire.
>
> **Critère d’acceptation:** Le support peut diagnostiquer sans
> bricolage SSH.

**FR-ADM-004** _(Must)_ **Backup & restore**

> Les sauvegardes de métadonnées et états critiques doivent être
> automatiques, testées et documentées.
>
> **Critère d’acceptation:** La restauration d’un tenant doit être
> faisable selon les SLO définis.

**FR-ADM-005** _(Should)_ **Feature flags**

> Le produit doit supporter des feature flags par tenant et par pack.
>
> **Critère d’acceptation:** Permet de piloter prudemment les pilotes et
> les bêtas.

**FR-ADM-006** _(Could)_ **Tenant usage metering**

> Le système peut mesurer usage, volume et intensité décisionnelle par
> tenant.
>
> **Critère d’acceptation:** Prépare pricing et capacity planning
> ultérieurs.

**FR-ADM-007** _(Must)_ **Incident runbooks**

> Les incidents de sync, modèle, action dispatch, auth et performance
> doivent avoir des runbooks documentés.
>
> **Critère d’acceptation:** Le produit n’est pas dépendant de la
> mémoire de l’équipe fondatrice.

# **7. Modèle de données, contrats de décision et événements**

## **7.1 Entités cœur du système**

| **Entité**       | **Description**                            | **Champs minimaux V1**                                                 |
| ---------------- | ------------------------------------------ | ---------------------------------------------------------------------- |
| Organization     | Client ou business unit opérée             | org_id, name, region, data_residency, status                           |
| Workspace        | Environnement logique de travail           | workspace_id, org_id, env, status                                      |
| SourceSystem     | Système connecté                           | source_id, type, owner, auth_mode, status                              |
| Dataset          | Jeu de données harmonisé                   | dataset_id, source_id, schema_version, freshness_sla, last_sync_at     |
| EntityMapping    | Correspondance source -\> modèle canonique | mapping_id, source_field, target_field, transform, status              |
| Site             | Unité opérée                               | site_id, region, timezone, capacity_profile, cost_center               |
| Team             | Groupe de capacité / compétence            | team_id, site_id, skill_tags, labor_constraints                        |
| DemandSignal     | Signal de demande / volume / besoin        | signal_id, scope, horizon, value_p50, value_p80, source_model          |
| CapacityState    | Capacité disponible ou contrainte          | capacity_id, scope, date_range, available_units, constraints           |
| DecisionContract | Contrat d’arbitrage versionné              | contract_id, version, pack, scope, objective, status                   |
| ScenarioRun      | Exécution d’un contrat sur un contexte     | run_id, contract_version, started_at, status, solver_type              |
| Recommendation   | Option calculée                            | recommendation_id, run_id, rank, score, expected_impact                |
| Approval         | Validation ou rejet humain                 | approval_id, recommendation_id, actor, decision, reason                |
| Action           | Action déclenchée vers un système cible    | action_id, recommendation_id, target_system, payload, status           |
| LedgerEntry      | Trace économique et opérationnelle         | ledger_id, recommendation_id, baseline, actual, roi, validation_status |

## **7.2 Extensions pack-specific**

| **Pack**   | **Entités spécifiques V1**                                                                  |
| ---------- | ------------------------------------------------------------------------------------------- |
| Coverage   | ShiftTemplate, Absence, Skill, ServiceLevel, LaborRule, TempPool, StaffingRequest           |
| Flow       | Order, Shipment, Route, Node, Vehicle, Carrier, Slot, DelayRisk, DispatchAction             |
| Allocation | SKU, StockNode, TransferLane, PromoWindow, ReplenishmentOrder, ShelfCapacity, InventoryRisk |

## **7.3 États métier standardisés**

| **Objet**      | **États V1**                                                          |
| -------------- | --------------------------------------------------------------------- |
| Connector      | draft, auth_pending, syncing, healthy, degraded, failed, paused       |
| Contract       | draft, testing, approved, published, archived                         |
| ScenarioRun    | queued, running, completed, failed, timed_out, expired                |
| Recommendation | created, viewed, approved, rejected, acted, monitored, closed         |
| Approval       | requested, approved, rejected, canceled                               |
| Action         | dry-run, pending, dispatched, acknowledged, failed, retried, canceled |
| LedgerEntry    | open, measuring, closed, recalculated, disputed                       |

## **7.4 Event schema**

Le système doit être piloté par événements métier, pas uniquement par
CRUD synchrone. Ces événements servent à l’orchestration, à
l’observabilité, au ledger et à l’analytique produit.

| **Événement**              | **Payload minimal**                                     | **Émetteur**        |
| -------------------------- | ------------------------------------------------------- | ------------------- |
| source.sync.completed      | source_id, dataset_id, run_id, record_count, status     | Connector gateway   |
| dataset.freshness.breached | dataset_id, expected_at, observed_at, severity          | Data monitor        |
| contract.published         | contract_id, version, actor, scope                      | Contract engine     |
| signal.generated           | signal_id, contract_id, scope, horizon, confidence_band | Signal engine       |
| scenario.requested         | run_id, contract_id, scope, actor_or_system             | Workbench / trigger |
| scenario.completed         | run_id, recommendation_ids, best_score, status          | Scenario engine     |
| approval.requested         | approval_id, recommendation_id, approver_role, deadline | Workflow engine     |
| approval.granted           | approval_id, actor, decision, comment                   | Workflow engine     |
| approval.rejected          | approval_id, actor, reason_code, comment                | Workflow engine     |
| action.dispatched          | action_id, destination, idempotency_key, status         | Action mesh         |
| action.retry_requested     | action_id, actor_or_system, reason, retry_count         | Action mesh         |
| action.fallback.executed   | action_id, actor, fallback_type, status                 | Action mesh         |
| action.completed           | action_id, status, target_ref, latency_ms               | Action mesh         |
| contract.rolled_back       | contract_id, version, rollback_to, actor                | Contract engine     |
| ledger.recalculated        | ledger_id, previous_revision, current_revision, status  | Ledger engine       |
| ledger.closed              | ledger_id, realized_roi, validation_status              | Ledger engine       |

## **7.5 Règles de temps et snapshots**

- Toutes les métriques qui alimentent une décision doivent être
  rattachées à un horizon temporel explicite: passé, nowcast, futur.

- Le graph doit stocker des snapshots datés ou recalculables pour
  permettre la relecture d’une décision dans son contexte exact.

- Le ledger ne doit jamais dépendre d’un simple “latest state” qui
  écrase l’historique.

- Les fuseaux horaires doivent être stockés au niveau site et pris en
  compte dans les décisions localisées.

## **7.6 DSL minimal de contrat**

- Le DSL doit rester assez expressif pour les contrats métier, mais
  assez simple pour être versionné et expliqué.

- Blocs minimaux: metadata, scope, inputs, objective,
  decision_variables, hard_constraints, soft_constraints, approvals,
  actions, roi_formula, explanation_template.

- Les expressions peuvent être déclaratives et limitées à un
  sous-ensemble sûr, évalué côté serveur.

- Aucun code arbitraire client ne doit s’exécuter dans le runtime V1.

# **8. UX, écrans, workflows et états métier**

Le produit doit privilégier des workflows courts, explicites et orientés
action. La surface UX principale n’est pas un dashboard abstrait. C’est
une suite de vues: connecter, mapper, publier un contrat, traiter un
signal, comparer des scénarios, approuver, agir, relire le résultat.

## **8.1 Inventaire des écrans V1**

| **Écran**               | **Rôle principal**    | **Composants minimum**                                                                      |
| ----------------------- | --------------------- | ------------------------------------------------------------------------------------------- |
| Workspace Home          | Tous                  | KPI de santé, alertes de fraîcheur, signaux prioritaires, contrats actifs, actions en échec |
| Sources & Connectors    | Admin / data          | Liste des connecteurs, statuts, latence, erreurs, bouton add/edit/pause/replay              |
| Connector Wizard        | Admin / data          | Choix source, auth, objets, fréquence, test de connexion                                    |
| Mapping Studio          | Admin / designer      | Pré-mapping, transformations simples, tests, règles de validation, preview sample           |
| Decision Graph Explorer | Designer / support    | Entités, relations, métriques, lineage, drill-down                                          |
| Contract Library        | Designer / ops        | Templates, statut, owner, version, pack, scope                                              |
| Contract Builder        | Designer              | Objectif, contraintes, variables, approvals, actions, ROI formula, preview                  |
| Signal Inbox            | Ops                   | Liste priorisée, filtres, score d’impact, confiance, délai                                  |
| Scenario Compare        | Ops / approver        | Baseline vs alternatives, score détaillé, explications, action preview                      |
| Approval Queue          | Approver              | Actions en attente, seuils, payload, historique, approve/reject                             |
| Action Center           | Ops / support         | Actions dispatchées, statuts, retries, fallback manuel                                      |
| Ledger Detail           | Ops / finance / audit | Contexte, baseline, décision, action, résultat, ROI, notes                                  |
| ROI Cockpit             | COO / DAF             | Vues par contrat/site/région/période, drill-down, exports                                   |
| Admin & Policies        | Org admin             | RBAC, seuils, policies globales, feature flags, audit access                                |

Au 16 mars 2026, `Approval Queue`, `Action Dispatch Detail`, `Ledger
Detail` et le `Contract Studio` sont déjà adossés à des surfaces
persistantes crédibles dans le repo. `Mapping Studio`, `Decision Graph
Explorer` et le `ROI Cockpit` complet restent encore des surfaces cibles
à fermer opérationnellement, en particulier pour le drill-down consolide
et les exports mensuels finance-grade.

Le prochain niveau de fermeture UX reste la convergence explicite entre
`app-webapp` et `app-admin`: memes page models, memes etats degrades,
memes patterns de retry et parcours E2E critiques vraiment prouves.

## **8.2 Workflow: onboarding d’un nouveau client**

28. Créer le workspace, définir la résidence des données, configurer SSO
    et rôles.

29. Créer les 2 à 4 connecteurs critiques pour le premier pack.

30. Mapper les sources au modèle canonique et corriger les records
    invalides.

31. Choisir un template de contrat et l’adapter au contexte client.

32. Lancer un backtest sur historique ou shadow mode.

33. Publier le contrat avec matrice d’approbation.

34. Déclencher la première semaine de recommandations en lecture seule.

35. Activer ensuite l’Action Mesh sur un périmètre contrôlé.

36. Revoir le premier ledger mensuel avec Ops + Finance.

## **8.3 Workflow: traitement opérationnel quotidien**

| **Étape**                      | **Utilisateur**    | **Attendu UX**                                               |
| ------------------------------ | ------------------ | ------------------------------------------------------------ |
| Voir le signal                 | Operator           | Une inbox priorisée, pas un dashboard brut                   |
| Ouvrir les scénarios           | Operator           | Comparaison baseline + options + confiance + contraintes     |
| Choisir / demander approbation | Operator           | CTA unique clair selon droits                                |
| Approuver ou rejeter           | Approver           | Explication, payload d’action, impact attendu, justification |
| Envoyer l’action               | Système            | Dispatch robuste avec feedback de statut                     |
| Observer le résultat           | Operator / finance | Ledger detail puis cockpit ROI                               |

Au 16 mars 2026, la lecture signal/compare coverage existe déjà en
partie et la validation admin est actionnable. En revanche, la
génération persistante de scénarios, la matrice d’approbation
configurable et la clôture ledger finance-grade restent encore à
fermer.

Le repo doit aussi encore fermer la lisibilite inter-shell de ce
parcours: un operator, un approver et un support ne doivent pas voir des
versions divergentes du meme etat produit selon l'app utilisee.

## **8.4 Règles UX non négociables**

- Toujours afficher l’horizon temporel et la fraîcheur des données.

- Toujours afficher ce qui est calculé, ce qui est estimé et ce qui est
  réellement observé.

- Toujours afficher ce qui bloque une action: contrainte dure, manque de
  data, approbation manquante, incident connecteur.

- Ne jamais noyer les rôles opérationnels dans le modèle de données
  complet.

- Rendre visible la confiance et les limites du moteur sans exiger une
  expertise data science.

## **8.5 États vides, dégradés et erreurs**

- No data: expliquer quelles sources manquent et proposer la prochaine
  action pour compléter le setup.

- Data stale: bannière claire + blocage ou downgrade de la
  recommandation selon policy.

- No feasible solution: expliquer les contraintes bloquantes et proposer
  options manuelles ou seuils à revoir.

- Action failure: afficher payload, cause, retries, fallback manuel et
  owner du traitement.

- Ledger pending: distinguer ROI non encore mesurable d’un ROI nul.

# **9. IA, optimisation, explicabilité et garde-fous**

## **9.1 Principe général**

Praedixa ne doit pas être construit comme un produit “LLM-first”. Le
moteur de valeur réside dans la combinaison d’algorithmes de prévision,
de règles métier, d’optimisation sous contraintes et de workflows
d’approbation. Les modèles génératifs peuvent assister la configuration,
l’explication et la navigation, mais ne doivent pas devenir la source de
vérité décisionnelle.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p><strong>Règle simple</strong></p>
<p>Les modèles prédictifs et les solveurs produisent le fond.</p>
<p>Le graphe et les contrats fournissent le contexte.</p>
<p>Les modèles génératifs synthétisent, expliquent et assistent, mais ne
gouvernent pas seuls.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## **9.2 Forecasting V1**

- Commencer par des approches mesurables et stables: modèles
  statistiques hiérarchiques, gradient boosting, règles calendrier.

- Prévoir des quantiles et non une seule valeur.

- Prévoir par pack: demande de staffing, volume de commandes, charge
  flux, besoin de réappro.

- Garder un fallback naïf robuste quand le modèle n’est pas fiable ou
  les données trop maigres.

## **9.3 Optimisation V1**

- Coverage: formulation de capacité/couverture avec coût, service,
  compétences, contraintes de travail et leviers d’ajustement.

- Flow: formulation de capacité flux / dispatch / priorisation backlog
  avec SLA, coût, saturation, disponibilité véhicules ou slots.

- Allocation: formulation plus simple au départ, orientée réaffectation
  stock / priorisation réappro, avant d’attaquer des optimisations
  réseau complexes.

- Préférer un mix solver exact + heuristiques plutôt qu’un moteur
  “intelligent” opaque.

État actuel du repo au 16 mars 2026: les lectures coverage persistantes
existent déjà pour `live scenarios` et `decision workspace`, mais le
produit ne sait pas encore lancer partout un runtime de génération
versionné et explicable avec ses états dégradés complets.

## **9.4 Explicabilité minimum requise**

| **Question utilisateur**               | **Réponse produit attendue**                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| Pourquoi maintenant ?                  | Le signal ou l’écart qui déclenche la recommandation, avec horizon et confiance |
| Pourquoi cette option ?                | Les top drivers et les gains attendus                                           |
| Pourquoi pas une autre ?               | Les contraintes bloquantes ou le score inférieur des alternatives               |
| Que se passe-t-il si on ne fait rien ? | La baseline et son impact attendu                                               |
| Quelle est la confiance ?              | Bande d’incertitude et état du modèle/données                                   |

## **9.5 Garde-fous IA et opérationnels**

- Aucune action humaine à impact sensible ne part sans approbation par
  défaut.

- Toute recommandation doit afficher son contrat, sa version, son
  dataset window et sa fraîcheur.

- Les overrides humains doivent être possibles et tracés.

- Les modèles doivent être monitorés pour drift, stabilité et taux de
  no-feasible-solution.

- Les modèles génératifs n’ont pas le droit d’inventer des métriques,
  des contraintes ou des actions non définies par le contrat.

## **9.6 Cas d’usage LLM permis en V1/V1.5**

| **Usage**                              | **Statut**    | **Règle**                                                           |
| -------------------------------------- | ------------- | ------------------------------------------------------------------- |
| Suggestion de mapping de champs        | V1            | Jamais auto-publié sans validation                                  |
| Résumé naturel d’une recommandation    | V1            | Toujours dérivé de données structurées                              |
| Aide à la création de contrat          | V1.5          | Génère un brouillon, pas une version publiée                        |
| Question/réponse sur le Decision Graph | V1.5          | Réponses strictement sourcées sur les objets et métriques du tenant |
| Agent autonome d’action                | Hors scope V1 | Pas sans gouvernance renforcée et preuves d’usage                   |

## **9.7 Monitoring modèle**

- Par modèle / contrat: MAE, MAPE ou métrique pertinente, coverage des
  quantiles, latence, taux de fallback, drift d’entrée, drift de
  performance.

- Par solveur: temps moyen, taux d’échec, taux de no feasible solution,
  fréquence des contraintes bloquantes.

- Par recommandation: taux de vue, taux d’approbation, taux d’exécution,
  écart attendu vs réalisé.

## **9.8 Politique de confiance produit**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p><strong>Politique conseillée</strong></p>
<p>Praedixa n’automatise pas aveuglément les décisions.</p>
<p>Praedixa industrialise la qualité de décision en gardant un humain
responsable et un audit trail complet.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# **10. Sécurité, souveraineté, conformité et exploitation**

Ce PRD n’est pas un avis juridique. Il décrit un design produit
compatible avec les attentes du marché français: souveraineté,
auditabilité, supervision humaine, résidence des données et maîtrise des
accès. Pour les comptes sensibles, une trajectoire trusted-cloud plus
exigeante devra être définie commercialement et techniquement.

## **10.1 Souveraineté by design**

- Hébergement France par défaut sur infrastructure souveraine /
  européenne.

- Documentation claire de la résidence des données et des sous-traitants
  techniques.

- Capacité à isoler un tenant sensible dans un environnement dédié à
  partir de V1.5.

- Journaux d’accès administrateur et procédures d’escalade contrôlées.

- Éviter les dépendances non nécessaires à des services SaaS
  extraterritoriaux pour les briques sensibles.

## **10.2 Contrôles de sécurité minimum**

| **Contrôle**   | **Exigence V1**                                                              |
| -------------- | ---------------------------------------------------------------------------- |
| AuthN/AuthZ    | SSO/OIDC, RBAC par rôle et par workspace, MFA administrateur                 |
| Chiffrement    | TLS en transit, chiffrement au repos, secrets chiffrés et rotatables         |
| Audit          | Append-only audit trail sur changements sensibles et actions administratives |
| Backups        | Sauvegardes testées, fréquence documentée, restauration éprouvée             |
| Vulnérabilités | Scan dépendances et images, patching régulier                                |
| Accès support  | Just-in-time ou journalisé, principe de moindre privilège                    |
| Isolation      | Séparation stricte tenants, environnements et données brutes/harmonisées     |

Au 16 mars 2026, le repo a déjà une bonne partie de ce socle de
confiance, mais le trust gate n’est pas encore totalement fermé tant que
les chemins demo/legacy restants, l’audit append-only étendu et les
accès privilégiés implicites ne sont pas éliminés ou explicitement
encadrés.

## **10.3 RGPD et minimisation**

- Ne traiter que les données nécessaires à la décision visée par le pack
  et le contrat.

- Pseudonymiser ou éviter les identifiants personnels lorsque le niveau
  agrégé suffit.

- Documenter finalités, bases légales, rétention et sous-traitants avec
  le client.

- Prévoir des mécanismes d’export, suppression et purge des données
  selon les politiques convenues.

- Conserver séparément les journaux techniques et les données métier
  quand leur durée de conservation diffère.

## **10.4 Design compatible avec un marché IA prudent**

- Par défaut, pas de scoring individuel automatisé pour l’emploi,
  l’évaluation ou l’accès à un droit.

- Humain dans la boucle pour toute recommandation qui affecte
  directement le travail ou la disponibilité des personnes.

- Explicabilité minimale et journalisation de la base factuelle de
  chaque recommandation.

- Documentation des limites connues, de la qualité des données et des
  hypothèses ROI.

## **10.5 Exploitation et incident management**

- Runbooks pour: connecteur cassé, fraîcheur rompue, solver timeout,
  action dispatch failure, incident de performance, incident de
  sécurité.

- Health dashboard par tenant avec statut des syncs, contrats, actions
  et ledger.

- Escalade par sévérité et journal d’incident.

- Post-mortems documentés sur incidents clients significatifs.

# **11. API, intégrations, observabilité et tests**

## **11.1 API internes et publiques**

Même si l’UI sera le canal principal au démarrage, le produit doit être
pensé API-first. Les contrats, scénarios, recommandations, actions et
ledger doivent être manipulables via API.

| **Endpoint logique**         | **But**                                         |
| ---------------------------- | ----------------------------------------------- |
| POST /connectors             | Créer un connecteur                             |
| POST /connectors/{id}/test   | Tester auth et accès source                     |
| POST /sync-jobs              | Déclencher une sync ou un replay                |
| GET /datasets/{id}/health    | Lire fraîcheur, volume, erreurs, lineage        |
| POST /contracts              | Créer un contrat                                |
| POST /contracts/{id}/publish | Publier un contrat après validation             |
| POST /scenario-runs          | Lancer un calcul de scénarios                   |
| GET /recommendations/{id}    | Lire détail et explication d’une recommandation |
| POST /approvals              | Approuver ou rejeter                            |
| POST /actions/{id}/dispatch  | Déclencher une action                           |
| GET /ledger/{id}             | Lire l’entrée complète de ledger                |
| GET /roi/report              | Exporter un rapport consolidé                   |

Au 16 mars 2026, le repo matérialise déjà une partie de cette surface
via des routes admin réelles pour:

- le runtime org-scoped des `DecisionContract`;
- l’approval inbox et la mutation de décision;
- le détail dispatch et ses mutations de lifecycle/fallback;
- le `Ledger Detail`;
- les tests de connexion, sync triggers et replay/backfill connecteurs.

La lecture detaillee du ledger est donc bien plus avancee que la couche
d'export et de revue mensuelle finance-grade, qui reste encore une
partie cible de la V1.

## **11.2 Webhooks sortants**

- scenario.completed

- approval.requested

- action.failed

- ledger.closed

- dataset.freshness.breached

## **11.3 Observabilité produit**

| **Couche**  | **À instrumenter**                                                       |
| ----------- | ------------------------------------------------------------------------ |
| Connecteurs | latence, erreurs, retries, fraîcheur, volume traité                      |
| Scénarios   | temps de calcul, fallback rate, score distribution, no-feasible rate     |
| Actions     | dispatch latency, ack rate, failure rate, retries, duplication prevented |
| Ledger      | time-to-close, delta attendu/réalisé, contestation                       |
| UI          | page load, action completion, approval turnaround, dead clicks           |

Les corrélations minimales attendues doivent inclure `request_id`,
`run_id`, `contract_version`, `connector_run_id` et `action_id`.

## **11.4 Stratégie de tests**

- Tests unitaires sur le DSL de contrat, les policies et les fonctions
  ROI.

- Tests d’intégration par connecteur standard avec fixtures réalistes.

- Regression tests sur le moteur de scénarios avec jeux d’essai par
  pack.

- Golden datasets pour vérifier que la recommandation ne dérive pas
  silencieusement après modification.

- Tests de cohérence sur `ROI / ledger / proof packs / decisions`.

- Tests de charge sur sync, calcul scénario et dispatch action.

- Tests E2E sur les parcours critiques avec etats degrades visibles et
  sources persistentes reelles.

- Shadow mode avant write-back sur chaque nouveau client ou contrat
  critique.

- Tests de sécurité sur auth, séparation tenants, secrets et audit
  trail.

## **11.5 Supportability**

- Chaque incident client doit être corrélable à un request_id, run_id,
  contract_version, connector_run_id et action_id.

- Les exports de support doivent pouvoir être produits sans exposer plus
  de données que nécessaire.

- Le produit doit disposer d’un mode maintenance par tenant.

# **12. Roadmap de développement, équipe et plan 24 semaines**

## **12.1 Équipe minimale recommandée**

| **Rôle**                     | **Charge** | **Mission**                                              |
| ---------------------------- | ---------- | -------------------------------------------------------- |
| Lead Product / CEO           | 1          | Vision, arbitrages, design partners, backlog, packaging  |
| Product Designer             | 1          | UX des workflows clés, design system, états de confiance |
| Lead Backend / Platform      | 1          | Architecture, API, tenancy, security, events             |
| Full-stack Engineer          | 1          | Workbench, contract builder, approval UI                 |
| Data Engineer / Integrations | 1          | Connecteurs, mappings, qualité de données                |
| ML/OR Engineer               | 1          | Forecasting, solver, explainability, ROI methods         |
| Backend / Workflow Engineer  | 1          | Action Mesh, Temporal, ledger, notifications             |
| DevOps / SRE                 | 0.5 à 1    | CI/CD, infra Scaleway, monitoring, backups, sécurité     |

## **12.2 Plan 24 semaines**

| **Semaine** | **Livrables**                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------ |
| 1-2         | Cadrage final du modèle canonique, DSL de contrat, architecture repo, auth, RBAC, audit skeleton |
| 3-4         | Workspace lifecycle, secrets, observabilité, shell front-end, connector registry v0              |
| 5-6         | Connecteurs standards 1 à 3, jobs de sync, dataset health, mapping studio v0                     |
| 7-8         | Decision Graph v0, entity resolution, graph API, contract library v0                             |
| 9-10        | Contract builder v0, publication workflow, backtest basic, signal engine batch v0                |
| 11-12       | Scenario engine v0, solver adapters, scenario compare UI, shadow mode                            |
| 13-14       | Approval workflow, notifications, action templates v0, action dispatch dry-run                   |
| 15-16       | Write-back sur 2 destinations, statuses d’action, ledger v0, ROI formula engine v0               |
| 17-18       | Coverage Pack hardening, cockpit ROI v0, support console, runbooks initiaux                      |
| 19-20       | Flow Pack bêta, performance tuning, feature flags, export finance                                |
| 21-22       | Stabilisation pilote, sécurité, tests de charge, améliorations explainability                    |
| 23-24       | Go-live design partners, revue KPI, backlog V1.5, packaging commercial                           |

Ce plan reste utile comme cible produit, mais l’ordre d’exécution réel
du repo est désormais piloté par `docs/prd/TODO.md`,
`docs/prd/decisionops-v1-execution-backbone.md` et
`docs/prd/matrice-verification-parcours-confiance.md`.

## **12.3 Jalons produit à ne pas rater**

- Jalon A: un contrat existe comme objet versionné avant que le design
  UI soit “beau”.

- Jalon B: une recommandation peut être tracée jusqu’à une action cible
  avant toute sophistication model.

- Jalon C: un ledger lisible existe avant la première revue client de
  ROI.

- Jalon D: Coverage Pack est réellement utilisable par un design partner
  avant de disperser l’équipe sur Allocation.

## **12.4 Critères d’entrée en production**

| **Critère**                   | **Niveau minimum**                                    |
| ----------------------------- | ----------------------------------------------------- |
| Connecteurs critiques stables | \>= 2 semaines sans incident sévère non résolu        |
| Qualité de données            | Fraîcheur et taux d’erreur dans le SLA défini         |
| Scénarios                     | p95 \< 30 s et no-feasible-solution compris/expliqués |
| Write-back                    | Ack fiable sur au moins une destination critique      |
| Ledger                        | Clôture possible sur un cycle mensuel                 |
| Sécurité                      | SSO, MFA admin, audit log, secrets gérés              |

## **12.5 Ce qu’il faut retarder pour aller vite**

- Un agent conversationnel ambitieux.

- Une couche documentaire/unstructured data au cœur de la promesse.

- Une UI analytics très large.

- Des microservices très fins.

- Une marketplace exhaustive de connecteurs.

# **13. Risques, arbitrages structurants et critères de succès**

## **13.1 Risques majeurs**

| **Risque**               | **Pourquoi c’est dangereux**                                                                              | **Mitigation**                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Scope trop large         | Le produit se dilue entre data platform, BI, IA et workflow                                               | Tenir le wedge Coverage/Flow/Allocation et refuser le “tout l’entreprise” en V1                       |
| Dette d’intégration      | Chaque client devient un projet spécifique                                                                | Framework de connecteurs + mapping studio + templates par pack                                        |
| Produit trop analytique  | On voit bien le problème mais rien ne se déclenche                                                        | Action Mesh et ledger traités comme cœur produit, pas comme extension                                 |
| Produit trop autonome    | Rejet par les métiers et la conformité                                                                    | Approval matrix, explicabilité, overrides et policies by design                                       |
| ROI non crédible         | Le DAF ne suit pas, le deal se fragilise                                                                  | Méthode contrefactuelle explicite, validation finance, distinction estimé/réalisé                     |
| Performance insuffisante | L’outil n’entre pas dans le rythme opérationnel                                                           | Budgets temps, fallback heuristiques, shadow mode                                                     |
| Équipe trop orientée LLM | Le produit vend du vernis au lieu d’une boucle décisionnelle                                              | LLM limité à mapping, synthèse et NLQ assisté                                                         |
| Sur-promesse du socle    | Le produit et la doc laissent croire que la boucle est fermée alors que certains runtimes restent ouverts | Tenir le PRD principal synchronisé avec les specs vivantes et ne cocher `TODO.md` qu’avec preuve repo |

## **13.2 Arbitrages structurants à trancher immédiatement**

- Voulez-vous une plateforme de stockage ou une plateforme de fédération
  ? Recommandation: fédération d’abord.

- Voulez-vous l’autonomie totale ou l’assistance gouvernée ?
  Recommandation: assistance gouvernée.

- Voulez-vous une verticalité par métier ou un horizontal générique ?
  Recommandation: cœur horizontal, emballage vertical.

- Voulez-vous des contrats en no-code complet ou un DSL gouverné avec UI
  assistée ? Recommandation: DSL gouverné.

- Voulez-vous tout automatiser ou écrire seulement la première action
  utile ? Recommandation: première action utile + feedback loop.

## **13.3 KPIs produit et business**

| **Type**          | **KPI**                                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Adoption          | Temps de setup premier connecteur, temps de publication premier contrat, utilisateurs actifs par rôle, taux de recommandations vues |
| Usage décisionnel | Taux de recommandations approuvées, temps médian d’approbation, taux d’actions dispatchées, taux de fallback manuel                 |
| Qualité moteur    | Forecast error, solve success rate, no-feasible-solution rate, drift alerts                                                         |
| Valeur            | ROI estimé, ROI réalisé, coût évité, service risk réduit, délai évité, revenue/profit protégé                                       |
| Ops platform      | Freshness SLA compliance, action failure rate, MTTR incident, export finance reliability                                            |

## **13.4 Kill criteria**

- Si le produit ne peut pas connecter 3 systèmes standards sans projet
  spécifique lourd, il faut revoir le module Connect.

- Si les scénarios ne sont pas compris ou approuvés par les métiers, il
  faut revoir l’explicabilité et les contrats, pas seulement les
  modèles.

- Si l’action write-back reste marginale, Praedixa retombe dans
  l’analytics. C’est un signal rouge.

- Si le ledger ne produit pas un ROI défendable en revue mensuelle, le
  produit n’a pas encore fermé sa boucle.

# **Annexe A. Backlog initial par epic**

Cette annexe convertit le PRD en backlog de build. Les epics ci-dessous
ne remplacent pas un vrai outil produit, mais donnent une structure de
livraison immédiate.

| **Epic**               | **Stories must-have V1**                                                                              | **Sortie attendue**                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| E1 Auth & Tenancy      | Créer workspace; inviter utilisateurs; configurer rôles; activer SSO; journaliser les accès sensibles | Un tenant sécurisé et administrable          |
| E2 Connector Framework | Créer connecteur; tester auth; lancer sync; voir health; rejouer une fenêtre                          | Une source connectée, stable et monitorée    |
| E3 Mapping Studio      | Mapper champs; transformer simples valeurs; prévisualiser; isoler erreurs; publier mapping            | Un dataset harmonisé exploitable             |
| E4 Decision Graph      | Créer entités canonique; résoudre identifiants; exposer métriques; explorer relations                 | Une couche sémantique cohérente              |
| E5 Contract Engine     | Créer contrat draft; versionner; backtester; approuver; publier; rollback                             | Un contrat vivant et gouverné                |
| E6 Signal Engine       | Calculer forecasts; générer alertes; afficher confiance; signaler dérive                              | Des signaux actionnables                     |
| E7 Scenario Engine     | Lancer calcul; comparer baseline et alternatives; expliquer contraintes; fallback timeout             | Des scénarios comparables et compréhensibles |
| E8 Approval Workflow   | Demander approbation; approuver/rejeter; tracer motif; notifier                                       | Une boucle humaine robuste                   |
| E9 Action Mesh         | Prévisualiser payload; dispatcher; gérer retries; suivre statuts; fallback manuel                     | Une première action réellement exécutée      |
| E10 Ledger & ROI       | Créer ledger entry; saisir baseline; ingérer réel; recalculer ROI; exporter                           | Une preuve d’impact consolidée               |
| E11 Workbench UI       | Inbox; compare view; approval queue; ledger detail; cockpit                                           | Une interface quotidienne utilisable         |
| E12 Pack Templates     | Template Coverage; template Flow; KPIs; actions; démos design partner                                 | Un wedge vendable par verticale              |

# **Annexe B. User stories détaillées critiques**

**US-001** _(Must)_ **En tant qu’admin, je peux connecter Salesforce
avec OAuth, tester l’accès et sélectionner les objets à synchroniser.**

> Cette story doit être présente dans le backlog sprint et transformée
> en critères Gherkin/acceptance tests avant build.

**US-002** _(Must)_ **En tant que data owner, je peux mapper un champ
“store_code” source vers l’entité canonique “site_id” et voir les
collisions potentielles.**

> Cette story doit être présente dans le backlog sprint et transformée
> en critères Gherkin/acceptance tests avant build.

**US-003** _(Must)_ **En tant que decision designer, je peux créer un
contrat Coverage à partir d’un template et ajuster les seuils de coût et
service.**

> Cette story doit être présente dans le backlog sprint et transformée
> en critères Gherkin/acceptance tests avant build.

**US-004** _(Must)_ **En tant qu’ops analyst, je peux lancer un backtest
sur les 8 dernières semaines avant publication du contrat.**

> Cette story doit être présente dans le backlog sprint et transformée
> en critères Gherkin/acceptance tests avant build.

**US-005** _(Must)_ **En tant qu’operator, je reçois une alerte
priorisée lorsqu’un site risque d’être sous-couvert à J+3.**

> Cette story doit être présente dans le backlog sprint et transformée
> en critères Gherkin/acceptance tests avant build.

**US-006** _(Must)_ **En tant qu’operator, je vois la baseline et trois
scénarios alternatifs avec coût, service, risque et contraintes
bindées.**

> Cette story doit être présente dans le backlog sprint et transformée
> en critères Gherkin/acceptance tests avant build.

**US-007** _(Must)_ **En tant qu’approver, je peux approuver une action
en voyant exactement le payload qui sera poussé vers le WFM ou le CRM.**

> Cette story doit être présente dans le backlog sprint et transformée
> en critères Gherkin/acceptance tests avant build.

**US-008** _(Must)_ **En tant que système, je garantis qu’un retry
n’écrit pas deux fois la même action chez le client.**

> Cette story doit être présente dans le backlog sprint et transformée
> en critères Gherkin/acceptance tests avant build.

**US-009** _(Must)_ **En tant que finance reviewer, je peux distinguer
les composantes de ROI validées, estimées ou contestées.**

> Cette story doit être présente dans le backlog sprint et transformée
> en critères Gherkin/acceptance tests avant build.

**US-010** _(Must)_ **En tant qu’auditeur, je peux retrouver quelle
version de contrat a produit une recommandation donnée et qui l’a
validée.**

> Cette story doit être présente dans le backlog sprint et transformée
> en critères Gherkin/acceptance tests avant build.

# **Annexe C. Fiches pack métier**

| **Pack**   | **Inputs clés**                                                                                    | **Leviers clés**                                                                       | **KPIs ROI**                                                            |
| ---------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Coverage   | Sales/reservations/orders forecast, planning actuel, absences, compétences, coûts, service targets | extension de shift, réaffectation, flex pool, demande temp, réduction créneau          | coût de couverture, OT évité, service risk réduit, revenu protégé       |
| Flow       | commandes, backlog, capacités sites, slots, véhicules, coûts transport, SLA, aléas                 | re-sequencing, capacity reallocation, carrier switch, slot addition, cutoff adjustment | retards évités, coût variable, SLA breaches avoided, throughput protégé |
| Allocation | stocks, demand forecast, promo, capacités de réassort, transferts possibles, coûts                 | transfert inter-sites, réappro priorisé, réaffectation promo, seuils stock             | ruptures évitées, marge protégée, stock immobilisé réduit               |

# **Annexe D. Références de marché et conformité utiles au positionnement**

Références utiles pour le cadrage du produit, du positionnement et de la
posture de confiance. À citer en sales ou en deck, pas nécessairement
dans l’UI.

- INSEE, enquête TIC entreprises 2024: hausse de l’usage de l’IA en
  France, avec un rattrapage encore incomplet.

- Commission européenne, France 2024 Digital Decade report: maturité
  infrastructure forte mais digitalisation des entreprises encore
  perfectible.

- ANSSI, SecNumCloud / cloud de confiance: importance des protections
  techniques, opérationnelles et juridiques pour les données sensibles.

- Numeum / PAC 2025: le cloud et les plateformes restent le moteur du
  marché numérique en France.

- CNIL: mise en production de systèmes d’IA avec supervision humaine,
  journalisation et maîtrise des risques.

- Baromètre EY / Hexatrust 2025: la souveraineté pèse dans les choix,
  mais ne suffit pas sans maturité produit et fiabilité.

# **Annexe E. Synthèse fondatrice**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p><strong>Si tu devais résumer le build en dix mots</strong></p>
<p>Fédérer, modéliser, simuler, expliquer, approuver, agir, tracer,
mesurer, packager, souverainiser.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p><strong>Si tu devais résumer ce qu’il ne faut pas
faire</strong></p>
<p>Ne pas construire un Snowflake français miniature.</p>
<p>Ne pas construire un assistant qui parle bien mais n’agit pas.</p>
<p>Ne pas reporter le ledger et le write-back à plus tard.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>
