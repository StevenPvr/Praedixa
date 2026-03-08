# Infra

Artefacts d'infrastructure et d'exploitation versionnes.

## Ce qui vit ici

- `docker-compose.yml` pour la pile locale Docker minimale.
- `auth/` pour les artefacts Keycloak/Scaleway lies a l'authentification.
- `systemd/` pour les services systemes lies a la data platform Python.

Le deploiement applicatif passe surtout par les scripts de `scripts/`, pas par un outil d'IaC unique dans ce dossier.

## Workflows utiles

Pile locale minimale:

```bash
docker compose -f infra/docker-compose.yml up -d
docker compose -f infra/docker-compose.yml logs -f
docker compose -f infra/docker-compose.yml down
```

## Conventions

- Ne pas committer de secrets ou de mots de passe reels ici.
- Garder les artefacts d'exploitation alignes avec les scripts `scw-*` et `keycloak-*`.
- Les services lies a la data platform restent cote Python; ne pas les deplacer dans les apps Next/Node.

## Lire ensuite

- `infra/auth/README.md`
- `infra/systemd/README.md`
