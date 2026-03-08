# GitHub Actions Locales

Ce dossier regroupe les actions composites embarquées dans le repo.

## Pourquoi ce dossier existe

- Factoriser de la logique CI réutilisable.
- Garder le comportement des workflows explicite et versionné avec le code.

## Contenu

- `minutes-guard/` : action composite dédiée au contrôle ou à la limitation de l'usage CI sur un workflow donné.

## Règle de maintenance

- Une action locale doit rester petite, testable par lecture, et documentée dans son sous-dossier.
