# @praedixa/telemetry

Fondation runtime legere pour les logs structures et les champs de correlation partages entre services Node et BFF Next.

## Objectif

- unifier l'enveloppe des evenements telemetry sans imposer de framework externe;
- garder les champs de correlation critiques presents avec `null` quand ils ne s'appliquent pas;
- permettre a chaque runtime de garder son propre sink (`stdout`, `stderr`, `console`, buffer de test).

## Surface publique

- `createTelemetryCorrelation` : normalise `request_id`, `trace_id` et les identifiants metier associes.
- `mergeTelemetryCorrelation` : enrichit un contexte sans perdre les champs deja connus.
- `resolveTelemetryRequestHeaders` : normalise `X-Request-ID`, `traceparent` et `tracestate`, puis regenere un `traceparent` valide si le contexte entrant est absent ou invalide.
- `buildTelemetryHeaderMap` : produit les headers HTTP a repropager ou a reemettre dans une reponse, y compris `X-Run-ID` et `X-Connector-Run-ID` quand ils sont connus.
- `createTraceparent` / `parseTraceparent` : primitives W3C minimales pour garder un `trace_id` stable d'un hop a l'autre.
- `buildTelemetryEvent` : construit l'enveloppe JSON standard.
- `createTelemetryLogger` : ecrit un evenement via un writer injecte.

## Commandes

```bash
pnpm --filter @praedixa/telemetry lint
pnpm --filter @praedixa/telemetry typecheck
pnpm --filter @praedixa/telemetry test
pnpm --filter @praedixa/telemetry build
```
