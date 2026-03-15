# Tests

## Rôle

Ce dossier regroupe les tests associés au dossier parent `app-landing/components/homepage`. Il documente et vérifie le comportement attendu de cette zone du code.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `HeroBackgroundVideo.test.tsx`
- `HeroSection.test.tsx`
- `HomepageMessaging.test.tsx`
- `StackComparisonSection.test.tsx`
- `SectorPagesTeaserSection.test.tsx`

## Intégration

Ce dossier est consommé par l'application `app-landing` et s'insère dans son flux runtime, build ou test.
Les assertions de messaging doivent suivre la homepage canonique actuelle; si la home change de spine ou de wedge, mettre a jour ces tests dans la meme passe.
