# Audit et refonte globale de la landing page Praedixa

Date: 2026-03-05
Portee: `app-landing`
Auteur: Codex

## 1. Synthese executive

La landing actuelle a une base serieuse: proposition de valeur deja structuree, parcours FR/EN propre, CTA audit pertinent, forms globalement solides, et un debut de langage premium creme + navy. En revanche, elle ne transmet pas encore le niveau "oeuvre d'art premium" attendu, et surtout elle ne convertit pas encore comme une page B2B haut de gamme devrait le faire.

Le probleme principal n'est pas le manque d'information. C'est l'orchestration. La page explique beaucoup, mais elle ne dramatise pas assez l'enjeu, ne concretise pas assez vite la preuve, et dilue la tension conversionnelle dans une succession de teasers assez homogene. Le visiteur comprend qu'il s'agit d'un copilote IA decisionnel. Il ressent moins clairement:

- pour qui c'est fait exactement
- quel moment critique Praedixa evite
- quelle preuve economique il recevra
- pourquoi agir maintenant plutot que plus tard

La refonte recommande une direction claire:

- faire de la landing une "decision room" editoriale et premium
- reduire la page a un seul recit: detecter -> arbitrer -> declencher -> prouver
- remplacer les blocs teaser par des blocs-preuves a forte densite de valeur
- recentrer la conversion sur un CTA principal unique: l'audit historique
- releguer la candidature pilote comme CTA secondaire de qualification, pas comme demande principale dans le hero

## 2. Ce que j'ai audite

Audit de code:

- composition de la home: `app-landing/app/[locale]/page.tsx`
- hero et structure des sections: `app-landing/components/homepage/*`
- navigation et CTA persistants: `app-landing/components/shared/Header.tsx`
- tokens visuels et styles globaux: `app-landing/app/globals.css`
- page audit: `app-landing/components/pages/ContactPageClient.tsx`
- page pilote: `app-landing/components/pages/PilotApplicationPageClient.tsx`
- assets et composants riches non utilises sur la home: `HowItWorksSection`, `DeliverablesSection`, `PilotSection`, `ContactCtaSection`

Audit du rendu:

- revue desktop et mobile via Playwright sur `http://localhost:3000/fr`
- revue des pages de conversion:
  - `http://localhost:3000/fr/contact?intent=audit`
  - `http://localhost:3000/fr/devenir-pilote`

Signaux techniques:

- presence d'un ancien audit Lighthouse dans `.lighthouseci/`
- score historique sur `/fr`: performance `0.67`, accessibilite `0.96`, bonnes pratiques `0.93`, SEO `1`
- principaux points faibles historiques: LCP `3.5 s`, TBT `1,150 ms`, contraste, labels accessibles, JS inutile

## 3. Ce qui fonctionne deja

### 3.1 La these produit existe deja

Le socle strategique est bon: anticipation, arbitrage cout/service/risque, action assistee, preuve ROI. C'est un vrai angle, pas une promesse IA generique.

### 3.2 Le CTA audit est le bon cheval de bataille

L'audit historique offert est une excellente offre d'entree. Il baisse le risque, rend la promesse concrete, et permet une discussion qualifiee sans demander un engagement lourd.

### 3.3 Le hero a deja un actif fort

Le `HeroProofPanel` est une bonne idee: il ancre Praedixa dans des contextes reels, rend la page plus vivante, et donne un debut de "produit tangible".

### 3.4 Les forms sont mieux penses que la moyenne

La page audit garde peu de champs obligatoires. C'est une vraie force pour un premier point de conversion.

### 3.5 L'infrastructure de contenu est deja plus riche que la home

Le repo contient des sections plus editoriales et premium que la home actuelle n'utilise pas encore:

- `HowItWorksSection`
- `DeliverablesSection`
- `PilotSection`
- `ContactCtaSection`

Autrement dit: une partie de la matiere d'une landing premium existe deja. Le probleme est surtout l'assemblage.

## 4. Les problemes de fond

## 4.1 Positionnement encore trop abstrait dans le hero

Le hero actuel dit:

