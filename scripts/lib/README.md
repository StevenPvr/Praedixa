# scripts/lib

Helpers shell partages par plusieurs scripts.

## Fichier present

- `pnpm.sh` detecte un binaire `pnpm` utilisable et prepare un wrapper si necessaire.
- `process-tree.sh` termine un arbre de process complet et attend l'extinction d'un PID avec timeout borne, en traitant les zombies comme des processus deja sortis pour eviter les hooks pendus sur des wrappers shell ou `pnpm`.
- `json-env.sh` serialise une liste de variables d'environnement vers un JSON temporaire sans exposer leurs valeurs dans les arguments CLI.
- `keycloak.sh` encapsule les appels `kcadm` qui doivent fournir un mot de passe via `KC_CLI_PASSWORD` plutot que `--password` ou `--new-password`.

## Pourquoi ce dossier existe

Les gates et scripts de release doivent pouvoir reutiliser une meme logique de resolution d'outils sans dupliquer le code dans chaque script shell.

## Conventions

- Ajouter ici seulement des helpers generiques, sans logique metier applicative.
- Garder les helpers sourcables (`source ...`) et fail-fast.
- Si un helper ecrit dans `.git/` ou `/tmp`, documenter clairement le comportement de repli dans le script consommateur.
