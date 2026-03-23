# Gouvernance

Ce dossier regroupe les regles de livraison qui protègent le socle build-ready du monorepo.

## Ce qu'on y trouve

- le verdict machine-readable `build-ready-status.json`, qui dit explicitement si le repo est `Go` ou `No-Go` et pourquoi ;
- politique de feature flags, deprecation et compatibilite ;
- checklist pratique pour ajouter une feature sans rouvrir un chantier structurel.

## Quand l'utiliser

- avant d'ouvrir une nouvelle feature transverse ;
- avant de declarer le monorepo `Go` ou de contester un `No-Go` ;
- avant de faire evoluer un contrat partage ;
- avant de brancher une nouvelle surface UI, API, connector ou pipeline ;
- avant de supprimer une route, un payload ou une doc encore references.