- "Copilote IA pour reseaux multi-sites."
- "Protegez la marge et le niveau de service malgre la variabilite."

Cette formulation est propre, mais trop large pour un decideur presse. Elle dit la categorie, pas l'instant critique ni la transformation concrete.

Ce qu'il manque:

- un enjeu economique immediat
- une temporalite nette
- un effet concret sur la prise de decision
- une preuve ou un actif visible des la ligne de flottaison

En l'etat, le hero est plus "bon produit B2B" que "page impossible a ignorer".

## 4.2 La home est composee de teasers, pas d'une montee en intensite

La home assemble:

- hero
- probleme
- positionnement
- teaser boucle fermee
- use cases
- teaser ROI
- teaser integration
- teaser services
- FAQ

Le probleme n'est pas chaque bloc pris isolément. C'est leur densite comparable. Beaucoup de sections disent "voici un apercu". Peu de sections disent "voici la preuve qui change la conversation".

Resultat:

- le rythme est plat
- la sensation premium s'affaiblit
- la page manque de crescendos
- le visiteur scrolle sans sentir de revelation majeure

## 4.3 La page montre trop peu de preuve sociale et trop peu de preuve economique

Pour une offre B2B sensible, les visiteurs ont besoin de trois formes de reassurance:

- preuve de serieux
- preuve de pertinence sectorielle
- preuve de rentabilite

Aujourd'hui la page explique le dispositif mais montre peu:

- pas de logos clients ou partenaires exploites comme reinsurance principale
- pas de resultat scenario-type par verticale
- pas de "ce que voit un COO / DAF / directeur reseau"
- pas de mini cas avant/apres visible dans la home

Le discours "audit-ready" est bien pense, mais encore trop textuel.

## 4.4 L'identite visuelle premium n'est pas encore totalement alignee

Le skill UX mentionne une direction creme / amber / charcoal avec Plus Jakarta Sans et DM Serif Display. La realite actuelle est plus froide:

- le layout charge `GeistSans` et `GeistMono`
- les accents sont fortement remappes vers le navy
- les CTA principaux utilisent un gradient navy massif

Ce n'est pas incoherent, mais cela produit une sensation plus "SaaS moderne propre" que "maison premium memorisable".

En pratique:

- la page n'assume pas assez un contraste editorial entre un serif expressif pour les grands titres et un sans discipliné pour l'interface
- le brass/amber joue un role secondaire alors qu'il pourrait devenir la signature emotionnelle
- les sections dark sont nombreuses mais peu differenciees entre elles

## 4.5 La navigation est trop riche pour une landing de conversion

Le header expose plusieurs megamenus: produit, solutions, service, ressources, entreprise, contact.

Pour un site marketing global, c'est defensible.
Pour une landing de conversion premium, c'est trop de branches cognitives des la premiere seconde.

Le header actuel repond a l'architecture du site.
Il repond moins a l'objectif de conversion du pageflow principal.

## 4.6 Le parcours de conversion est bon pour l'audit, plus lourd pour le pilote

Constat positif:

- la page audit est courte et raisonnablement fluide
- seuls `entreprise`, `email`, `message`, `consentement` et le challenge anti-spam sont indispensables

Constat de vigilance:

- le bouton reste desactive tant que le challenge anti-spam n'est pas charge et resolu
- la page pilote demande davantage d'informations, ce qui est logique, mais trop lourd pour rester une CTA de hero au meme niveau que l'audit

Conclusion:

- `Obtenir l'audit` doit etre le primaire quasi unique sur la landing
- `Candidater au pilote` doit exister plus bas, apres accumulation de preuve et qualification

## 4.7 Performance et accessibilite: plutot saines, mais pas encore premium

Les signaux techniques sont bons mais pas irreprochables:

- accessibilite historique haute
- SEO historique excellent
- performance historique en retrait

Pour une landing premium, la fluidite percue fait partie du positionnement. Un LCP ou TBT mediocre degrade autant la conversion que la perception de valeur.

## 5. References de code a retenir

Les points suivants sont les plus structurants:

