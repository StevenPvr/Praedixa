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
Quand `SectorPagesTeaserSection.tsx` repose sur un carousel, couvrir au minimum la bascule de tab et le `href` de la slide active, pas seulement la presence statique de quatre liens.
Quand ce carousel est cense prendre exactement un viewport, garder aussi un garde-fou minimal sur son wrapper principal pour eviter qu'un padding ou une hauteur max retiree ne le fasse regresser au-dessus de `100dvh`.
Quand une section homepage depend de `SectionShell`, tester aussi les overrides de padding critiques sur le wrapper externe; sinon un `md:py-*` herite peut recreer un espace vide sans toucher au composant interne.
