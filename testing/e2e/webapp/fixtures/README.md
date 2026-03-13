# Fixtures E2E Webapp

Ce dossier regroupe les mocks et utilitaires Playwright spécifiques à `app-webapp`.

## Rôle

- émuler les réponses d'API attendues par les pages client ;
- isoler les tests E2E des dépendances backend instables ;
- injecter des datasets cohérents pour les vues de prévision et de décision.

## Règle

- `mockAllApis()` doit couvrir aussi les endpoints techniques appelés par les providers shell, comme `/api/v1/users/me/preferences`, sinon une page peut sembler cassée alors que c'est le bootstrap i18n qui manque en fixture.