- la home n'utilise aujourd'hui que des sections teaser: `app-landing/app/[locale]/page.tsx`
- la typo principale est `GeistSans` et non la paire premium attendue: `app-landing/app/layout.tsx`
- les accents et CTA sont tires vers le navy: `app-landing/app/globals.css`
- toutes les sections partagent une hauteur verticale importante, ce qui renforce l'effet de dilution: `app-landing/components/shared/SectionShell.tsx`
- le hero oppose deux CTA de meme poids trop tot: `app-landing/components/homepage/HeroSection.tsx`
- la page audit est une tres bonne base de conversion a faible friction: `app-landing/components/pages/ContactPageClient.tsx`
- la page pilote est plus qualifiante et doit donc etre reservee a un trafic plus chaud: `app-landing/components/pages/PilotApplicationPageClient.tsx`
- des sections beaucoup plus riches existent deja mais ne sont pas sur la home: `HowItWorksSection`, `ContactCtaSection`, `PilotSection`, `DeliverablesSection`

## 6. Trois directions creatives possibles

## Option A - Atelier de decision premium

Direction recommandee.

Image mentale:

- un melange entre salle de pilotage, revue de comite et piece editoriale haut de gamme
- creme mat, navy structurel, brass comme signal et acceleration
- grand hero tres calme, puis montee en precision
- sensation de dossier de decision vivant

Forces:

- premium sans etre tape-a-l'oeil
- compatible avec des acheteurs COO / DAF / DG
- permet d'injecter de l'art par la composition, la typo, la texture, les diagrams et la motion
- tres bon alignement avec la promesse "audit-ready"

Faiblesses:

- demande une execution tres disciplinee pour ne pas devenir trop sage

## Option B - War room executive

Image mentale:

- plus sombre, plus nerveuse, plus operationnelle
- dashboards, lignes, pulses, temporalite forte

Forces:

- tres forte sensation de controle
- bon fit operations / supply / reseaux

Faiblesses:

- peut paraitre plus froide et moins "maison premium"
- plus proche d'un SaaS tech classique

## Option C - Galerie de signaux

Image mentale:

- landing plus artistique, tres narrative
- sections comme des tableaux, alternance d'images, textures et fragments de Decision Log

Forces:

- memorabilite tres forte
- potentiel "oeuvre d'art" eleve

Faiblesses:

- risque de sacrifier la clarte conversionnelle
- demande une qualite visuelle tres haute pour ne pas devenir demonstratif

## Recommandation

Choisir l'option A, puis injecter quelques touches de l'option C dans:

- le hero
- le bloc preuve ROI
- la conclusion

## 7. Refonte recommandee: nouvelle architecture de page

## 7.1 Header

Objectif:

- reduire la charge cognitive
- garder le CTA visible
- faire comprendre que l'action naturelle est l'audit

Recommandation:

- logo
- 3 ancres max sur la landing: Methode, Preuve, Integrations
- CTA sticky: `Obtenir un audit historique`
- basculer la navigation complete dans le footer et les pages profondes

## 7.2 Hero

Objectif:

- expliquer la valeur en 3 secondes
- donner une impression premium immediate
- faire sentir l'economie de la decision, pas seulement la technologie

Structure proposee:

- kicker: `Decision intelligence pour reseaux multi-sites`
- headline:
  `Anticipez les derives d'exploitation avant qu'elles ne mangent votre marge.`
- subheadline:
  `Praedixa detecte les tensions J+3 a J+14, compare les options sous vos regles, lance la premiere action et prouve chaque mois l'effet sur cout, service et risque.`
- CTA primaire: `Obtenir un audit historique`
- CTA secondaire: `Voir un Decision Log`
- microproof line:
  `Lecture seule. Validation manager. Heberge en France.`

Visuel:

- conserver l'idee du panel contextuel
- le simplifier en une scene plus iconique
- ajouter un extrait visible de Decision Log ou de preuve ROI des le hero
- montrer une micro-fragmentation "baseline / recommande / reel" sans attendre le milieu de page

## 7.3 Barre de reassurance immediate

Juste sous le hero:

