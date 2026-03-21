# PRD

Ce dossier regroupe les documents de cadrage produit et les checklists de fermeture associees.

## Fichiers presents

- `Praedixa_PRD_DecisionOps_PRD_final.docx` : source bureautique originale du PRD
- `Praedixa_PRD_DecisionOps_PRD_final.md` : conversion Markdown de travail, diffable et lisible dans le repo
- `TODO.md` : checklist monorepo build-ready derivee du PRD et de l'etat reel du codebase
- `coverage-v1-thin-slice-spec.md` : tranche canonique Coverage V1 qui relie connectors, contrat, scenario, approval, dispatch et ledger
- `connector-activation-and-dataset-trust-spec.md` : spec operable de l'onboarding connecteur, du mapping, de la quarantaine, du replay et du dataset health
- `decision-contract-governed-publish-spec.md` : spec de gouvernance du `DecisionContract`, de son lifecycle et de ses liens vers approval, action et ledger
- `decision-graph-and-scenario-runtime-spec.md` : spec du `DecisionGraph` semantique, du runtime scenario persistant, des versions transverses et de l'explicabilite minimum
- `decision-ledger-and-roi-proof-spec.md` : spec du `Decision Ledger` finance-grade, de la preuve ROI, des revisions, du drill-down et des exports mensuels
- `control-plane-trust-gate-spec.md` : spec du trust gate control plane, de la fermeture demo/legacy, de l'audit append-only complet et des acces privilegies/support
- `ux-and-e2e-trust-paths-spec.md` : spec des shells webapp/admin, des page models, des etats degrades partages et des parcours E2E critiques
- `approval-and-action-mesh-governance-spec.md` : spec de la matrice d'approbation, de la justification structuree, de la SoD critique, de l'idempotence et de la sandbox Action Mesh
- `decisionops-operating-loop-spec.md` : spec runtime/UX de la boucle quotidienne `signal -> compare -> approve -> dispatch -> ledger`
- `build-release-sre-readiness-spec.md` : spec de fermeture des gates qualite, release, observabilite, performance et exit gate build-ready
- `decisionops-v1-execution-backbone.md` : epine dorsale d'execution V1 qui ordonne les streams, gates et cartes de travail a fermer
- `matrice-verification-parcours-confiance.md` : matrice de preuve merge/release pour les deux parcours critiques du produit
- `scaleway-fortress-security-prd.md` : PRD securite cible "porte blindee" pour la plateforme SaaS sur Scaleway, avec relais execution vers `docs/security/`

## Regles de travail

- Utiliser en priorite la version Markdown pour la lecture, l'annotation et le travail d'alignement avec le code
- Garder le `.docx` comme artefact source, sans en faire la reference principale pour le suivi technique
- Maintenir `TODO.md` comme checklist vivante des fermetures structurelles avant ajout de nouvelles features
- Utiliser `coverage-v1-thin-slice-spec.md` pour lire les chantiers ouverts comme une seule boucle produit Coverage V1, pas comme des tickets separes
- Utiliser `connector-activation-and-dataset-trust-spec.md` pour cadrer les chantiers d'activation connecteur et de confiance dataset
- Utiliser `decision-contract-governed-publish-spec.md` pour cadrer tout ce qui touche le lifecycle du contrat, les gates de publication, la SoD, les permissions de write-back et la reference ledger
- Utiliser `decision-graph-and-scenario-runtime-spec.md` pour cadrer tout ce qui touche le `DecisionGraph`, la semantic query API, le runtime scenario, les etats degrades et les preuves de regression
- Utiliser `decision-ledger-and-roi-proof-spec.md` pour cadrer la source de verite economique, la methode ROI, les revisions, les exports mensuels et la frontiere avec les proof packs
- Utiliser `control-plane-trust-gate-spec.md` pour cadrer les chemins demo/legacy/fallback, l'auth/RBAC/tenant safety, l'audit append-only, le break-glass et le support least-privilege
- Utiliser `ux-and-e2e-trust-paths-spec.md` pour cadrer les page models, les fetch patterns, les etats vides/degrades, la neutralite multi-pack et les E2E critiques
- Utiliser `approval-and-action-mesh-governance-spec.md` pour cadrer la matrice d'approbation, la justification structuree, la SoD d'execution, l'idempotence, les composites et la sandbox
- Utiliser `decisionops-operating-loop-spec.md` pour cadrer le runtime quotidien, les etats degrades, les surfaces webapp/admin et le parcours E2E critique
- Utiliser `build-release-sre-readiness-spec.md` pour cadrer ce qui rend le monorepo effectivement mergeable, releasable, observable et build-ready
- Utiliser `decisionops-v1-execution-backbone.md` pour transformer le PRD cible en ordre d'execution concret avant de creer du backlog
- Utiliser `matrice-verification-parcours-confiance.md` pour lier chaque chantier critique a une preuve merge/release explicite
- Utiliser `scaleway-fortress-security-prd.md` pour cadrer la cible securite infra/auth/secrets/ingestion/logs/restore sur Scaleway, puis fermer les ecarts via `docs/security/scaleway-fortress-control-matrix.md`

## Integration avec le reste de la doc

- Les exigences produit viennent du PRD
- La boucle produit canonique vient de la thin slice Coverage V1
- La confiance data vient du spec connecteurs/dataset trust
- La fondation gouvernee du contrat vient du spec de publish du `DecisionContract`
- Le noyau graph + runtime scenario vient du spec `decision-graph-and-scenario-runtime-spec.md`
- La preuve ROI et la verite economique viennent du spec `decision-ledger-and-roi-proof-spec.md`
- La fermeture du trust gate control plane vient du spec `control-plane-trust-gate-spec.md`
- Les parcours UX/E2E critiques viennent du spec `ux-and-e2e-trust-paths-spec.md`
- La gouvernance d'execution `approval + Action Mesh` vient du spec `approval-and-action-mesh-governance-spec.md`
- La boucle operationnelle quotidienne vient du spec operating loop
- La readiness merge/release/SRE vient du spec build-release
- L'ordre de fermeture prioritaire vient du backbone d'execution
- Les preuves de parcours critiques viennent de la matrice de verification
- La cible securite plateforme Scaleway vient du PRD cybersecurite "porte blindee" et de sa matrice d'execution cote `docs/security`
- Les preuves techniques viennent du code, des runbooks, des docs architecture/database/testing/security et des scripts versionnes
- Une case de `TODO.md` ne doit etre cochee que si elle est appuyee par une source verifiable dans le repo
