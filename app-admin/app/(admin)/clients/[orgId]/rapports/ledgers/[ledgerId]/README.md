# Ledger Detail

## Role

Cette route expose la lecture read-only d'un ledger DecisionOps pour un workspace client.

## Contenu immediat

Fichiers :

- `page.tsx`

## Notes runtime

- La page consomme `ADMIN_ENDPOINTS.orgLedgerDetail(orgId, ledgerId)`.
- La revision peut etre demandee par query string.
- Si `ledgerId` est absent, la page doit echouer proprement sans lancer de fetch.
- La page standardise maintenant ses etats `loading/error/degraded` et ses sections vides avec le helper local `read-only-detail.tsx`.
- Tant que l'API cible reste fail-close sans persistance, la page doit rester honnete sur l'indisponibilite runtime.
