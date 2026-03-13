# Action Dispatch Detail

## Role

Cette route expose le detail read-only d'un dispatch DecisionOps dans le workspace client.

## Contenu immediat

Fichiers :

- `page.tsx`

## Notes runtime

- La page consomme `ADMIN_ENDPOINTS.orgActionDispatchDetail(orgId, actionId)`.
- Si `actionId` est absent, la page doit echouer proprement sans lancer de fetch.
- La page standardise maintenant ses etats `loading/error/degraded` et ses sections vides avec le helper local `read-only-detail.tsx`.
- Tant que l'API cible reste fail-close sans persistance, la page doit afficher un etat d'erreur propre plutot qu'un faux statut de dispatch.
