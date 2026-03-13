# Runbooks

Ce dossier regroupe les procedures operatoires pour exploiter, diagnostiquer, deployer et securiser Praedixa.

## Baselines a lire en premier

- [observability-baseline.md](./observability-baseline.md) : socle minimal logs JSON, correlation, metriques, traces, dashboards, alerting et synthetic checks.
- [synthetic-monitoring-baseline.json](./synthetic-monitoring-baseline.json) : baseline machine-readable des checks synthetiques critiques a garder coherents avec les runbooks.
- [release-and-rollback-baseline.md](./release-and-rollback-baseline.md) : sequence standard preflight, manifest signe, smoke, go/no-go, rollback rapide et preuves.
- [post-deploy-smoke-baseline.md](./post-deploy-smoke-baseline.md) : smoke CLI canonique apres deploy ou rollback pour `api`, `webapp`, `admin`, `auth`, `landing` et `connectors` si l'URL est explicite en staging.
- [backup-restore-evidence-baseline.md](./backup-restore-evidence-baseline.md) : verification backup, restore drill et evidence minimale attendue.
- [mvp-go-live-readiness.md](./mvp-go-live-readiness.md) : gate build-ready avant go-live.

## Quand les utiliser

- observabilite: avant mise en prod, pendant un incident, et pour verifier qu'une nouvelle surface n'est pas "muette"
- synthetics: quand une URL canonique change, quand un nouveau check critique apparait, et avant de connecter un provider externe
- release/rollback: a chaque deploy staging ou prod, et pour tout retour arriere rapide
- smoke post-deploy: juste apres chaque deploy, promotion ou rollback
- backup/restore evidence: avant un changement critique, pendant un drill trimestriel et avant cloture d'un gap de reprise
- control-plane restore semantics: quand les checks tenant/site/RBAC/OIDC/connecteurs/flags critiques changent, garder `docs/security/control-plane-metadata-inventory.json` aligne avec les summaries de restore
- go-live readiness: avant une ouverture de perimetre ou un changement majeur de posture

## Runbooks voisins utiles

- [local-gate-exhaustive.md](./local-gate-exhaustive.md)
- [security-gate-hardening.md](./security-gate-hardening.md)
- [security-secret-rotation.md](./security-secret-rotation.md)
- [post-deploy-smoke-baseline.md](./post-deploy-smoke-baseline.md)
- [backup-restore-evidence-baseline.md](./backup-restore-evidence-baseline.md)
- [medallion-orchestrator.md](./medallion-orchestrator.md)
- [incident-freeze-unfreeze.md](./incident-freeze-unfreeze.md)
- [supply-chain-integrity-verification.md](./supply-chain-integrity-verification.md)
