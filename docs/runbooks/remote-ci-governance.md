# Runbook - Gouvernance CI distante

## Objectif

Redonner une autorite distante utile a GitHub Actions sans remplacer les gates locaux plus profonds.
Le scope de ces workflows doit aussi couvrir les scripts critiques qui peuvent affaiblir un gate, une release ou un smoke sans toucher au code applicatif.

## Repartition des roles

### 1. Gate local

- Source de verite la plus complete pour le developpeur.
- Porte les hooks `pre-commit`, `pre-push`, le rapport signe et les audits larges documentes dans `local-gate-exhaustive.md`.
- Doit etre lance avant ouverture d'une PR ou avant une release manuelle sensible.

### 2. CI distante GitHub

- `CI - Admin` et `CI - API` tournent sur `pull_request`, `push` vers `main` et `develop`, et gardent `workflow_dispatch`.
- Les workflows sont volontairement always-on au niveau du declenchement: ils apparaissent sur toute PR et sur tout `push` vers `main`/`develop`.
- Chaque workflow publie maintenant un job final stable quand il se declenche:
  - `Admin - Required`
  - `API - Required`
- `CI - Autorite` publie le seul check merge-blocker canonique:
  - `Autorite - Required`
- Le meme workflow publie aussi un rapport machine-readable `build-ready-<sha>.json` et un summary GitHub du verdict courant.
- Les deux workflows revalident d'abord un socle versionne de policy:
  - `node scripts/validate-secret-rotation-runbook.mjs`
  - `node scripts/validate-runtime-secret-inventory.mjs`
  - `node scripts/validate-synthetic-monitoring-baseline.mjs`
  - `pnpm performance:validate-budgets`
- `CI - API` couvre maintenant `app-api-ts`, `app-api` et `app-connectors`.
- Les jobs lourds tournent donc aussi sur des PR qui ne touchent pas directement ces surfaces. C'est un compromis assume pour avoir des checks requis toujours presents et vraiment exploitables au merge.
- `workflow_dispatch` reste un recontrole manuel utile, mais ne remplace ni une review ni une release gouvernee.

### 3. Protection de branche

- La protection de branche n'est pas definissable de facon fiable dans ces YAML; elle doit etre configuree dans GitHub (ou plus tard via IaC GitHub si le repo l'adopte).
- Sur `main` et `develop`, exiger au minimum:
  - `Autorite - Required` comme check requis stable
  - `strict = true` sur les status checks
  - une review obligatoire
  - `enforce_admins = true`
  - la resolution de conversation active
  - l'historique lineaire impose
  - force-push et suppression interdits
- `Admin - Required` et `API - Required` restent des checks auxiliaires et ne doivent pas remplacer `Autorite - Required` comme ancre de branch protection.
- Ne pas exiger seulement les jobs intermediaires (`Admin - Build`, `API TS - ...`, etc.): l'ancre de branch protection doit rester `Autorite - Required`.
- `scripts/github/verify-main-branch-protection.sh` sert de preuve operatoire: il doit confirmer l'etat reel GitHub au lieu de laisser la doc parler a sa place.
- `scripts/github/verify-main-required-check.sh` complete cette preuve en verifiant que le HEAD de `main` expose bien un `Autorite - Required` `completed/success` via l'API Checks GitHub, meme quand l'API statuses classique reste peu exploitable.

## Flux recommande

1. Le developpeur passe les gates locaux pertinents.
2. La PR cible `main` ou `develop`.
3. La CI distante revalide independamment les surfaces admin/api concernees.
4. La protection de branche bloque le merge tant que les checks requis ou la review ne sont pas verts.
5. Le merge ne vaut pas release automatique: les releases restent gouvernees par les scripts et manifests existants (`pnpm release:build`, `pnpm release:manifest:create`, `pnpm release:deploy`, scripts `scw:*`).

## Matrice merge vs release

