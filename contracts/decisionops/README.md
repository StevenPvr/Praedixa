# contracts/decisionops

Primitives versionnees du coeur DecisionOps.

## Schemas V1

- `decision-contract.schema.json`: definition gouvernee d'une famille d'arbitrage.
- `decision-graph.schema.json`: couche semantique versionnee pour entites, relations, metriques et horizons.
- `approval.schema.json`: demande d'approbation resolue par matrice, role et justification structuree.
- `action-dispatch.schema.json`: trace de dry-run, dispatch, retries, acknowledgments et fallback humain.
- `ledger-entry.schema.json`: entree economique et operationnelle complete, avec baseline, recommande, reel et ROI.

## Principles de modelisation

- separation nette entre version de schema et version metier;
- statuts normalises sur le PRD/TODO (`draft/testing/approved/published/archived`, `requested/granted/rejected`, `dry_run/dispatched/acknowledged/failed/retried/canceled`, `open/measuring/closed/recalculated/disputed`);
- scope et horizon toujours explicites;
- aucun schema ici ne remplace le contrat public OpenAPI ni l'existant `decision-config`: il pose un socle plus large pour les primitives DecisionOps.

## Notes d'usage

- les payloads sont pack-agnostic, avec enums et structures suffisantes pour `coverage`, `flow` et `allocation`;
- les expressions de contrat ou ROI sont declaratives et doivent etre evaluees cote serveur dans un sous-ensemble sur;
- les champs libres restent limites aux payloads de dispatch et aux snapshots de mesures, ou la variabilite par pack est structurelle.
