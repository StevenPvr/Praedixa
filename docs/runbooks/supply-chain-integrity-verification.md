# Runbook - Supply-Chain Integrity Verification

## Objectif

Vérifier l'intégrité et la provenance des composants logiciels avant merge/release.

## Contrôles obligatoires

- SBOM généré pour build release candidate
- Scan vulnérabilités dépendances et images
- Vérification signatures/hashes d'artefacts
- Vérification exceptions sécurité (si `Low` uniquement)

## Procédure standard

1. Génération des artefacts supply-chain

- Exécuter l'audit supply-chain local (`scripts/run-supply-chain-audit.sh`).
- Conserver SBOM et résultats de scan dans les preuves.

2. Validation de l'intégrité

- Vérifier que les artefacts attendus correspondent aux checksums/signatures.
- Rejeter tout artefact non vérifiable.

3. Triage vulnérabilités

- `Critical/High/Medium`: blocage immédiat.
- `Low`: ticket, owner, reviewer, evidence, expiration.

4. Décision release

- Autoriser uniquement si tous les contrôles sont `pass`.
- En cas d'acceptation résiduelle, inscrire dans le log dédié avec date d'expiration.

## Cadence

- À chaque release candidate
- Revue hebdomadaire des findings ouverts
- Revue mensuelle des dépendances critiques

## Évidences minimales

- Lien vers rapport de scan
- Lien vers SBOM
- Décision triage signée owner/reviewer
- Preuve de re-run du gate après correction
