# telemetry/src

Source runtime de la fondation telemetry partagee.

## Structure

- `correlation.ts` normalise les identifiants de correlation, les headers HTTP (`X-Request-ID`, `traceparent`, `tracestate`, `X-Run-ID`, `X-Connector-Run-ID`) et les enrichissements incrementaux.
- `logger.ts` construit et ecrit les envelopes JSON standardisees.
- `index.ts` expose l'API publique du package.
- `__tests__/` couvre les invariants de correlation et de serialisation.

## Contraintes

- aucune dependance a un framework de logs ou de traces;
- pas d'hypothese Node-only dans les helpers purs;
- les champs obligatoires du socle observabilite restent presents, a `null` quand absents.
