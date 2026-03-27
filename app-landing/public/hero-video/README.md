# Hero Video

## Rôle

Ce dossier fait partie du périmètre `app-landing` et regroupe des fichiers liés à hero video.

## Contenu immédiat

Fichiers :

- `A_real_restaurant_in_France_during_service__French.mp4`
- `Ultra_realistic_live_action_premium_brand_film_for.mp4`
- `restaurant-hero-loop.mp4`
- `restaurant-hero-poster.jpg`

## Intégration

Ce dossier est consommé par l'application `app-landing` pour le hero de la homepage.
Les deux fichiers source servent de rushs de base; `restaurant-hero-loop.mp4` est le montage final effectivement branche dans le hero.
Le poster JPG reste le rendu critique de first paint; la video MP4 ne doit venir qu'en upgrade progressive, pas comme dependance bloquante du hero.