| Situation                             | Checks GitHub requis                                                                | Merge autorise                        | Release autorisee                               |
| ------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------- |
| PR vers `develop`                     | review + checks requis que la branch protection a effectivement rendus obligatoires | Oui, si tout est vert                 | Non                                             |
| PR vers `main`                        | review + checks requis que la branch protection a effectivement rendus obligatoires | Oui, si tout est vert                 | Non                                             |
| `push` direct sur `develop` ou `main` | CI post-push uniquement                                                             | Tolere seulement en urgence gouvernee | Non par defaut                                  |
| `workflow_dispatch` sur CI            | Recontrole manuel des memes checks                                                  | Non applicable                        | Non                                             |
| `pnpm release:*` / scripts `scw:*`    | SHA deja verte sur les checks requis + manifest/gate locaux                         | Non applicable                        | Oui, si tous les prerequis release sont valides |

## Perimetre assume

- `CI - API` revalide a chaque run le socle policy repo, `app-api-ts`, `app-api` et `app-connectors`, y compris les impacts indirects via `contracts/` et `packages/shared-types/`.
- `CI - Admin` revalide a chaque run le socle policy repo, `app-admin` et ses packages partages.
- Ce choix supprime le trou de gouvernance "workflow absent", mais il n'implique pas que chaque job est semantiquement minimal pour chaque diff.
- Le compromis est explicite: presence fiable des checks requis avant optimisation fine du cout CI.

## Outils epingles

- Les actions GitHub externes utilisees dans `ci-api.yml` et `ci-admin.yml` sont pinnees par SHA immuable.
- Les versions `pnpm` restent explicites dans chaque job pour eviter un drift silencieux entre jobs d'un meme workflow.
- Les autres outils de gate locale plus profonds gardent encore leur propre gouvernance versionnee; ne pas supposer qu'ils sont tous deja mutualises dans la CI distante.

## Politique de merge

- Un merge vers `main` ou `develop` doit venir d'une PR verte avec au moins une review approuvante.
- Les `push` directs sur branche protegee doivent rester reserves aux cas d'urgence explicitement gouvernes.
- Un `push` direct autorise relance quand meme la CI distante et doit etre traite comme un ecart operationnel, pas comme le flux normal.

## Dependabot

- Dependabot couvre maintenant:
  - `github-actions`
  - `npm`
  - `pip`
  - `terraform`
  - `docker` pour les repertoires qui contiennent des `Dockerfile*` suivis dans ce repo
- Les PR Dependabot doivent passer les memes checks requis avant merge.
- Les PR Dependabot sont etiquetees comme PR de dependances pour rendre la revue, le triage et les protections de branche coherents avec les PR humaines.

## Pinning des actions

- Les actions officielles utilisees dans `ci-api.yml` et `ci-admin.yml` sont pinnees par SHA de commit.
- Ecart residuel a surveiller: toute nouvelle action ajoutee hors de ces deux workflows doit etre pinnee de la meme facon; sinon elle doit etre documentee avant merge.

## Checklist operatoire

- Verifier que `Autorite - Required` existe bien sur les SHAs de `main` et reste `completed/success`.
- Verifier que les checks finaux `Admin - Required` et `API - Required` existent bien quand les workflows se declenchent.
- Verifier qu'une PR qui ne touche qu'un fichier hors surface applicative directe voit quand meme apparaitre `Autorite - Required`, puis les checks auxiliaires attendus.
- Verifier qu'un changement sur `app-connectors/` ou `contracts/` reste bien couvert par `CI - API`.
- Verifier que `workflow_dispatch` reste disponible pour les recontroles manuels.
- Verifier que les PR Dependabot suivent le meme gate de merge que les PR humaines.
- Verifier via `scripts/github/verify-main-branch-protection.sh` que la branch protection GitHub exige bien `Autorite - Required`, `strict = true`, `1` review obligatoire, `enforce_admins = true`, la resolution de conversation, l'historique lineaire et l'interdiction des force-push/suppressions.
- Verifier via `scripts/github/verify-main-required-check.sh` que le HEAD de `main` expose une preuve Checks GitHub relisible du check requis.
