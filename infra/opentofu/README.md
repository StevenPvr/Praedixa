# OpenTofu

Socle declaratif versionne pour la topologie Scaleway de Praedixa.

## Objectif

Le repo ne doit plus dependre uniquement de scripts `scw-*` disperses comme source de verite infra. Le point d'entree durable devient le catalogue [platform-topology.json](/Users/steven/Programmation/praedixa/infra/opentofu/platform-topology.json), consomme a la fois :

- par les wrappers Shell `scripts/scw/*` pour retrouver namespaces, containers, reseaux prives et noms RDB sans les reencoder a la main ;
- par ce socle OpenTofu pour valider la coherence du modele d'infrastructure et preparer la convergence vers des stacks appliquees par environnement.

## Contenu

- `platform-topology.json` : catalogue canonique des services plateforme (`landing`, `webapp`, `admin`, `api`, `auth`) et des prospects, avec noms de namespace/container, hosts publics, reseaux prives et envelopes de scaling.
- `versions.tf` : contrat de version OpenTofu/Terraform.
- `platform-contract.tf` : validations structurantes du catalogue et outputs machine-readable.
- `environments/` : points d'entree par environnement pour backends d'etat et variables d'override.

## Workflow

Validation locale de la topologie :

```bash
cd infra/opentofu
tofu init -backend=false
tofu validate
```

Les scripts `scw-configure-*`, `scw-deploy-*`, `scw-bootstrap-*`, `scw-release-manifest-create.sh` et les preflights critiques doivent lire les identifiants plateforme depuis ce catalogue avant toute mutation cloud.

## Convention d'etat

Les backends d'etat distants ne sont pas encore instancies dans ce diff, mais les conventions sont figees :

- `environments/staging/backend.hcl.example`
- `environments/prod/backend.hcl.example`

La cible est un backend distant dedie par environnement, jamais un `terraform.tfstate` partage sur un laptop.
