# Praedixa - Investor Context (Pre-seed)

Date: 2026-03-04
Stage: pre-seed (idee / cadrage)
Audience: investisseurs, advisors, partenaires (memo de reference)
Statut: document de travail (hypotheses a valider, pas de claims de traction)
Version: 0.2

## TL;DR (ce que Praedixa fait, en 60 secondes)

- Praedixa construit un copilote IA d'arbitrage operationnel pour reseaux multi-sites (PME/ETI, franchiseurs, multi-franchises).
- Pain: activite variable => decisions sous pression => derive des KPI (cout, service, risque) => perte de productivite et de rentabilite.
- Wedge MVP (choisi): arbitrage "demande vs capacite" pour reduire les couts variables (interim / heures sup / sous-traitance), garde-fou: niveau de service (ex: temps d'attente en restauration rapide).
- Differenciation: pas un dashboard, pas un outil de planning, pas un projet de remplacement: on standardise les options, on calcule l'option optimale sous contraintes, on declenche la 1re etape d'execution, puis on prouve le ROI par contrefactuel.
- Demarrage: lecture seule sur les outils existants (exports / APIs), valeur rapide via pilote 3 mois avec jalon de preuve.
- Confiance: AI Act + RGPD by design (traceabilite, audit, human-in-the-loop) comme accelerateur de vente, pas comme contrainte.

## 1) One-liner (a utiliser partout)

Copilote IA d'arbitrage operationnel pour reseaux multi-sites, afin de proteger la marge et le niveau de service malgre la variabilite.

## 2) Positionnement (ce que nous sommes / ce que nous ne sommes pas)

Praedixa = OS de decision operationnelle (decision intelligence), pas un outil d'execution de plus.

Nous sommes:
- Une couche d'anticipation + arbitrage + ROI (au-dessus des outils existants).
- Un service aux entreprises qui standardise des decisions recurrentes et les rend defendables.
- Un copilote qui accelere la decision et la rend comparable dans tout le reseau.

Nous ne sommes pas:
- Un outil de gestion du planning du personnel: Praedixa optimise l'arbitrage economique sous contraintes (cout/service/risque), le planning reste chez le client.
- Un projet de remplacement ERP/CRM/BI: on demarre en lecture seule.
- Une IA autonome "boite noire": validation humaine obligatoire + traces auditables.

## 3) ICP (qui achete, qui utilise, qui paye)

Segments cibles (prioritaires):
- PME/ETI et reseaux multi-sites avec forte variabilite d'activite.
- Logistique, retail, transport, sante privee, multi-franchises.

Beachhead (choisi): multi-franchise (reseaux de franchises multi-sites), en particulier restauration rapide.

Personae:
- Acheteur: CFO/DAF + COO/Direction des operations (siege).
- Utilisateurs: ops, responsables de site/reseau, managers terrain.
- Sponsor IT: pour la connexion read-only + automatisations ciblees.

## 4) Le probleme (version investisseur)

Dans les reseaux multi-sites, la variabilite cree un "decision gap":
- Les signaux existent (donnees), mais arrivent trop tard, sont illisibles, ou ne sont pas connectes a une action.
- Les leviers existent (renfort, reaffectation, sous-traitance, ajustement de service), mais ne sont pas standardises, donc pas comparables.
- Les arbitrages se font au feeling: difficile a defendre economiquement, difficile a industrialiser.
- L'execution est manuelle: trop lente, trop heterogene selon les sites.
- Le ROI est discutable: difficile de generaliser et de budgeter.

Resultat:
- Argent "brule" en couts variables mal calibres.
- Niveau de service instable (ex: temps d'attente, retards, experience client degradee).
- Rentabilite qui varie plus que l'activite elle-meme.

## 5) La solution (boucle de decision fermee)

Praedixa apporte une boucle de decision fermee, orientee ROI:
- Anticiper les derives KPI a court horizon.
- Standardiser les options d'action (playbooks) et les pre-requis.
- Chiffrer les options sur un cadre commun: cout / service / risque + regles internes.
- Calculer la meilleure option sous contraintes, puis declencher la 1re etape d'execution (assistee).
- Prouver le ROI avec un scenario contrefactuel: baseline / recommande / reel, hypotheses explicites.

## 6) Wedge MVP (choisi): arbitrage capacite operationnelle

Promesse:
- Reduire les couts variables (interim / heures sup / sous-traitance).
- Sans degrader le service (garde-fou: temps d'attente en restauration rapide).

Ce que le client obtient concretement:
- Une prevision simple a lire (demande attendue vs capacite disponible).
- Une liste d'options d'action standardisees (playbooks) avec impact chiffre.
- Une recommandation unique "meilleure option" (ou top 2 si besoin), justifiee.
- La 1re etape d'execution declenchee (ex: demande de renfort, reallocation, creation de tache, message, ticket), puis validation humaine.
- Un rapport mensuel de ROI (economies / couts evites) defendable devant DAF.

## 7) Exemple (multi-franchise, restauration rapide) - scenario concret

Contexte:
- Activite variable (semaine, meteo, evenements locaux, promos).
- Marge sous pression.
- Temps d'attente = metrique service non negociable.

Semaine N:
- Praedixa anticipe une derive: surcout variable probable sur plusieurs points de vente.
- Praedixa propose des options standardisees (playbooks) et chiffre l'impact:
  - Reallocation de capacite entre sites proches.
  - Sous-traitance ponctuelle.
  - Ajustement de service sur un creneau precis.
  - Renfort cible (au bon endroit, au bon moment), plutot qu'un renfort "large".
- Praedixa recommande l'option optimale sous contraintes:
  - KPI principal: cout variable.
  - Garde-fou: temps d'attente.
- Praedixa automatise la 1re etape (assistee) et trace la decision.

Fin de mois:
- Praedixa compare:
  - Baseline (ce qui se serait passe sans intervention).
  - Recommande (scenario optimal sous contraintes).
  - Reel (ce qui a ete execute).
- Le tout avec hypotheses explicites, auditables (contrefactuel).

Note: les exemples d'impact type "2 interims evites sur 1 mois = ~6k EUR" sont illustratifs, a valider en pilote.

## 8) ROI (comment on le rend defendable)

Unite de valeur:
- Euros economises (ou euros evites) sur les couts variables.

Principe:
- On ne demande pas au client de "croire" l'IA.
- On apporte une preuve economique exploitable par Finance.

Methode:
- Baseline: estimation de reference (historique + patterns).
- Recommande: resultat des arbitrages proposes.
- Reel: donnees d'execution et KPI observes.
- Contrefactuel: scenario "sans Praedixa" reconstruit avec hypotheses explicites.

Livrables:
- Report mensuel ROI (par reseau, par site, par type d'arbitrage).
- Decision log (pour audit interne et apprentissage).

## 9) Demarrage et execution (read-only first)

Principe de deploiement:
- Lecture seule d'abord: on se branche sur les outils existants (exports / APIs).
- Aucun remplacement au demarrage.
- Automatisation ensuite, uniquement sur la 1re etape, et toujours avec validation humaine.

Sources de donnees typiques (selon client):
- Ventes / transactions (ex: POS), commandes, promos.
- Activite operationnelle (volumes, files, delais, tickets).
- Cout et contraintes (cout variable, regles internes, capacite contractuelle).
- Outils metier deja en place (ERP/CRM/BI, etc.).

## 10) Offre pre-seed (package pilote)

Objectif:
- Livrer une preuve economique rapide, puis etendre.

Format cible:
- Audit historique (read-only) pour chiffrer le potentiel et prioriser.
- Pilote 3 mois, avec jalon de preuve (ex: S8) et rapport ROI mensuel.
- Extension progressive: plus de sites, puis plus de types d'arbitrages.

Ce qu'on vend (conversion):
- Proof > dashboard: on vend une preuve economique et une boucle de decision, pas une "IA".
- Binome Ops/Finance: decision + budget + gouvernance dans le meme livrable.

## 11) Why now

Trois tendances rendent Praedixa possible et urgent maintenant:
- Data readiness: les PME/ETI s'equipent (ERP, CRM, outils metier, BI, WMS/TMS, POS) et accumulent des historiques exploitables.
- Adoption IA + automatisation: l'usage IA se normalise, et les operations deviennent un terrain de gain prioritaire.
- Contexte Europe/France: push (France 2030 / BPI), tensions de souverainete et cadres (AI Act + RGPD) qui rendent les solutions gouvernables et locales plus attractives.

## 12) Market opportunity (comment on le chiffre, sans pipeau)

Approche (pre-seed):
- On ne "devine" pas un TAM: on le reconstruit a partir de segments + ACV.
- On priorise un SAM realiste: multi-franchise multi-sites avec forte variabilite + douleur cout variable.

Cadre de sizing (a remplir):
- TAM: (nombre de reseaux multi-sites en Europe) x (ACV cible).
- SAM (12-24 mois): (nombre de reseaux multi-franchise adressables France/Benelux) x (ACV cible).
- SOM (12 mois): (nombre de pilotes signables) x (conversion en abonnement) x (ACV).

Hypothese cle:
- L'ACV augmente avec: nombre de sites, frequence des arbitrages, et maturite Ops/Finance.

## 13) Confiance: AI Act + RGPD comme force

Position:
- Conformite comme accelerateur commercial: plus simple a faire adopter a un reseau (siege + sites).

Principes "by design" (niveau non technique):
- Human-in-the-loop: validation humaine obligatoire sur les actions.
- Explicabilite pragmatique: on justifie une recommandation par contraintes, cout, service, risque.
- Traceabilite: decision log, hypotheses, donnees sources, versionnement des regles.
- Minimisation: on ne collecte que le necessaire pour les KPI cibles.

## 14) Go-to-market (hypothese)

Beachhead:
- Multi-franchise (restauration rapide), ou les arbitrages sont frequents, repetables, et mesurables.

Moteur de conversion:
- Un CFO achete une preuve: "x euros economises" defendables, pas "un modele".

Canaux a tester:
- Direct (DAF/COO reseaux multi-sites).
- Partenaires (integrateurs, cabinets ops/finance, editeurs metier), a valider.

Land and expand:
- 1er arbitrage (capacite) sur un sous-ensemble de sites.
- Extension au reseau.
- Puis ajout d'autres arbitrages (stock, transport, qualite, etc.) si necessaire.

## 15) Business model (hypotheses a tester)

Structure:
- Ticket pilote (3 mois) + abonnement ensuite.

Pricing possible (a valider):
- Par site (full package: 100-300 EUR / site / mois, selon perimetre et volume).
- Par reseau.
- Par volume d'arbitrages (decisions) ou perimetre (types de playbooks).

Option (a tester plus tard):
- Composante "success fee" sur une partie du ROI, si mesurable et acceptable.

## 16) Competitive landscape (comment on se differencie)

Alternatives courantes:
- Tableurs + experience terrain (rapide, mais non scalable, non defendable).
- BI / dashboards (mesure, mais ne decide pas et n'execute pas).
- Outils de prevision specialises (souvent = forecast, pas closed-loop action + ROI).
- Conseil ops (efficace, mais cher, pas produit, peu industrialisable).
- Suites metier (souvent lourdes a deployer, et pas orientees preuve ROI rapide).

Praedixa se distingue par:
- La standardisation des options (playbooks) et leur comparaison "a contraintes egales".
- L'optimisation sous contraintes (cout/service/risque) et la recommandation actionnable.
- L'automatisation de la 1re etape + human-in-the-loop.
- La preuve ROI par contrefactuel, mensuelle, defendable Finance.
- Le deploiement en surcouche (lecture seule d'abord), rapide, sans remplacement.

## 17) Moat (pourquoi on gagne a long terme)

Moats a construire / renforcer:
- Bibliotheque de playbooks d'actions standardisees par vertical.
- Decision log + base de donnees d'arbitrages (structure + outcomes) => apprentissage et defensibilite.
- Moteur ROI (contrefactuel) gouvernable et audit-ready.
- Integration en surcouche rapide (lecture seule d'abord), puis automatisations ciblees.
- Conformite (AI Act / RGPD) by design => adoption plus simple dans les reseaux.

## 18) Roadmap (12-18 mois, version pre-seed)

Objectif: passer de "idee" a "pilotes repetables" puis "abonnement reseau".

Etapes (hypotheses):
- 0-3 mois: clients pilotes + 1er pilote multi-franchise (capacite), moteur ROI v1.
- 3-6 mois: replication sur 2-3 reseaux, playbooks stabilises, automatisations v1.
- 6-12 mois: industrialisation (multi-sites), decision log, gouvernance, onboarding rapide.
- 12-18 mois: extension a d'autres arbitrages (stock, transport, etc.) selon demande marche.

## 19) Milestones (ce qu'on veut prouver avant une Seed)

Objectif: demontrer repetabilite + ROI defendable + capacite a deployer.

Milestones (hypotheses):
- 2-3 clients pilotes actives (cadrage + data access en lecture seule).
- 2-3 pilotes multi-sites completes avec ROI mensuel defendable.
- 1er "playbook set" stabilise (capacite) replicable d'un reseau a l'autre.
- Time-to-proof court (ex: premier jalon de preuve en < 8 semaines).
- Conversion pilote -> abonnement sur au moins 1 reseau.

## 20) Use of funds (pre-seed)

Priorites (ordre):
- Construire le coeur produit: playbooks, moteur d'optimisation, ROI contrefactuel, decision log.
- Industrialiser l'onboarding data (lecture seule) et les integrations en surcouche.
- Lancer les pilotes et produire la preuve ROI (ops + finance) de facon repetable.

Profils cle (hypotheses):
- Product/ops: structurer playbooks + rituels de decision.
- Data/ML: previsions + moteur ROI + monitoring.
- Fullstack: integrations + decision log + automatisations.
- Sales: cycle reseau multi-sites (DAF/COO).

## 21) Risques (et mitigations)

Risques:
- Qualite / disponibilite des donnees.
- Adoption terrain (changement d'habitudes, confiance).
- Cycle de vente en PME/ETI multi-sites.
- Mesure ROI contestee si hypotheses floues.

Mitigations:
- Demarrage read-only, perimetre restreint, jalon de preuve rapide.
- Human-in-the-loop + playbooks standardises + rituels Ops/Finance.
- ROI contrefactuel avec hypotheses explicites et auditables.

## 22) Questions a trancher (reste ouvert)

- Pricing: par site vs par reseau vs par decision.
- Horizon de prevision: J+7 / J+14 / J+30 selon le vertical.
- Niveau d'automatisation acceptable (toujours assiste, jamais autonome).
- Canal initial: direct vs partenaires.
- Quels 2e et 3e types d'arbitrages une fois le wedge capacite prouve.
