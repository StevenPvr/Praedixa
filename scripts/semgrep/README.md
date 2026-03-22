# scripts/semgrep

Regles Semgrep maison utilisees par les gates locales.

## Fichier present

- `custom-critical-rules.yml` contient les regles custom executees par les scripts de gate.

## Ou c'est utilise

- `scripts/gates/gate-prepush-deep.sh`
- `scripts/audit-ultra-strict-local.sh`

## Conventions

- Ajouter ici des regles ciblant des invariants de securite ou de plate-forme propres a Praedixa.
- Eviter les regles trop bruyantes qui rendent les gates inutilisables.
- Quand une nouvelle regle est ajoutee, verifier son impact sur les apps, `packages/` et les faux positifs connus avant de la faire bloquante.
