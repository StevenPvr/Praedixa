# `lib/media/`

Assets media du hero et des fonds editoriaux de la homepage.

## Role

Servir les assets effectivement utilises par la homepage sans empiler de selection navigateur morte ni disperser les URLs de medias externes dans les composants.

## Fichiers

- `hero-industries.ts`: definition de l'asset montage unique utilise par le hero
- `sector-backgrounds.ts`: mapping des fonds editoriaux externes utilises par les verticales publiees

## Tests

- pas de helper de selection versionne tant qu'un seul asset video hero est effectivement livre

## Convention

Avant de modifier les medias du hero, verifier le comportement reel WebKit/Safari et garder le poster comme rendu critique. Si un seul asset video est effectivement livre en production, ne pas conserver une couche de selection MP4/WebM purement theorique.
Quand une section marketing utilise des fonds externes, garder pour chaque image l'URL optimisee et la page source dans ce dossier afin de pouvoir reverifier le rendu, la licence et un eventual remplacement sans fouiller le JSX.