- `Pour COO, DAF, directions reseau`
- `Demarrage en lecture seule`
- `Pas de remplacement d'outil`
- `Preuve mensuelle audit-ready`

Si vous avez des logos exploitables, les mettre ici.
Sinon, afficher des preuves structurelles plutot que des slogans.

## 7.4 Section "Quand ca casse"

Transformer le bloc probleme en section plus dramatique:

- 3 scenes courtes et visuelles
- pour chaque scene:
  - contexte
  - mauvaise decision typique
  - cout visible

Exemple:

- `Pic de charge magasin -> renfort tardif -> erosion marge + service`
- `Absence atelier -> arbitrage au feeling -> delai client + surcharge`
- `Comite mensuel -> impact discutable -> budget conteste`

L'important n'est pas de lister des douleurs.
L'important est de faire sentir la perte.

## 7.5 Section "Ce que fait Praedixa vraiment"

Ici il faut remplacer le simple positionnement par un mecanisme visible:

- detecter
- arbitrer
- declencher
- prouver

Bonne nouvelle:

- la version riche de `HowItWorksSection` deja presente dans le repo est bien plus convaincante que le teaser actuel

Recommendation:

- utiliser la structure de `HowItWorksSection` comme base
- y ajouter un exemple par etape
- lier chaque etape a un output visible

## 7.6 Section "La preuve que le comite comprend"

Cette section doit devenir le coeur premium de la page.

Base de contenu:

- `DeliverablesSection` ou une version hybride plus elegante

Structure:

- titre:
  `La preuve que Operations et Finance peuvent enfin lire ensemble`
- colonnes:
  - baseline
  - recommande
  - reel
- sous-bloc:
  - hypothese
  - decision prise
  - resultat observe
  - impact budget/service

Il faut une vraie mise en scene de la preuve, presque museale.
Pas trois petites cartes identiques.

## 7.7 Section "Par contexte metier"

Le `HeroProofPanel` et les use cases actuels sont utiles, mais trop separes.

Recommandation:

- fusionner l'idee de selection sectorielle avec des preuves par verticale
- pour chaque verticale:
  - tension recurrente
  - KPI suit
  - arbitrages typiques
  - preuve attendue

Format ideal:

- rail gauche: verticales
- panneau droit: cas concret + KPI + output Decision Log

## 7.8 Section "Integration & gouvernance"

Cette section doit rassurer les profils prudents sans casser le desir.

Contenu:

- lecture seule au depart
- donnees agregees
- validation humaine
- hebergement France
- RBAC / chiffrement

Presentation:

- moins de bullets generiques
- plus de structure "objection -> reponse"

Exemple:

- `Vous craignez un projet IT lourd ?`
  `Praedixa demarre sur exports ou API en lecture seule.`

## 7.9 Section "Offre de demarrage"

Aujourd'hui le pilote apparait de facon assez administrative.
Il faut le transformer en offre claire et desirable.

Structure recommandee:

- bloc 1: `Audit historique offert`
- bloc 2: `Pilotage ferme 90 jours`
- bloc 3: `Jalon preuve S8`

La `PilotSection` existante peut servir de base, mais la home doit rester plus legere que la page pilote dediee.

## 7.10 FAQ finale

Conserver la FAQ, mais la rendre plus executive:

- `Faut-il changer nos outils ?`
- `Qui garde la main sur la decision ?`
- `Comment prouvez-vous l'effet financier ?`
- `Quand voit-on les premiers signaux fiables ?`

En dessous:

- un seul CTA primaire fort
- un CTA secondaire discret

## 8. Evolution du copywriting

## Ce qu'il faut garder

- le vocabulaire de l'arbitrage
- la notion de Decision Log
- la preuve mensuelle
- la lecture seule
- la validation manager

## Ce qu'il faut changer

- moins de formulations institutionnelles
- moins de repetition de "cout / service / risque" sans mise en situation
- plus de phrases orientees consequence
- plus de specificite sur le decideur
- plus de formulations "avant / pendant / apres"

## Exemples de titres plus forts

Hero:

