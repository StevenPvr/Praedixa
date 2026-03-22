# Runbook — Security Secret Rotation

## Objectif

Appliquer une rotation rapide, traçable et reproductible de tous les secrets critiques en cas de fuite probable ou confirmée.

## Scope

- Secrets OIDC (`AUTH_*`, JWKS issuer/audience config)
- Tokens internes services (`CONNECTORS_INTERNAL_TOKEN`, tokens inter-service)
- Clés webhook et signatures tierces
- Clés API externes (CRM/WFM/POS/TMS/DMS)

## Déclencheurs

- Secret trouvé dans un commit, log ou artifact
- Secret exposé dans une liste de process, un shell trace ou un `argv`
- Alerte scanner (gitleaks/trivy/secrets manager)
- Incident sécurité P0/P1
- Départ collaborateur avec accès secret

## Procédure

1. Qualification (<= 30 min)

- Identifier le secret, son owner, son périmètre et sa criticité.
- Ouvrir incident sécurité avec horodatage et assigner owner + reviewer.

2. Containment immédiat

- Révoquer/invalider l'ancien secret.
- Appliquer blocage compensatoire si nécessaire (WAF, endpoint pause, feature flag).
- Isoler les workloads impactés.

3. Rotation

- Générer un nouveau secret fort (minimum 32 chars pour tokens symétriques).
- Mettre à jour le secret manager et les variables d'environnement.
- Utiliser uniquement des scripts ou commandes qui lisent les secrets depuis l'environnement ou `stdin`, jamais via des flags CLI contenant leur valeur.
- Redéployer les services impactés.
- Vérifier les healthchecks applicatifs.

4. Validation

- Exécuter les tests sécurité ciblés.
- Vérifier l'absence d'erreurs auth 401/403 anormales post-rotation.
- Confirmer que l'ancien secret est inutilisable.

5. Clôture et preuves

- Archiver les preuves (ticket incident, commandes, logs de déploiement).
- Documenter root cause et actions préventives.
- Programmer un scan de confirmation sous 24h.

## SLA

- Critical : décision < 4h, rotation < 24h
- High : décision < 24h, rotation < 72h
- Medium : rotation < 14 jours

## Commandes de vérification recommandées

```bash
git log --all --source -- '*.env' '*.key' '*.pem' '*.secret'
gitleaks detect --no-banner --source . --redact
python3 scripts/validate-security-exceptions.py --quiet
./scripts/gates/gate-prepush-deep.sh
```

## Check-list minimale post-rotation

- Ancien secret révoqué
- Nouveau secret propagé sur tous les environnements concernés
- Services redémarrés et sains
- Audit trail incident complété
- Scan de contrôle exécuté
