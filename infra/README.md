# Infra

Artefacts d'infrastructure et d'exploitation versionnes.

## Plans internes d'automation

Le service d'automation agentique interne Symphony n'expose pas de traffic produit public. Son contrat versionne est `WORKFLOW.md` a la racine du repo et son runtime TypeScript dedie vit dans `app-symphony/`.

## Ce qui vit ici

- `docker-compose.yml` pour la pile locale Docker (PostgreSQL, API, auth Keycloak locale).
- `camunda/` pour le runtime Camunda 8 local/self-managed epingle et sa procedure d'usage.
- `auth/` pour les artefacts Keycloak/Scaleway lies a l'authentification.
- `opentofu/` pour le socle declaratif Scaleway/OpenTofu, sa topologie canonique et ses states d'environnement (`staging`, `prod`) qui doivent devenir la source de verite des cibles runtime.
- `systemd/` pour les services systemes lies a la data platform Python.

Le deploiement applicatif reste orchestre par les workflows GitHub Actions et les scripts de `scripts/`, mais leurs identifiants plateforme doivent desormais converger vers les outputs state-backed d'`infra/opentofu/environments/*`. Le catalogue `platform-topology.json` reste l'entree canonique versionnee; les states `staging` et `prod` en derivent les contrats de service consommes par la CI et les wrappers `scw-*`.

## Workflows utiles

Pile locale minimale:

```bash
docker compose -f infra/docker-compose.yml up -d
docker compose -f infra/docker-compose.yml logs -f
docker compose -f infra/docker-compose.yml down
```

Pour ne lancer que l'IdP local de debug:

```bash
pnpm dev:auth
# ou
pnpm dev:auth:bg
```

Le Keycloak local est volontairement force en cache `local` mono-noeud dans `infra/docker-compose.yml`; ce choix evite les delais de convergence cluster inutiles apres un restart Docker et rend la discovery OIDC locale deterministe pour `app-admin` et `app-webapp`.

## Conventions

- Ne pas committer de secrets ou de mots de passe reels ici.
- Garder les artefacts d'exploitation alignes avec les scripts `scw-*` et `keycloak-*`.
- Garder toute nouvelle cible Scaleway alignee avec `infra/opentofu/platform-topology.json` avant de toucher les scripts `scw-*`.
- Les services lies a la data platform restent cote Python; ne pas les deplacer dans les apps Next/Node.

## Lire ensuite

- `infra/auth/README.md`
- `infra/opentofu/README.md`
- `infra/camunda/README.md`
- `infra/systemd/README.md`
