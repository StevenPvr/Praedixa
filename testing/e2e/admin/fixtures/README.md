# Fixtures E2E Admin

Ce dossier regroupe les mocks et helpers propres aux scénarios Playwright admin.

## Rôle

- stabiliser les parcours sans dépendre d'un backend live ;
- injecter des réponses cohérentes avec les permissions et l'état workspace attendus.

## Règle

- `api-mocks.ts` porte la source de vérité des jeux de données partagés (`organizations`, `audit`, `onboarding`, `cost params`) ; `api-mocks-v2.ts` ne doit réutiliser que des exports réels de ce module au lieu de redéclarer ou d'importer des symboles fantômes.
- `auth.ts` doit injecter un jeu de permissions explicite aligné sur la taxonomie admin versionnée; ne pas supposer qu'un `super_admin` E2E recupere des droits implicites.
