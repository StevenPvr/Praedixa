# Exports LinkedIn

Ce dossier sert aux exports lourds de bannières et assets marketing.

## Formats disponibles

- Sources principales: `personal_banner.svg`, `company_banner.svg`
- Variante large `1920 x 400`: `personal_banner_1920x400.svg`, `company_banner_1920x400.svg`
- Sources ouvertes retenues pour la refonte:
  - `open_source_fast_food_tray_cc0.jpg` — Wikimedia Commons, CC0, plateau burger-frites
  - `open_source_fries_cooking_ccby.jpg` — Wikimedia Commons, CC BY 2.0, batterie de friteuses
- Fonds recadrés au bon ratio pour les variantes actives:
  - `company_banner_bg.jpg`
  - `company_banner_1920x400_bg.jpg`
  - `personal_banner_bg.jpg`
  - `personal_banner_1920x400_bg.jpg`
- Exports raster locaux associés: `.jpg` et `.png` pour chaque variante quand un rendu prêt à publier est nécessaire

## Recommandation

- Conserver le `SVG` comme source de vérité pour toute future recomposition ou ré-export
- Générer les rendus `JPG` ou `PNG` au besoin à partir de cette source plutôt que d'éditer un raster existant
- Quand un badge ou une capsule change de wording, mesurer la largeur réelle du texte dans le `SVG` et redimensionner/repositionner la capsule avant l'export raster
- Le lockup Praedixa en haut à gauche doit utiliser le symbole officiel partagé (`@praedixa/ui`) avec le mot `Praedixa` à côté, jamais un simple mot seul recollé à la main
- Le bloc de headline doit être posé comme un vrai cadre avec des marges internes explicites et régulières; ne pas compter sur un simple décalage visuel du groupe texte pour "tomber juste" après export
- Les bannières doivent rendre visibles en un coup d'oeil le ciblage `réseaux de restauration rapide multi-sites` et l'ancrage `alternative française`, même avant lecture détaillée de la copy
- Quand une image de fond restaurant existe dans le repo et sert mieux le secteur que des formes abstraites, la bannière doit privilégier cette scène réelle puis la cadrer avec les overlays de marque
- Si l'utilisateur veut une vraie rupture visuelle sectorielle, préférer une photo open source explicitement `fast food / burger / fries / fryers`, puis générer des recadrages dédiés pour chaque ratio final au lieu de réutiliser la même image brute partout
- Le message actif des bannières doit rester aligné sur le positionnement actuel de Praedixa:
  - réseaux de restauration rapide multi-sites
  - anticipation de la demande et prévision des besoins en effectif
  - ancrage français visible dans les signes graphiques comme dans la copy

## Important

- Les images générées finales ne doivent pas être versionnées par défaut.
- Le `.gitignore` protège déjà ce dossier pour éviter d'encombrer l'historique Git.
