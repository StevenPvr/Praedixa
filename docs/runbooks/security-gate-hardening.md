# Runbook — Security Gate Hardening (3 couches)

## Objectif

Appliquer une rigueur "Apple-like" sur l'exécution locale des contrôles de sécurité, sans revendiquer une sécurité parfaite.

## Couches de contrôle

1. Couche A (pre-commit, bloquante)

- `./scripts/gate-precommit-blocking.sh`
- Garde-fous securite:
  - `./scripts/gate-precommit-delta.sh`
  - Secrets sur diff stage (`gitleaks --staged`)
  - SAST diff (`semgrep` + regles custom critiques)
  - Garde-fous fichiers sensibles + invariants
  - Check config prod sur fichiers stages
  - Validation stricte des exceptions
- Suites de tests obligatoires:
  - `./scripts/gate-precommit-tests.sh`
  - Python (inclut les unitaires): `uv run pytest`
  - Next.js unit: `pnpm vitest run --project default --project admin`
  - E2E: `pnpm test:e2e`

2. Couche B (pre-push, deep, bloquante)

- `./scripts/gate-prepush-deep.sh`
- SAST élargi repo
- SCA JS/Python + OSV
- IaC / misconfig (`trivy`, `checkov`)
- SBOM + scan supply-chain (`syft`, `grype`)
- Invariants + abuse scenarios (tests ciblés)
- Checks prod complets

3. Couche C (exhaustive, preuve signée)

- `pnpm gate:exhaustive`
- Rapport signé HMAC en `.git/gate-reports/<sha>.json`
- Vérification signature/âge/commit:
  - `pnpm gate:verify`
  - `pnpm gate:prepush`

## Politique de sévérité

- `Critical`: blocage immédiat
- `High`: blocage immédiat
- `Medium`: blocage immédiat
- `Low`: non bloquant, traçabilité obligatoire

Fichier source de vérité:

- `scripts/security-policy.yaml`

## Exceptions sécurité

Fichier structuré unique:

- `scripts/security-exceptions.yaml`

Champs obligatoires:

- `id`, `tool`, `rule`, `severity`, `scope`, `owner`, `reviewer`,
  `justification`, `evidence`, `created_at`, `expires_at`, `removal_plan`,
  `status`, `identifiers`

Validation bloquante:

- `python3 scripts/validate-security-exceptions.py`

Règles:

- aucune exception silencieuse
- exception expirée => échec
- exception incomplète => échec
- reviewer obligatoire et différent de l'owner
- exceptions `critical/high/medium` interdites par policy

## Remédiation rapide

1. Identifier le premier check rouge dans la sortie hook.
2. Corriger la cause (code/config/test/policy).
3. Relancer localement le script de couche concernée.
4. Relancer `pnpm gate:exhaustive` puis `pnpm gate:verify`.

## Réponse accélérée (advisory / 0-day)

1. Ouvrir un incident P0/P1 dès confirmation d'impact potentiel.
2. Appliquer un contrôle compensatoire immédiat (virtual patch, blocage route, feature flag kill-switch).
3. Triage owner + reviewer sous 4h pour `Critical`, puis patch durable.
4. Lier décision et preuve dans les logs de risque résiduel et incident.

## Rotation des secrets

- Procédure dédiée: `docs/runbooks/security-secret-rotation.md`.
- À appliquer immédiatement si une fuite est suspectée par les contrôles secrets.

## Commandes opérationnelles

```bash
./scripts/gate-precommit-blocking.sh
./scripts/gate-prepush-deep.sh
pnpm gate:exhaustive
pnpm gate:verify
pnpm gate:prepush
```
