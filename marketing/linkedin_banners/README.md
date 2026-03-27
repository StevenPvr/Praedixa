# Exports LinkedIn

Ce dossier sert aux exports lourds de bannières et assets marketing.

## Formats disponibles

- Sources principales: `personal_banner.svg`, `company_banner.svg`
- Variante large `1920 x 400`: `personal_banner_1920x400.svg`, `company_banner_1920x400.svg`
- Exports raster locaux associés: `.jpg` et `.png` pour chaque variante quand un rendu prêt à publier est nécessaire

## Recommandation

- Conserver le `SVG` comme source de vérité pour toute future recomposition ou ré-export
- Générer les rendus `JPG` ou `PNG` au besoin à partir de cette source plutôt que d'éditer un raster existant
- Le message actif des bannières doit rester aligné sur le positionnement actuel de Praedixa:
  - IA dédiée aux franchises de restauration
  - anticipation de la demande et prévision des besoins en effectif
  - ancrage français avec incubation EuraTechnologies et hébergement des données en France

## Important

- Les images générées finales ne doivent pas être versionnées par défaut.
- Le `.gitignore` protège déjà ce dossier pour éviter d'encombrer l'historique Git.
