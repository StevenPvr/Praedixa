# Symphony Automation Service

Service interne Praedixa qui orchestre des sessions Codex a partir d'issues Linear.

## Objectif

- lire un `WORKFLOW.md` versionne dans le repo
- poller Linear et normaliser les issues candidates
- creer un workspace isole par issue
- lancer `codex app-server` dans ce workspace
- suivre l'etat runtime, les retries, les tokens et les handoffs
- exposer une surface HTTP locale d'operabilite

## Commandes

```bash
pnpm --dir app-symphony dev ../WORKFLOW.md
pnpm --dir app-symphony build
pnpm --dir app-symphony test
pnpm --dir app-symphony start ../WORKFLOW.md
```

## Contrat runtime

- le chemin workflow explicite est prioritaire; depuis ce monorepo, lancer `../WORKFLOW.md` respecte le contrat du spec tout en gardant le fichier versionne a la racine.
- `LINEAR_API_KEY` et `LINEAR_PROJECT_SLUG` doivent etre fournis si `tracker.kind: linear`.
- preferer `app-symphony/.env.local` pour les secrets locaux du runtime; `app-symphony/.env` reste seulement un fallback local non versionne.
- le runtime recharge automatiquement `app-symphony/.env.local`, puis `app-symphony/.env`, puis `.env.local` a la racine quand ces fichiers existent.
- le harness worktree fort reste configurable via l'extension `harness` du workflow.
- la surface HTTP locale expose `/`, `/api/v1/state`, `/api/v1/:issueIdentifier` et `/api/v1/refresh`.

## Frontieres

- ce service ne fait pas partie du traffic produit expose aux clients.
- il ne remplace pas `app-api/scripts/medallion_orchestrator.py`, qui reste reserve au data plane Python.
- les mutations ticket/commentaire/PR sont laissees a l'agent via ses outils runtime, dont `linear_graphql` quand il est active.
