# Securite

Ce dossier regroupe la base documentaire securite build-ready de Praedixa.

## Priorites control plane

- `control-plane-hardening.md` : garde-fous minimaux pour le plan de controle admin, IAM, secrets et metadonnees critiques.
- `anti-scraping-program.md` : classification d'exposition, arbitrage GEO/training vs protection, assets signes et garde-fous runtime contre l'extraction utile.
- `scaleway-fortress-control-matrix.md` : traduction execution / preuves du PRD cybersecurite "porte blindee" sur Scaleway.
- `control-plane-metadata-inventory.json` : inventaire machine-readable des checks de restore semantique du control plane a garder aligne avec les runbooks et la verification de manifest.
- `break-glass-admin-governance.md` : gouvernance de l'acces admin d'urgence, avec journalisation obligatoire.
- `stride-threat-model.md` : menaces et abus a couvrir.
- `limitations-and-residual-risk.md` : limites connues et risque residuel accepte.

## Baseline build-ready

- Permissions explicites, deny by default, pas de wildcard admin en production.
- Routes et operations sensibles protegees cote serveur, pas seulement via navigation UI.
- Journal admin cible append-only pour toute mutation critique.
- MFA obligatoire pour tout acces admin production, avec re-authentification sur les actions a haut impact.
- Secrets recenses, avec rotation et tracabilite; aucune valeur live en documentation ou dans le repo.
- Les procedures runtime ne doivent jamais faire transiter une valeur secrete dans `argv`; utiliser l'environnement du process ou `stdin`.
- Metadonnees critiques sauvegardees, restaurees via procedure tracee et testees regulierement.

## Pont avec deployment et reprise

- `docs/deployment/environment-secrets-owners-matrix.md` est la matrice canonique env/secrets/owners pour les surfaces deployees.
- `docs/prd/scaleway-fortress-security-prd.md` fixe la cible securite produit/infra a atteindre sur Scaleway.
- `docs/runbooks/post-deploy-smoke-baseline.md` definit le smoke CLI minimal a conserver comme evidence apres deploy ou rollback, avec validation stricte du host et de l'URL effective.
- `docs/runbooks/backup-restore-evidence-baseline.md` definit la preuve minimale attendue pour les backups, restores et drills de reprise, en s'appuyant sur `control-plane-metadata-inventory.json` pour les checks semantiques obligatoires.

## Autres references

- `compliance-pack/` : templates, policies et preuves de conformite.
- `invariants/` : invariants machine-lisibles et scenarios d'abus.

## Lien avec le code

- Les apps et services doivent documenter localement comment auth, autorisation, audit et rotation des secrets sont implantes.
- Les runbooks et gates de `scripts/` doivent rester alignes avec ces exigences.
