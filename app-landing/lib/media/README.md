# `lib/media/`

Assets media du hero.

## Role

Servir les assets hero effectivement utilises par la homepage sans empiler de selection navigateur morte.

## Fichiers

- `hero-industries.ts`: definition de l'asset montage unique utilise par le hero

## Tests

- pas de helper de selection versionne tant qu'un seul asset video hero est effectivement livre

## Convention

Avant de modifier les medias du hero, verifier le comportement reel WebKit/Safari et garder le poster comme rendu critique. Si un seul asset video est effectivement livre en production, ne pas conserver une couche de selection MP4/WebM purement theorique.
