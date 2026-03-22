# Skeletons

## Rôle

Ce sous-dossier contient une famille spécialisée de composants rattachée à `app-admin`.

## Contenu immédiat

Sous-dossiers :

- `__tests__`

Fichiers :

- `skeleton-admin-dashboard.tsx`
- `skeleton-org-list.tsx`

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.

## Conventions locales

- les wrappers de chargement utilisent maintenant `<output aria-busy=\"true\">` plutot que `role=\"status\"`, pour rester alignes avec l'accessibilite attendue par Sonar.
