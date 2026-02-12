# Dossier de market research et stratégie pour Praedixa

## Synthèse exécutive

Praedixa se positionne comme une **couche de pilotage Ops/DAF** au-dessus des outils existants (planning/WFM, SIRH, BI) : elle vise à **anticiper les ruptures de couverture à court horizon (J+3 / J+7 / J+14)**, à **expliquer les causes** (drivers actionnables), à **chiffrer des scénarios coût vs service** de manière traçable, puis à **prouver l’impact** via un journal de décision et des comparatifs “0% / 100% / réel”. citeturn4view0

Le site de Praedixa explicite également deux choix structurants pour l’adoption en entreprise : (i) **fonctionner à partir d’exports (CSV/Excel)** sans intégration lourde au démarrage, et (ii) **ne pas faire de prédictions individuelles** mais travailler à un niveau agrégé (site/équipe/compétence), avec un discours “RGPD by design” orienté minimisation et auditabilité. citeturn4view0turn5search0

Point de due diligence important : le site met en avant un positionnement “hébergement France”, mais les **mentions légales** indiquent un hébergement via entity["company","Cloudflare","web hosting and cdn vendor"] et un statut “entreprise en cours d’immatriculation”. Cela ne signifie pas nécessairement que les données “métier” (exports, stockage, traitements) sont hébergées hors de entity["country","France","country"], mais implique de clarifier précisément **où transitent/ résident les données** (site vitrine vs plateforme, CDN vs stockage, zones de traitement, DPA/SCC, etc.). citeturn5search3turn4view0

## Marché adressé et signaux

Le wedge “logistique et opérations multi-sites” est cohérent avec le poids économique et social des activités terrain, où la main-d’œuvre est un facteur limitant et un poste de coût majeur. Par exemple, le secteur “transports et entreposage” représente **plus de 1,4 million de salariés fin 2023** (périmètre privé hors intérim) selon les statistiques publiques sectorielles. citeturn2search3

Sur le marché du travail, la entity["organization","DARES","french labor statistics"] documente à la fois (i) des **tensions toujours élevées** (en 2024, “six métiers sur dix” en tension forte ou très forte), et (ii) un niveau significatif d’**emplois vacants** (458 000 au T3 2025 dans le secteur privé sur le champ indiqué), ce qui renforce l’intérêt d’un pilotage fin “capacité vs charge”, site par site. citeturn0search7turn0search3

Côté “coût de l’imprévu”, la entity["organization","DREES","french health statistics"] indique que les indemnités journalières (régimes de base) atteignent **21,4 Md€ en 2024** (+6,2%), avec une progression des IJ maladie hors Covid-19. Même si ces montants sont macro, ils signalent un régime durable où l’absentéisme et les arrêts viennent perturber la capacité opérationnelle, en particulier dans les organisations intensives en main-d’œuvre. citeturn1search4turn1search8

Enfin, les “conditions de possibilité” côté data/IT sont meilleures qu’il y a quelques années : entity["organization","Eurostat","eu statistical office"] observe des taux d’équipement et d’usages en hausse, notamment (i) ERP : 43,3% des entreprises de l’UE utilisant des applications ERP en 2023, (ii) cloud payant : 52,74% des entreprises de l’UE en 2025, et (iii) IA en entreprise : 20,0% des entreprises de l’UE (10+ salariés) utilisant des technologies d’IA en 2025. citeturn2search1turn2search2turn1search1

En entity["country","France","country"], entity["organization","Insee","national statistics office france"] mesure également une accélération : 10% des entreprises (10+ salariés) déclarent utiliser une technologie d’IA en 2024 (contre 6% en 2023), avec une adoption beaucoup plus élevée parmi les grandes entreprises. citeturn1search6

## Taille de marché et lecture TAM/SAM/SOM

Praedixa se situe à la frontière de trois marchés adjacents : (i) **Workforce Management (WFM)**, (ii) **Vendor Management / contingent workforce (VMS, gestion de l’externe)**, (iii) **couche de décision économique** (scénarios coût/service + preuve). Le “TAM utile” dépend donc fortement de la définition retenue et du recouvrement entre catégories. citeturn4view0turn0search12

Sur le WFM, les publications publiques sont **hétérogènes** (périmètres, inclusion des services, modules, industries). À titre indicatif, entity["company","MarketsandMarkets","market research firm"] publie une trajectoire globale du WFM autour de 9,57 Md$ en 2025 et 15,67 Md$ en 2030 (CAGR annoncé 10,4%). citeturn0search11 De son côté, entity["company","Mordor Intelligence","market research firm"] publie une estimation différente (9,76 Md$ en 2026 vers 12,04 Md$ en 2031 ; CAGR 4,29%), suggérant des écarts de scope et/ou de segmentation. citeturn0search5

Sur le VMS (au sens “Vendor Management System software”), une estimation (référencée par entity["company","marketresearch.com","market research portal"]) place le marché autour de 5,253 Md$ en 2025 avec une croissance attendue (CAGR 5,80%). citeturn0search12

Lecture opérationnelle pour Praedixa : plutôt que de “se battre” sur un TAM théorique, l’enjeu est de **délimiter un SAM exécutable** (par vertical et par géographie) où la douleur est immédiate, la donnée accessible (exports), l’impact mesurable (coûts urgents et service), et le cycle d’adoption court. C’est cohérent avec l’approche “diagnostic rapide → partenariat pilote → industrialisation” affichée sur le site. citeturn4view0

## Positionnement et différenciation face aux alternatives

