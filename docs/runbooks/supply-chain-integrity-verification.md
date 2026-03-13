# Runbook - Supply-Chain Integrity Verification

## Objectif

Verifier l'integrite des artefacts supply-chain produits localement pour une release candidate, puis les rattacher a un manifest signe.

Ce que le repo sait verifier aujourd'hui:

- generation d'un SBOM CycloneDX avec `syft`
- scan de ce SBOM avec `grype`
- versionnement des digests des artefacts JSON produits
- rattachement de cette evidence machine-readable au manifest de release
- reverification de ces digests pendant `release-manifest-verify.sh`, apres reverification du gate report reference par le manifest

Ce que ce runbook ne couvre pas:

- une provenance SLSA
- une attestation signee de build externe
- une verification Sigstore/Cosign d'artefacts tiers

## Artefacts produits

`./scripts/run-supply-chain-audit.sh` ecrit sous `.git/gate-reports/artifacts/`:

- `sbom.cdx.json`
- `grype-findings.json`
- `supply-chain-evidence.json`

Le summary JSON est la piece attachable au manifest signe. Il versionne:

- le statut global du controle local (`status=pass`)
- les digests du SBOM et du scan de vulnerabilites
- la politique de blocage appliquee (`fail-on=medium`)

Exemple de forme:

```json
{
  "summary_type": "supply-chain-evidence",
  "schema_version": "1",
  "recorded_at": "2026-03-12T12:00:00Z",
  "status": "pass",
  "policy": {
    "vulnerability_fail_on": "medium"
  },
  "artifacts": {
    "sbom": {
      "format": "cyclonedx-json",
      "path": "/abs/path/.git/gate-reports/artifacts/sbom.cdx.json",
      "sha256": "<hex>"
    },
    "vulnerability_scan": {
      "engine": "grype",
      "path": "/abs/path/.git/gate-reports/artifacts/grype-findings.json",
      "sha256": "<hex>",
      "active_signal_count": 0
    }
  }
}
```

## Procedure standard

1. Generer l'evidence supply-chain locale

```bash
./scripts/run-supply-chain-audit.sh
```

Le script echoue si `syft`, `grype` ou `jq` manquent, ou si `grype` trouve une vulnerabilite `medium` ou plus.

2. Attacher l'evidence au manifest signe

```bash
pnpm release:manifest:create -- \
  --ref "$REF" \
  --gate-report ".git/gate-reports/${SHA}.json" \
  --output "$OUT/manifest.json" \
  --image api="$(jq -r '.registry_image' "$OUT/api.json")" \
  --supply-chain-evidence ".git/gate-reports/artifacts/supply-chain-evidence.json"
```

3. Reverifier avant deploy ou promotion

```bash
pnpm release:manifest:verify -- --manifest "$OUT/manifest.json"
```

Le verifier echoue si:

- le summary JSON reference par le manifest est absent
- le digest du summary JSON ne correspond plus
- le summary n'est pas du type `supply-chain-evidence` schema `1`
- le summary n'est pas en `status=pass`
- le digest du SBOM reference ne correspond plus
- le digest du scan `grype` reference ne correspond plus

## Politique de decision

- `Critical/High/Medium`: blocage immediat, car `run-supply-chain-audit.sh` echoue deja sur `medium+`
- `Low`: le gate local peut passer, mais toute exception doit etre tracee avec owner, reviewer, justification et date d'expiration
- artefact non reverifiable: blocage immediat

## Evidence minimale a conserver

- sortie de `./scripts/run-supply-chain-audit.sh`
- `sbom.cdx.json`
- `grype-findings.json`
- `supply-chain-evidence.json`
- manifest signe qui reference cette evidence
- sortie de `pnpm release:manifest:verify -- --manifest ...`

## Cadence

- a chaque release candidate
- apres toute correction de dependance ou remediation supply-chain
- revue hebdomadaire des findings ouverts encore acceptes
