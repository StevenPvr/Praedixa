# Messages

## Rôle

Ce dossier matérialise un segment de route Next.js. Les fichiers `page.tsx` définissent le rendu, le layout ou le handler HTTP de ce segment.

## Contenu immédiat

Sous-dossiers :

- `__tests__`

Fichiers :

- `page.tsx`

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.

## Contrat runtime

- `page.tsx` porte maintenant l'unique source de verite des conversations du workspace message: la liste et le thread lisent la meme requete pollée `orgConversations`.
- `components/chat/conversation-list.tsx` est purement presentational pour cette surface; il filtre et selectionne a partir des conversations deja resolues par la page, sans relancer un fetch concurrent.
- Quand `messagesWorkspace` reste desactive, `page.tsx` reste fail-close et n'emet aucun appel conversations pour ce segment.
