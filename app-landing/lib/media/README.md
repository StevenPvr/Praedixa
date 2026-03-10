# `lib/media/`

Helpers media du hero.

## Role

Servir les assets hero effectivement utilises par la homepage et gerer les contraintes navigateur.

## Fichiers

- `hero-video.ts`: choix MP4/WebM avec garde-fou Safari/WebKit
- `hero-industries.ts`: definition de l'asset montage unique utilise par le hero

## Tests

- `__tests__/hero-video.test.ts`

## Convention

Avant de modifier la logique media, verifier le comportement reel WebKit/Safari et ne pas supposer que les attributs autoplay suffisent.
