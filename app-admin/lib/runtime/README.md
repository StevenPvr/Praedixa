# Runtime

## Role

Ce dossier centralise les garde-fous runtime purement admin qui evitent de monter des surfaces locales dans un etat trompeur.

## Fichiers

- `admin-workspace-feature-gates.ts` :
  - coupe explicitement les workspaces admin encore non industrialises (`previsions`, `messages`) pour ne pas lancer de fetchs garantis en `503`;
  - gere aussi des gates plus fines par surface: dans `donnees`, seul `ingestion-log` est rouvert quand sa route persistante existe, tandis que `datasets` et `medallion-quality-report` restent fail-close tant que leurs endpoints ne sont pas industrialises;
  - garde aussi les integrations client fail-close en developpement local tant que `NEXT_PUBLIC_ADMIN_INTEGRATIONS_WORKSPACE=1` n'est pas pose et que le runtime connecteurs n'est pas configure.

## Integration

Ces garde-fous sont consommes par les pages `app/(admin)/clients/[orgId]/*` afin que le front rende un message explicite avant le premier appel reseau, au lieu de remplir la console avec des erreurs attendues.
