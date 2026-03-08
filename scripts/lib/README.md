# scripts/lib

Helpers shell partages par plusieurs scripts.

## Fichier present

- `pnpm.sh` detecte un binaire `pnpm` utilisable et prepare un wrapper si necessaire.

## Pourquoi ce dossier existe

Les gates et scripts de release doivent pouvoir reutiliser une meme logique de resolution d'outils sans dupliquer le code dans chaque script shell.

## Conventions

- Ajouter ici seulement des helpers generiques, sans logique metier applicative.
- Garder les helpers sourcables (`source ...`) et fail-fast.
- Si un helper ecrit dans `.git/` ou `/tmp`, documenter clairement le comportement de repli dans le script consommateur.
