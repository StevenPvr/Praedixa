# Action Dispatch Detail

## Role

Cette route expose le detail d'un dispatch DecisionOps dans le workspace client.

## Contenu immediat

Fichiers :

- `page.tsx`
- `dispatch-controls.tsx`
- `action-dispatch-detail-view.tsx`
- `dispatch-control-ui.tsx`
- `dispatch-decision-panel.tsx`
- `dispatch-fallback-panel.tsx`

## Notes runtime

- La page consomme `ADMIN_ENDPOINTS.orgActionDispatchDetail(orgId, actionId)`.
- Si l'admin a `admin:org:write` et les permission keys de write-back exigees par le dispatch, la page peut progresser le lifecycle persistant via `ADMIN_ENDPOINTS.orgActionDispatchDecision(orgId, actionId)`.
- Si l'admin a `admin:org:write` et les permission keys de write-back exigees par le dispatch, la page peut aussi piloter le fallback humain persistant via `ADMIN_ENDPOINTS.orgActionDispatchFallback(orgId, actionId)`.
- Si `actionId` est absent, la page doit echouer proprement sans lancer de fetch.
- La page standardise maintenant ses etats `loading/error/degraded` et ses sections vides avec le helper local `read-only-detail.tsx`.
- `page.tsx` ne garde plus que l'orchestration `params + loading/error`; les cartes runtime/detail sont isolees dans `action-dispatch-detail-view.tsx`.
- Les panneaux de mutation dispatch/fallback sont separes en modules dedies et partagent seulement l'enveloppe UI minimale de `dispatch-control-ui.tsx`.
- Les transitions proposees doivent rester coherentes avec l'etat runtime (`pending`, `dispatched`, `failed`, `retried`) et ne jamais simuler un ack ou un retry impossible.
- Le fallback humain ne doit devenir actionnable qu'une fois le retry epuise ou explicitement bloque par la policy de destination.
- La page doit rester honnete sur les blocages de write-back: contrat qui interdit l'ecriture, ou permission keys de destination absentes dans le jeton admin courant.
- Tant que l'API cible reste fail-close sans persistance, la page doit afficher un etat d'erreur propre plutot qu'un faux statut de dispatch.
