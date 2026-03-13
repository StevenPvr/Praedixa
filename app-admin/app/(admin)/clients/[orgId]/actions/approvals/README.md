# Approval Inbox

## Role

Cette route expose l'inbox d'approbation DecisionOps d'un workspace client, avec decision persistante `approve/reject` sur chaque demande.

## Contenu immediat

Fichiers :

- `page.tsx`

## Notes runtime

- La page consomme `ADMIN_ENDPOINTS.orgApprovalsInbox(orgId)`.
- La page consomme aussi `ADMIN_ENDPOINTS.orgApprovalDecision(orgId, approvalId)` pour persister les decisions d'approbation admin.
- La page standardise maintenant ses etats `loading/error/empty/degraded` avec le helper local `read-only-detail.tsx`.
- L'inbox peut maintenant approuver ou rejeter une demande avec justification inline et refetch apres mutation.
- La lecture de l'inbox reste accessible en `admin:org:read`, mais les actions `approve/reject` restent masquees sans `admin:org:write`.
- La page ne doit toujours pas simuler un dispatch externe: la decision d'approbation synchronise l'etat interne approval/action/ledger, mais le write-back runtime complet reste un chantier distinct.
