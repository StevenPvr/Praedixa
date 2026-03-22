# Action Dispatch Detail

## Role

Cette route expose le detail d'un dispatch DecisionOps dans le workspace client.

## Contenu immediat

Fichiers :

- `page.tsx`
- `dispatch-controls.tsx`
- `action-dispatch-detail-view.tsx`
- `action-dispatch-detail-model.ts`
- `action-dispatch-detail-sections.tsx`
- `dispatch-control-ui.tsx`
- `dispatch-decision-panel.tsx`
- `dispatch-fallback-panel.tsx`
- `dispatch-fallback-model.ts`

## Notes runtime

- La page consomme `ADMIN_ENDPOINTS.orgActionDispatchDetail(orgId, actionId)`.
- Si l'admin a `admin:org:write` et les permission keys de write-back exigees par le dispatch, la page peut progresser le lifecycle persistant via `ADMIN_ENDPOINTS.orgActionDispatchDecision(orgId, actionId)`.
- Si l'admin a `admin:org:write` et les permission keys de write-back exigees par le dispatch, la page peut aussi piloter le fallback humain persistant via `ADMIN_ENDPOINTS.orgActionDispatchFallback(orgId, actionId)`.
- Si `actionId` est absent, la page doit echouer proprement sans lancer de fetch.
- La page standardise maintenant ses etats `loading/error/degraded` et ses sections vides avec le helper local `read-only-detail.tsx`.
- `page.tsx` ne garde plus que l'orchestration `params + loading/error`; les cartes runtime/detail sont isolees dans `action-dispatch-detail-view.tsx`.
- `page.tsx` extrait maintenant l'URL detail et le contenu principal dans des statements dedies, sans condition negatee fragile ni ternaires imbriques pour les etats de rendu.
- `action-dispatch-detail-model.ts` concentre maintenant les derives de lecture (`degraded`, metadata d'execution, permissions manquantes).
- Le formatter de capabilities elimine maintenant le prefixe `supports` sans `replace()` puis utilise `replaceAll()` pour les remplacements globaux, et les composants locaux exposent des contrats de props explicitement immuables (`Readonly`).
- `action-dispatch-detail-sections.tsx` porte maintenant les cartes runtime/detail/timeline/payload pour garder `action-dispatch-detail-view.tsx` en composition pure.
- `action-dispatch-detail-sections.tsx` evite maintenant le fragment JSX court et les couples texte-inline + `<span>` ambigus afin de rester lisible pour les analyseurs statiques stricts.
- Les panneaux de mutation dispatch/fallback sont separes en modules dedies et partagent seulement l'enveloppe UI minimale de `dispatch-control-ui.tsx`.
- `dispatch-control-ui.tsx` marque maintenant explicitement `MutationReadOnlyState` comme immutable, y compris quand il est reutilise comme props de composant.
- Les callbacks de mutation UI n'emploient plus l'operateur `void` dans les handlers JSX; ils declenchent maintenant les mutations via des blocs de callback simples.
- `dispatch-fallback-model.ts` porte maintenant la politique d'action fallback, le gating read-only et le hook de mutation pour garder `dispatch-fallback-panel.tsx` principalement presentationnel.
- Les transitions proposees doivent rester coherentes avec l'etat runtime (`pending`, `dispatched`, `failed`, `retried`) et ne jamais simuler un ack ou un retry impossible.
- Le fallback humain ne doit devenir actionnable qu'une fois le retry epuise ou explicitement bloque par la policy de destination.
- La page doit rester honnete sur les blocages de write-back: contrat qui interdit l'ecriture, ou permission keys de destination absentes dans le jeton admin courant.
- Tant que l'API cible reste fail-close sans persistance, la page doit afficher un etat d'erreur propre plutot qu'un faux statut de dispatch.
