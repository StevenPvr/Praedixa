# Config

## Rôle

Ce dossier fait partie du périmètre `app-landing` et regroupe des fichiers liés à config.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `site.ts`

## Intégration

Ce dossier est consommé par l'application `app-landing` et s'insère dans son flux runtime, build ou test.

## Règles utiles

- `site.ts` est une petite source de vérité publique: contact, marque et contexte d'hébergement qui irriguent les emails, la sécurité d'origine et certains contrôles SEO.
- Si l'infrastructure publique change, réaligner `site.ts` dans la même passe que les pages légales pour éviter de laisser survivre un ancien fournisseur dans le SEO ou les emails.