Le positionnement “overlay décisionnel” est particulièrement défendable si Praedixa maintient une frontière claire : **ne pas refaire le planning**, mais **améliorer le timing et la qualité économique des décisions** (audit trail, hypothèses versionnées, preuve). C’est explicitement revendiqué dans la FAQ (“outil de décision, pas outil de gestion/planning”). citeturn4view0

Dans l’écosystème WFM enterprise, des acteurs comme entity["company","UKG","workforce management vendor"], entity["company","Workday","enterprise hcm and finance vendor"], entity["company","SAP","enterprise software vendor"], entity["company","Oracle","enterprise software vendor"], entity["company","ATOSS","workforce management vendor"] ou entity["company","ADP","payroll and hcm vendor"] sont fréquemment cités comme “prominent players” sur des segments WFM (exemple : systèmes WFM en santé, liste de fournisseurs). citeturn3search13 Dans l’écosystème “frontline” et planification/gestion des temps, des solutions comme entity["company","Quinyx","workforce management platform vendor"], entity["company","Skello","workforce planning software france"], entity["company","Horoquartz","workforce time and planning vendor france"] ou entity["company","Octime","workforce time management vendor france"] portent une proposition orientée planning, gestion des temps, conformité et expérience manager/collaborateur. citeturn3search9turn3search10turn3search6turn3search18

Dans la logistique/entrepôt, les solutions “labor management” liées au supply chain execution (ex. entity["company","Manhattan Associates","supply chain software vendor"] et entity["company","Blue Yonder","supply chain software vendor"]) sont pertinentes car elles modélisent main-d’œuvre, scénarios, performance et exécution au contexte de l’entrepôt. citeturn3search7turn3search11

Le différenciateur potentiellement le plus fort de Praedixa n’est donc pas “prédire mieux”, mais d’industrialiser un moteur de décision qui explicite et trace l’arbitrage :

\[
\min\_{a \in \mathcal{A}} \ \mathbb{E}\big[C(a)\big] \quad \text{sous contrainte} \quad \mathbb{E}\big[1 - S(a)\big] \le \varepsilon
\]

où \(a\) est une action/scénario (HS, intérim, réallocation, dégradation contrôlée), \(C(a)\) le coût total (direct + coûts d’urgence + coût du non-service), et \(S(a)\) un proxy de service. L’intérêt “DAF-compatible” vient du fait que chaque \(a\) s’accompagne d’hypothèses versionnées, d’un log de décision, puis d’une comparaison au réalisé. citeturn4view0

## Go-to-market et preuves attendues en POC

Pour être “consulting-grade” en POC (6–8 semaines), le pivot est la **preuve d’impact** : pas seulement un signal, mais une chaîne complète “alerte → décision → exécution → résultat”. Praedixa décrit explicitement cette boucle et l’ambition de produire une preuve économique auditable (CODIR/DAF), ainsi qu’un playbook d’options chiffrées. citeturn4view0

Le wedge “plugin agences d’intérim + capacity hedging” a du sens économique surtout dans un monde où l’intérim est volatil et soumis à des cycles : entity["organization","Prism'emploi","temporary work industry association france"] documente par exemple une baisse d’environ 7% de l’emploi intérimaire en 2024, avec une baisse transport-logistique d’environ 7,1% sur l’année (dans leur dossier “Bilan 2024 et perspectives 2025”). Ce type de dynamique accroît la valeur d’un pilotage robuste des options (réserver tôt/ajuster/annuler) pour réduire les “fallbacks” coûteux. citeturn7view0

Côté “demande RH”, entity["organization","France Travail","french public employment service"] indique que pour l’enquête BMO 2025, il y a 2,4 millions de projets de recrutement et 50,1% jugés difficiles—signal utile pour le narratif “tension durable” et pour la construction de vertical playbooks où la couverture est structurellement fragile. citeturn5search1turn5search19

## Risques, conformité et diligence

Réglementairement, la trajectoire de l’AI Act est un sujet “board-level” : la entity["organization","Commission européenne","executive body of the european union"] indique que l’AI Act est entré en vigueur le 1er août 2024 et sera pleinement applicable le 2 août 2026 (avec obligations progressives, dont certaines dès février 2025 et pour les GPAI dès août 2025). Pour Praedixa, la stratégie “pas de décision/prediction individuelle, données agrégées” est un avantage de minimisation des risques, mais il reste nécessaire de formaliser : qualification du cas d’usage, gouvernance, journalisation, et documentation d’évaluation. citeturn1search11turn4view0turn1news41

Sur la donnée, au-delà du RGPD, le risque principal de déploiement est qualité/fraîcheur : reconstituer correctement charge, capacité, contraintes, et coûts à une granularité exploitable (site × créneau × compétence). Les statistiques entity["organization","Eurostat","eu statistical office"] (progression ERP/cloud) sont encourageantes au niveau macro, mais n’empêchent pas une hétérogénéité forte des exports au niveau micro—d’où l’importance d’une brique “diagnostic data + base canonique rejouable” telle que décrite. citeturn2search1turn2search2turn4view0

Enfin, le point de diligence le plus concret à court terme est le **schéma d’hébergement et de transferts** : il faut réconcilier (i) les promesses marketing éventuelles autour de la localisation, et (ii) l’information des mentions légales (hébergement via entity["company","Cloudflare","web hosting and cdn vendor"]). Cela se traite proprement via une annexe technique : architecture cible, résidence des données, sous-traitants, et clauses contractuelles (DPA/SCC). citeturn5search3turn4view0
