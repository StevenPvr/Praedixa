# Dictionaries

## Rôle

Ce dossier fait partie du périmètre `app-landing` et regroupe des fichiers liés à dictionaries.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `en-app.ts`
- `en-core-conversion.ts`
- `en-core-foundation.ts`
- `en-core-operations.ts`
- `en-core.ts`
- `en-growth.ts`
- `en.ts`
- `fr-app.ts`
- `fr-core-conversion.ts`
- `fr-core-foundation.ts`
- `fr-core-operations.ts`
- `fr-core.ts`
- `fr-growth.ts`
- `fr.ts`

## Intégration

Ce dossier est consommé par l'application `app-landing` et s'insère dans son flux runtime, build ou test.

## Regle editoriale

La copy canonique doit rester alignée sur la promesse publique de Praedixa: aider les reseaux multi-sites a reperer plus tot les arbitrages qui fragilisent la marge, a comparer les options sous contraintes, puis a relire l'impact reel des decisions prises.
La wedge commerciale doit rester visible comme point d'entree prioritaire, sans reduire toute la plateforme a un seul cas d'usage.
Eviter de retomber soit dans le jargon de categorie (`DecisionOps` partout), soit dans un discours generique de `data platform`, `copilote IA` ou `dashboard`.
Sur la copy publique FR, supprimer les anglicismes residuels quand un equivalent naturel existe (`couche de décision`, `point d'entrée`, `cycle de décision`) au lieu de laisser `Decision layer`, `wedge` ou des labels hybrides.
Le parcours d'entree public FR doit rester cohérent avec la promesse commerciale actuelle: `exemple concret` d'abord, `deploiement` comme offre publique, puis `preuve sur historique` comme qualification si besoin.
Si la copy mentionne le machine learning ou l'optimisation, la formulation doit servir la preuve de rigueur methodologique et non ouvrir une promesse d'accompagnement IA generique.
The same rule applies in EN: mention forecasting, constrained optimization, or econometric models only to support decision quality and impact attribution, not to drift into generic AI-consulting messaging.
Quand une meme section publique existe a la fois dans `*-core-*` et `*-growth`, reutiliser une seule source de verite au lieu de recopier la copy dans deux dictionnaires qui peuvent diverger.
Sur la homepage FR, chaque bloc adjacent doit apporter une preuve differente; ne pas repeter mot pour mot la meme reassurance de demarrage entre hero, preuve publique, securite et CTA final.
Sur le hero, garder `hero.headline` tres court et laisser `hero.headlineHighlight` porter la promesse detaillee en dessous, dans une hierarchie secondaire.
Quand cette promesse secondaire est rendue sur un media sombre, verifier qu'elle garde un contraste clair et une taille intermediaire suffisante entre le H1 et le corps de texte.
