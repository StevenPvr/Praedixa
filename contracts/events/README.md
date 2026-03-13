# contracts/events

Schemas versionnes des evenements metier internes et des webhooks sortants.

## Fichier principal

- `event-envelope.schema.json` definit l'enveloppe canonique V1 et les payloads minimaux des evenements prioritaires du PRD/TODO.

## Evenements couverts en V1

- `scenario.completed`
- `approval.requested`
- `action.failed`
- `ledger.closed`
- `dataset.freshness.breached`

L'enveloppe couvre aussi les autres evenements transverses deja cites dans le PRD pour eviter de multiplier les shapes des les premiers branchements.

## Conventions

- `schema_version` versionne l'enveloppe;
- `payload_version` versionne le payload metier transporte;
- `event_type` porte le nom canonique de l'evenement;
- les champs de correlation (`correlation_id`, `causation_id`, `trace_id`) servent a relier scenario, approval, dispatch et ledger.

## Compatibilite

- dans un meme major, les payloads evoluent de facon additive;
- un changement cassant ouvre un nouveau major de payload et doit etre coordonne avec les consommateurs.
