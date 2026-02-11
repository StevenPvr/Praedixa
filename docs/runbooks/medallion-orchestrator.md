# Runbook - Medallion Orchestrator

## Objectif

Exploiter la pipeline medaillon en mode production avec:

- scheduling continu event-driven (polling),
- retries exponentiels,
- alerting webhook en cas d'echec,
- lock anti-concurrence,
- heartbeat d'observabilite.

## Pré-requis

- repo deploye sur le serveur (ex: `/opt/praedixa`)
- acces ecriture:
  - `/opt/praedixa/data` (sources)
  - `/opt/praedixa/data-ready` (sorties)
- Python/uv installes

## Configuration

Fichier: `app-api/config/medallion/orchestrator.json`

Champs principaux:

- `poll_seconds`: frequence de cycle
- `max_retries`: nombre de retries apres echec
- `retry_base_seconds`, `retry_max_seconds`: backoff exponentiel
- `alert_webhook_url`: webhook ops (Slack/Teams/custom)
- `allow_reprocess`: desactive par defaut (anti backfill/leakage)

## Lancement manuel

Mode continu:

```bash
cd /opt/praedixa/app-api
uv run python -m scripts.medallion_orchestrator --config config/medallion/orchestrator.json
```

Mode one-shot (utile pour CI/maintenance):

```bash
cd /opt/praedixa/app-api
uv run python -m scripts.medallion_orchestrator --once --config config/medallion/orchestrator.json
```

## Déploiement systemd

Template fourni:

- `infra/systemd/praedixa-medallion.service`

Installation:

```bash
sudo cp infra/systemd/praedixa-medallion.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now praedixa-medallion.service
```

Verification:

```bash
systemctl status praedixa-medallion.service
journalctl -u praedixa-medallion.service -f
```

## Observabilité

- heartbeat: `data-ready/reports/orchestrator_heartbeat.json`
- state: `data-ready/.medallion_state.json`
- pipeline summary: `data-ready/reports/last_run_summary.json`
- silver quality: `data-ready/reports/silver_quality_report.json`

## Procédure incident

1. Verifier `orchestrator_heartbeat.json` (`status`, `message`, `attempts`).
2. Verifier logs systemd.
3. Verifier accessibilite des sources `data/`.
4. Verifier webhook d'alerting (URL, auth, reachability).
5. Corriger puis redemarrer:
   - `sudo systemctl restart praedixa-medallion.service`

## Sécurité / anti-leakage

- Pas de reprocess retroactif par defaut (`allow_reprocess=false`).
- Les fichiers retroactifs sont routes en quarantaine.
- Les transformations silver/gold restent point-in-time.