- `Avant que vos sites ne derapent, Praedixa arbitre et prouve.`
- `Transformez les signaux faibles terrain en decisions defendables en comite.`
- `L'IA qui n'aide pas seulement a prevoir, mais a decider et a prouver.`

Preuve:

- `La preuve mensuelle que Finance peut lire sans debat sterile.`

Integration:

- `Se brancher sans tout remplacer.`

Offre:

- `Commencez par une preuve, pas par un chantier.`

## 9. Conversion: strategie recommande

## CTA principal

Unique partout:

- `Obtenir un audit historique`

Pourquoi:

- faible risque
- fort pouvoir de concretisation
- compatible avec traffic tiede
- tres bon pont vers un entretien qualifie

## CTA secondaire

- `Voir un Decision Log`

Pourquoi:

- apporte de la preuve sans forcer une demande
- sert les visiteurs plus sceptiques

## CTA tertiaire

- `Candidater au pilote`

Pourquoi:

- a reserver aux visiteurs deja convaincus
- a placer plus bas, jamais a poids egal avec l'audit dans le hero

## 10. Reuse intelligent du code existant

La refonte ne repart pas de zero.

Je recommande de reutiliser:

- `HowItWorksSection` comme base de la section mecanisme
- `ContactCtaSection` comme base du final CTA premium
- `PilotSection` comme base de l'offre de demarrage
- `DeliverablesSection` comme base de la preuve ROI
- `HeroProofPanel` comme point de depart du hero vivant

Et de retirer ou fusionner:

- `ClosedLoopTeaserSection`
- `RoiProofTeaserSection`
- `IntegrationTeaserSection`
- `ServicesPilotTeaserSection`

L'objectif est de remplacer quatre apercus faibles par deux sections fortes.

## 11. Priorites d'implementation

## Phase 1 - Repositionnement et impact visuel

- simplifier le header
- refondre le hero
- installer la vraie paire typographique premium
- reintroduire le brass comme accent emotionnel principal
- remplacer les teasers par une narration continue

## Phase 2 - Preuve et reassurance

- section preuve ROI forte
- section verticales avec KPI et cas
- bloc integration/gouvernance plus net
- footer moins dense, plus premium

## Phase 3 - CRO et mesure

- instrumentation CTA hero / CTA milieu / CTA final
- mesure scroll depth
- mesure form start rate et form completion rate
- mesure clic vers pilot page
- tests A/B sur headline, CTA secondaire et hero proof module

## 12. KPI a suivre apres refonte

- CTR hero -> audit
- taux de demarrage du form audit
- taux de completion du form audit
- clic vers preuve ROI
- clic vers pages verticales
- ratio audit vs pilot applications
- temps moyen avant premier CTA click
- scroll depth a 50% et 75%

## 13. Sources externes utiles pour cadrer la refonte

Ces sources confirment les principes a appliquer:

- Nielsen Norman Group: les visiteurs jugent tres vite la credibilite d'une interface, la clarte visuelle et la proposition de valeur doivent etre immediates.
- Baymard Institute: reduire les champs et la friction des formulaires augmente la completion.
- web.dev: degrades de performance comme un LCP trop haut et un rendu lent affectent directement l'experience et les conversions.

Liens:

- https://www.nngroup.com/reports/trust-online/
- https://baymard.com/blog/checkout-flow-average-form-fields
- https://web.dev/articles/lcp

## 14. Recommendation finale

Praedixa ne doit pas chercher une landing "belle" au sens cosmetique.
Elle doit chercher une landing qui fasse ressentir ceci:

- `ils comprennent nos arbitrages`
- `ils savent les rendre defendables`
- `ils peuvent prouver l'impact`

La bonne refonte n'est donc pas un re-skin.
C'est un passage:

- d'une home qui presente Praedixa
- a une landing qui met un decideur dans la situation de dire:
  `je veux voir mon audit`

La direction recommande est:

- plus editoriale
- plus premium
- plus concrete
- plus finance-compatible
- plus centree sur la preuve que sur la description

Si nous passons a l'implementation, la premiere iteration doit viser:

1. nouveau hero
2. nouvelle structure narrative
3. section preuve ROI forte
4. simplification du systeme de CTA
