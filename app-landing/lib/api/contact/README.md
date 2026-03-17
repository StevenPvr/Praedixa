# Contact

## Rôle

Ce dossier fait partie du périmètre `app-landing` et regroupe des fichiers liés à contact.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `email.ts`
- `persistence.ts`
- `validation.ts`

## Intégration

Ce dossier est consommé par l'application `app-landing` et s'insère dans son flux runtime, build ou test.

## Contrat courant

Le payload public attend maintenant une intention explicite (`deployment` ou `historical_proof`) et des champs de qualification metier (`siteCount`, `sector`, `mainTradeOff`, `timeline`, `currentStack` optionnel).
`validation.ts` reste la source de verite du schema, `email.ts` transforme ces champs en resume lisible pour l'equipe, et `persistence.ts` mappe l'intention vers le contrat d'ingestion historique sans perdre les nouveaux champs, qui restent stockes dans `metadataJson`.
L'adresse email est maintenant validee semantiquement via `lib/security/email-address.ts`; un placeholder comme `example.com`, un domaine jetable ou un local-part `noreply/test` doit etre refuse avant l'envoi.

## Contraintes de securite

- `persistence.ts` ne doit envoyer les demandes qu'a une URL d'ingestion HTTPS explicitement allowlistée via `CONTACT_API_ALLOWED_HOSTS` en production.
- Les metadonnees persistées doivent rester minimales: pas de `x-forwarded-for` brut, pas de `referer` avec query string, pas de donnee reseau non fiable recopidee telle quelle.
- `email.ts` ne doit pas diffuser d'IP brute ou d'autre donnee reseau sensible au-dela du besoin operationnel strict.
