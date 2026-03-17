# Deployment Request

## Rôle

Ce dossier fait partie du périmètre `app-landing` et regroupe des fichiers liés au parcours de demande de déploiement.

## Contenu immédiat

Sous-dossiers :

- `__tests__`

Fichiers :

- `constants.ts`
- `email.ts`
- `rate-limit.ts`
- `validation.ts`

## Intégration

Ce dossier est consommé par l'application `app-landing` et s'insère dans son flux runtime, build ou test.
`validation.ts` partage maintenant la meme validation semantique d'email que `/contact` et le call de cadrage via `lib/security/email-address.ts`, pour refuser les adresses placeholder ou jetables avant envoi.
