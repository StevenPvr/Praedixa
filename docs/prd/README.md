# PRD

Ce dossier regroupe les documents de cadrage produit et les checklists de fermeture associees.

## Fichiers presents

- `Praedixa_PRD_DecisionOps_PRD_final.docx` : source bureautique originale du PRD
- `Praedixa_PRD_DecisionOps_PRD_final.md` : conversion Markdown de travail, diffable et lisible dans le repo
- `TODO.md` : checklist monorepo build-ready derivee du PRD et de l'etat reel du codebase

## Regles de travail

- Utiliser en priorite la version Markdown pour la lecture, l'annotation et le travail d'alignement avec le code
- Garder le `.docx` comme artefact source, sans en faire la reference principale pour le suivi technique
- Maintenir `TODO.md` comme checklist vivante des fermetures structurelles avant ajout de nouvelles features

## Integration avec le reste de la doc

- Les exigences produit viennent du PRD
- Les preuves techniques viennent du code, des runbooks, des docs architecture/database/testing/security et des scripts versionnes
- Une case de `TODO.md` ne doit etre cochee que si elle est appuyee par une source verifiable dans le repo
