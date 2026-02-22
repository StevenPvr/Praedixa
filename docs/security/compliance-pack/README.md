# Compliance Pack (Lean) - Praedixa

Objectif: fournir un socle documentaire minimal, exploitable par une equipe de 2-3 cofondateurs, pour preparer:

- SOC 2 Type I/II (US enterprise)
- ISO/IEC 27001 (EU enterprise)

Ce pack est adapte au contexte produit Praedixa:

- SaaS B2B operations multi-sites
- donnees operationnelles agregees (capacite, charge, absences)
- due diligence clients avec exigences securite et conformite

## Decision strategique de reference

Politique cible production:

- 100% serveurs France
- 100% donnees production en France (stockage, traitement, logs, sauvegardes, exports)
- aucun transfert hors France sans validation contractuelle/juridique explicite

## Contenu

1. `01-scope-and-isms.md`
2. `02-roles-and-raci.md`
3. `03-risk-register-template.md`
4. `04-control-matrix-minimum.md`
5. `05-asset-inventory-template.md`
6. `06-vendor-subprocessor-register.md`
7. `07-access-review-log-template.md`
8. `08-change-management-log-template.md`
9. `09-incident-register-template.md`
10. `10-bcp-dr-test-template.md`
11. `11-evidence-index-template.md`
12. `12-customer-trust-pack-template.md`
13. `13-residual-risk-acceptance-log.md`
14. `14-threat-intel-and-cve-log.md`
15. `15-abuse-case-review-template.md`
16. `policies/*.md`

## Mode d'emploi (cadence minimale)

- Hebdomadaire:
  - mise a jour `08-change-management-log-template.md`
  - revue findings critiques (CI, scanner, incidents)
  - revue `13-residual-risk-acceptance-log.md` (expirations et revalidations)
- Mensuelle:
  - revue d'acces et completion `07-access-review-log-template.md`
  - mise a jour registre des risques `03-risk-register-template.md`
  - revue du threat log `14-threat-intel-and-cve-log.md`
  - ajout des preuves dans `11-evidence-index-template.md`
- Trimestrielle:
  - test incident + post-mortem (`09`)
  - exercice restore backup (`10`)
  - revue fournisseurs (`06`)
  - revue abuse-cases sensibles (`15`)
  - revue policies (`policies/*.md`)

## Definition of Done "audit-ready"

- Tous les templates ont un owner et une date de derniere revue.
- Les 90 derniers jours ont des preuves liees dans `11-evidence-index-template.md`.
- Les risques critiques ont une mitigation datee.
- Les revues d'acces sont signees.
- Au moins un test incident et un test restore backup sont documentes.
- Les preuves de residence France sont disponibles et datees.

## Notes importantes

- Ce pack ne "donne" pas une certification a lui seul.
- Il sert a rendre vos controles auditables et repetables.
- Commencer simple est recommande; augmenter le niveau ensuite.
