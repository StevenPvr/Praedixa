# Politique runtime sandbox en production

## Objectif

Autoriser des comptes fournisseur `sandbox` ou `dev` dans un runtime Praedixa de production sans melanger les frontieres `production` / `sandbox`.

## Regles

- chaque connexion doit declarer un `runtimeEnvironment` explicite: `production` ou `sandbox`
- `production` utilise uniquement `CONNECTORS_ALLOWED_OUTBOUND_HOSTS`
- `sandbox` utilise uniquement `CONNECTORS_ALLOWED_SANDBOX_OUTBOUND_HOSTS`
- hors developpement, aucun endpoint `localhost`, IP privee, query string ou credentials embarques n'est autorise
- un host reserve a la sandbox ne peut pas etre reutilise par une connexion `production`
- `CONNECTORS_PUBLIC_BASE_URL` doit etre configure explicitement; aucun fallback `127.0.0.1` n'est tolere pour les URLs d'ingestion remises a un partenaire

## Checklist de configuration

1. versionner la liste des suffixes prod dans `CONNECTORS_ALLOWED_OUTBOUND_HOSTS`
2. versionner la liste des suffixes sandbox dans `CONNECTORS_ALLOWED_SANDBOX_OUTBOUND_HOSTS`
3. garder ces listes aussi specifiques que possible par vendor
4. enregistrer `runtimeEnvironment` au moment de la creation de connexion
5. verifier que les URLs OAuth, `baseUrl` et `testEndpoint` tombent dans la bonne allowlist

## Exemple Salesforce

- `runtimeEnvironment=production`
  - `CONNECTORS_ALLOWED_OUTBOUND_HOSTS=login.salesforce.com,my.salesforce.com`
- `runtimeEnvironment=sandbox`
  - `CONNECTORS_ALLOWED_SANDBOX_OUTBOUND_HOSTS=test.salesforce.com,sandbox.my.salesforce.com`

Avec cette separation:

- `https://acme.my.salesforce.com` reste une cible `production`
- `https://acme--uat.sandbox.my.salesforce.com` reste une cible `sandbox`
- les defaults OAuth catalogues suivent le meme environnement (`login.salesforce.com` vs `test.salesforce.com`)

## Notes d'implementation

- si un vendor n'a pas de domaine sandbox standard documente, ne pas inventer de fallback: utiliser le host exact fourni par le fournisseur ou le tenant client, puis l'ajouter explicitement a l'allowlist sandbox
- la documentation commerciale/client doit demander l'environnement voulu (`production` ou `sandbox`) des la phase de branchement
