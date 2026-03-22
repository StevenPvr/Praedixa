# Approval Inbox

## Role

Cette route expose l'inbox d'approbation DecisionOps d'un workspace client, avec decision persistante `approve/reject` sur chaque demande.

## Contenu immediat

Fichiers :

- `approval-decision-panel.tsx`
- `approvals-sections.tsx`
- `page-model.ts`
- `page.tsx`

## Notes runtime

- La page consomme `ADMIN_ENDPOINTS.orgApprovalsInbox(orgId)`.
- La page consomme aussi `ADMIN_ENDPOINTS.orgApprovalDecision(orgId, approvalId)` pour persister les decisions d'approbation admin.
- `page.tsx` orchestre maintenant surtout les etats de haut niveau; les derivees runtime vivent dans `page-model.ts` et les gros blocs de rendu dans `approvals-sections.tsx`.
- `page.tsx` extrait maintenant les champs utilises du `page-model` dans des constantes locales avant rendu, ce qui garde les branches de retour plus lisibles et evite les faux reperes d'analyse statique sur les props JSX.
- `approval-decision-panel.tsx` porte l'etat local de commentaire, la validation de justification et la mutation `approve/reject` par item.
- Les composants locaux `approvals` recoivent maintenant leurs props via `props: Readonly<Props>` avant destructuration, ce qui garde le contrat immuable et evite les faux positifs Sonar sur les blocs JSX.
- La page standardise maintenant ses etats `loading/error/empty/degraded` avec le helper local `read-only-detail.tsx`.
- L'inbox peut maintenant approuver ou rejeter une demande avec justification inline et refetch apres mutation.
- La lecture de l'inbox reste accessible en `admin:org:read`, mais les actions `approve/reject` restent masquees sans `admin:org:write`.
- La page ne doit toujours pas simuler un dispatch externe: la decision d'approbation synchronise l'etat interne approval/action/ledger, mais le write-back runtime complet reste un chantier distinct.
