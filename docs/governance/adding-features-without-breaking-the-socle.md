# Ajouter une Feature Sans Casser le Socle

Utiliser cette checklist avant de considerer une feature prete a fusionner.

## Checklist

- Verifier le bon runtime: TypeScript/Node pour les surfaces user-facing et control plane, Python pour data/ML/pipeline.
- Verifier le bon package ou point d'entree avant de coder pour eviter un couplage transverse.
- Verifier `docs/architecture/placement-guide.md` si le bon point d'entree n'est pas evident en 30 secondes.
- Mettre a jour les contrats, types partages et docs dans le meme changement si une interface evolue.
- Ajouter ou mettre a jour les tests au niveau le plus proche du risque reel.
- Verifier auth, permissions, scoping tenant/site et controle d'origine pour toute nouvelle surface sensible.
- Verifier l'observabilite minimum: logs structures, correlation ids, erreurs actionnables.
- Verifier le comportement degrade, les retries utiles et l'absence de fallback implicite.
- Verifier les impacts release: variables d'environnement, secrets, migrations, smoke tests, rollback.
- Mettre a jour les docs locales du dossier touche et tout runbook ou README devenu incomplet.
- Supprimer ou planifier explicitement la suppression des flags, mocks ou chemins transitoires introduits.
- Rejouer `pnpm gate:architecture` ou, a minima, `pnpm architecture:dependency-cruiser && pnpm architecture:ts-guardrails` avant de considerer la feature structurellement saine.

## Stop conditions

- La feature cree une primitive transverse sans schema ni ownership.
- La feature ajoute une route, un event ou un payload sans contrat partage.
- La feature depend d'un mode demo, d'un script manuel non documente ou d'un acces privilegie implicite.
- La feature force une exception durable au gate local ou a la CI distante.

## Handoff minimum

- Quel probleme est resolu.
- Quels fichiers portent la logique source de verite.
- Quels contrats ont change.
- Quels tests et quels runbooks couvrent le risque principal.
