# Ownership matrix

Cette matrice donne un owner principal par sous-systeme sous forme de role d'equipe.
Elle est faite pour orienter les reviews et l'escalade, pas pour remplacer l'annuaire humain.
Les labels comme `Platform TS`, `Data platform` ou `Security review` designent des responsabilites, a mapper ensuite a des personnes.

## Regles

- Chaque changement a un owner principal unique.
- Si un diff touche plusieurs lignes, l'owner du point d'entree pilote et demande les co-reviews listes.
- Si une source de verite change, sa doc associee doit changer dans le meme diff.

| Sous-systeme            | Runtime dominant     | Owner principal        | Co-review minimum                                           | Sources de verite                                                                 |
| ----------------------- | -------------------- | ---------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `app-landing`           | TypeScript / Next.js | Front marketing        | Platform TS, Design system                                  | `app-landing/README.md`, `package.json`                                           |
| `app-webapp`            | TypeScript / Next.js | Front produit          | Platform TS, Data platform si payload impacte               | `app-webapp/README.md`, `app-webapp/app/README.md`                                |
| `app-admin`             | TypeScript / Next.js | Front admin            | Platform TS, Security review pour auth/permissions          | `app-admin/README.md`, `app-admin/app/README.md`                                  |
| `app-api-ts`            | TypeScript / Node.js | Platform TS            | Front concerne, Integrations si appel sortant               | `app-api-ts/src/README.md`, `contracts/openapi/`, `packages/shared-types/`        |
| `app-connectors`        | TypeScript / Node.js | Integrations           | Platform TS, Infra si secret/runtime change                 | `app-connectors/package.json`, `scripts/scw/scw-*`                                |
| `app-api`               | Python               | Data platform          | Platform TS si contrat ou schema lu par le web change       | `app-api/app/core/README.md`, `docs/DATABASE.md`, `docs/medallion-pipeline.md`    |
| `packages/shared-types` | TypeScript           | Platform TS            | Consumer principal du changement                            | `packages/README.md`, `packages/shared-types/src/README.md`, `placement-guide.md` |
| `packages/ui`           | TypeScript / React   | Design system          | App consommatrice impactee                                  | `packages/README.md`, `packages/ui/README.md`, `placement-guide.md`               |
| `contracts/openapi`     | YAML                 | Platform TS            | Front concerne, owner de la route backend                   | `contracts/README.md`, `contracts/openapi/README.md`                              |
| `infra/` et `scripts/`  | Shell / IaC / config | Infra/DevOps           | Owner du service deploye, Security review pour auth/secrets | `infra/README.md`, `docs/runbooks/`                                               |
| `docs/architecture/`    | Markdown             | Architecture tournante | Owner du sous-systeme documente                             | `docs/prd/TODO.md`, `docs/ARCHITECTURE.md`, ce dossier                            |

## Escalade rapide

- Desaccord runtime TS vs Python: owner `Architecture tournante` + `Platform TS` + `Data platform`.
- Desaccord contrat ou payload transverse: owner `Platform TS` + consumer principal.
- Desaccord tenant/auth/cross-org: demander une `Security review` avec `Platform TS` ou `Data platform` selon le point d'entree.
- Doute de vocabulaire produit (`contract`, `decision`, `workspace`, `ledger`, `proof`, `scenario`, `action`): verifier `domain-vocabulary.md` avant de renommer ou d'ajouter une primitive.
