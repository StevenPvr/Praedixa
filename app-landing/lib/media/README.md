# `lib/media/`

Helpers media du hero.

## Role

Choisir les bons assets hero selon le contexte et les contraintes navigateur.

## Fichiers

- `hero-video.ts`: choix MP4/WebM avec garde-fou Safari/WebKit
- `hero-industries.ts`: mapping d'industries et des assets associes

## Tests

- `__tests__/hero-video.test.ts`

## Convention

Avant de modifier la logique media, verifier le comportement reel WebKit/Safari et ne pas supposer que les attributs autoplay suffisent.
