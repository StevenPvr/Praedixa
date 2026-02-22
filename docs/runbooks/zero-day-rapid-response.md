# Runbook - Zero-Day Rapid Response

## Objectif

Réduire le temps entre détection d'une menace 0-day et mitigation effective en production.

## Déclencheurs

- Advisory éditeur critique
- CVE avec exploitation active
- Signal CERT/ANSSI/ISAC ou renseignement tiers fiable
- Comportement anormal indiquant un exploit inconnu

## Procédure

1. Triage initial (<= 30 min)

- Confirmer l'exposition (asset/dépendance/version).
- Classer l'incident (`P0` ou `P1`) selon impact potentiel.
- Assigner owner technique + reviewer sécurité.

2. Confinement rapide (<= 4h pour Critical)

- Appliquer contrôle compensatoire: WAF, blocage endpoint, désactivation feature, segmentation.
- Journaliser la décision et lier l'évidence (log, ticket, commit, règle appliquée).

3. Correction durable

- Déployer patch vendor ou upgrade composant dès disponibilité.
- Vérifier la correction via gate local + test ciblé + monitoring.

4. Clôture

- Mettre à jour registre incident + risk register + threat intel log.
- Capturer actions préventives pour éviter récurrence.

## SLA cibles

- Critical: décision < 4h, mitigation compensatoire < 24h.
- High: décision < 1 jour ouvré, mitigation < 72h.

## Évidences minimales

- Source advisory/CVE
- Analyse d'exposition
- Contrôle compensatoire appliqué
- Validation post-remédiation
- Horodatage complet détection -> containment -> recovery
