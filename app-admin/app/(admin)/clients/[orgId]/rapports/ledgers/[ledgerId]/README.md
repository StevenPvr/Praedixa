# Ledger Detail

## Role

Cette route expose la lecture et les decisions finance-grade d'un ledger DecisionOps pour un workspace client.

## Contenu immediat

Fichiers :

- `page.tsx`
- `ledger-panels.tsx`
- `ledger-panel-sections.tsx`

## Notes runtime

- La page consomme `ADMIN_ENDPOINTS.orgLedgerDetail(orgId, ledgerId)`.
- Si l'admin a `admin:org:write`, la page peut aussi piloter `ADMIN_ENDPOINTS.orgLedgerDecision(orgId, ledgerId)` pour valider, clore ou recalculer une revision quand le runtime le permet.
- La revision peut etre demandee par query string.
- Si `ledgerId` est absent, la page doit echouer proprement sans lancer de fetch.
- La page standardise maintenant ses etats `loading/error/degraded` et ses sections vides avec le helper local `read-only-detail.tsx`.
- `ledger-panels.tsx` garde la logique locale de mutation et les derivees de decision; `ledger-panel-sections.tsx` porte les sous-sections presentationnelles du panneau de decision et des snapshots.
- La vue doit garder visibles `baseline`, `recommended` et `actual`, sans melanger la lecture des snapshots et la validation finance.
- Tant que l'API cible reste fail-close sans persistance, la page doit rester honnete sur l'indisponibilite runtime.
- Le dossier suit maintenant les memes conventions Sonar que les autres surfaces admin: props explicites en `Readonly<...>`, labels relies a leurs controles, handlers async relies sans wrapper `void`, textes inline JSX rendus plus explicites autour des `span`, et derivees conditionnelles sorties dans des variables dediees.
