# Limites et Risque Résiduel

## Portée

Ce document décrit les limites structurelles du dispositif de hooks/gates sécurité.

## Limites connues

1. Les 0-day inconnues ne sont pas détectables automatiquement.
2. Les scanners SAST/SCA peuvent produire des faux positifs/faux négatifs.
3. Les vulnérabilités de logique métier exigent des tests d'abus ciblés et des revues humaines.
4. Les outils supply-chain couvrent des signaux connus, pas l'intégralité du risque de compromission amont.

## Risque résiduel

- Risque résiduel non nul même avec contrôles bloquants multi-couches.
- Réduction du risque par défense en profondeur, pas élimination complète.

## Cadre de scoring du risque

- Likelihood: 1 (rare) à 5 (presque certain)
- Impact: 1 (minimal) à 5 (catastrophique)
- Score = Likelihood x Impact
- Bandes:
  - Critical: 15-25 (action immédiate)
  - High: 10-14 (action < 30 jours)
  - Medium: 5-9 (action < 90 jours)
  - Low: 1-4 (suivi et acceptation possible)

## Traitement par type de limite

1. 0-day inconnues

- Limite: non détectables de façon exhaustive par scanners.
- Réponse: veille CVE active, triage quotidien, virtual patch (WAF/règles), tabletop mensuel.

2. Faux positifs/faux négatifs SAST/SCA

- Limite: couverture imparfaite et bruit opérationnel.
- Réponse: calibration hebdomadaire des règles, validation humaine, corrélation multi-signaux.

3. Vulnérabilités de logique métier

- Limite: faible détectabilité automatique.
- Réponse: abuse-case review obligatoire, tests d’abus ciblés, pentest trimestriel orienté métier.

4. Compromission supply-chain amont

- Limite: les outils détectent surtout des signaux connus.
- Réponse: SBOM systématique, vérification intégrité/provenance, scoring des fournisseurs.

## Stratégie de réponse rapide

1. Détection

- pré-commit / pre-push / exhaustive gate
- artefacts signés et auditables

2. Classification

- `Critical/High/Medium`: blocage immédiat
- `Low`: ticket + SLA interne + preuve de suivi

3. Remédiation

- correction prioritaire avant push/merge/release
- vérification obligatoire via re-run du gate

4. Gouvernance

- décision traçable dans runbooks/policies
- preuve locale signée comme source de vérité

## SLA opérationnels

- Critical: décision < 4h, correctif ou contrôle compensatoire < 24h.
- High: décision < 1 jour ouvré, remédiation < 72h.
- Medium: remédiation < 14 jours.
- Low: remédiation < 90 jours avec owner, reviewer et preuve.

## Règles d’acceptation du risque résiduel

- Acceptation uniquement si correction immédiate non faisable.
- Durée maximale d’acceptation: 90 jours.
- Owner nominatif + reviewer nominatif (distinct de l’owner).
- Contrôles compensatoires documentés et vérifiables.
- Approbation traçable (Security Lead + CTO pour risques élevés).
- Réévaluation obligatoire avant expiration.
