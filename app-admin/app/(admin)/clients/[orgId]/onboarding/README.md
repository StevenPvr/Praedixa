# Onboarding

## Rôle

Ce dossier matérialise un segment de route Next.js. Les fichiers `page.tsx` définissent le rendu, le layout ou le handler HTTP de ce segment.

## Contenu immédiat

Sous-dossiers :

- `__tests__/`

Fichiers :

- `access-model-task-fields.tsx`
- `case-list-card.tsx`
- `case-workspace-card.tsx`
- `create-case-card.tsx`
- `page.tsx`
- `page-model.ts`
- `task-action-card.tsx`
- `__tests__/page.test.tsx`

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.

## Contrat runtime

- `page.tsx` lit maintenant le domaine persistant `onboarding_cases` au lieu du vieux suivi thin-slice `onboarding_states`.
- Le workspace appelle `GET/POST /api/v1/admin/organizations/:orgId/onboarding/cases`, `GET /api/v1/admin/organizations/:orgId/onboarding/cases/:caseId`, `POST /api/v1/admin/organizations/:orgId/onboarding/cases/:caseId/readiness/recompute`, `POST /api/v1/admin/organizations/:orgId/onboarding/cases/:caseId/cancel`, `POST /api/v1/admin/organizations/:orgId/onboarding/cases/:caseId/reopen`, `POST /api/v1/admin/organizations/:orgId/onboarding/cases/:caseId/tasks/:taskId/save` puis `POST /api/v1/admin/organizations/:orgId/onboarding/cases/:caseId/tasks/:taskId/complete`.
- Le detail rendu cote admin regroupe le case, ses taches, ses blockers et sa timeline d'evenements.
- Quand `POST /api/v1/admin/organizations/:orgId/onboarding/cases` echoue, le workspace affiche maintenant le message backend exact dans un toast plutot qu'un fallback generique.
- Chaque tache expose maintenant un vrai formulaire operateur avec brouillon, evidence et lien vers la surface admin reelle a utiliser (`equipe` ou `config`) quand le travail vit deja ailleurs dans le produit.
- L'etape `access-model` pilote maintenant de vraies invitations securisees via `POST /api/v1/admin/organizations/:orgId/users/invite`, puis persiste l'evidence d'envoi (`inviteRecipients`, `invitedAt`, `invitedUserId`, statuts `sent/failed`) dans le brouillon onboarding.
- Aucun mot de passe n'est expose cote admin dans ce flux: l'utilisateur client recoit un lien d'activation Keycloak et definit lui-meme son mot de passe.
- Le header du workspace expose aussi les commandes lifecycle `Recalculer`, `Annuler` et `Rouvrir`, pour operer un case dans la duree sans sortir du control plane onboarding.
- Les boutons `Completer` n'apparaissent que pour les taches actuellement actionnables cote Camunda; le front ne simule jamais une completion locale hors projection workflow.
- Le workspace ne charge plus `/users` pour un profil depourvu de `admin:users:*`; owner, sponsor et envoi d'invitations restent alors explicitement degradés au lieu de remplir la console avec des `403`.
- Quand le detail d'un case est relu alors que Camunda local est indisponible, l'API renvoie maintenant le bundle persistant avec un marqueur `metadataJson.projectionSync.status = "stale"` pour garder le workspace lisible sans `503` initial.
