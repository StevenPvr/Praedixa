# Documentation Projet

Ce dossier regroupe la documentation durable du monorepo, a distinguer des plans, PRD et artefacts de cadrage.

## Ce qu'on y trouve

- un parcours CTO orienté données et architecture runtime dans `cto/` ;
- architecture, base de données et stratégie de test ;
- plans de travail ;
- PRD, cadrage produit et checklists de fermeture ;
- runbooks d'exploitation ;
- documentation de sécurité et conformité ;
- documentation SEO et contenu ;
- guides de déploiement.

## Sous-dossiers

- `cto/` : point d'entrée CTO, hiérarchie des sources de vérité, schémas, flux et runbooks d'exploration de la base.
- `architecture/` : ADRs, ownership et regles de placement des briques du socle.
- `data-api/` : documentation produit et integration de la plateforme data.
- `deployment/` : guides d'installation et de déploiement.
- `governance/` : regles de livraison, compatibilite et hygiene du socle.
- `performance/` : budgets, enveloppes de charge et cadres cout/scalabilite.
- `prd/` : PRD DecisionOps, conversion Markdown et checklist build-ready.
- `plans/` : plans et documents de travail actifs.
- `runbooks/` : procédures opératoires.
- `security/` : audits, posture, invariants et conformité.
- `seo/` : stratégie éditoriale et SEO/GEO.
- `specs/` : contrats et formats documentaires utilises par Symphony et les workflows agentiques.

## Runbooks clés

- `runbooks/remote-ci-governance.md` : matrice merge vs release, checks GitHub requis et périmètre de la CI distante.

## Lecture recommandée pour un nouveau

### Parcours CTO / architecture et données

1. `cto/README.md`
2. `cto/01-systeme-et-runtimes.md`
3. `ARCHITECTURE.md`
4. `DATABASE.md`
5. `cto/08-contrats-et-types-partages.md`
6. `cto/20-hierarchie-documentaire-et-normativite.md`

### Parcours général

1. `ARCHITECTURE.md`
2. `DATABASE.md`
3. `TESTING.md`
4. `runbooks/`
5. `security/`

## Hierarchie documentaire

### Documentation durable

- `cto/`
- `ARCHITECTURE.md`
- `DATABASE.md`
- `TESTING.md`
- `architecture/`
- `runbooks/`
- `security/`
- `deployment/`
- `specs/`

### Documentation de cadrage ou de travail

- `plans/`
- `prd/`

Les PRD et documents de cadrage ne doivent pas etre lus comme des references runtime normatives. Ils restent utiles pour le contexte, mais secondaires par rapport aux sources de verite code + docs durables ci-dessus.
