# Mocks Frontend Partagés

Ce dossier contient les mocks réutilisables dans les tests Vitest.

## Exemples

- primitives Next.js ;
- `framer-motion` ;
- composants UI ;
- observers navigateur.

## Règle

- ajouter ici un mock seulement s'il sert à plusieurs zones du repo ou s'il encode une convention transversale de test.
- quand un composant partagé importe une nouvelle icône `lucide-react`, mettre à jour `icons.ts` dans la même passe pour que les suites qui utilisent le mock global ne dérivent pas.
