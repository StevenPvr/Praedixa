# app-connectors

Service runtime dedie aux connecteurs data Praedixa.

## Scope

- Catalogue central des connecteurs (CRM/WFM/POS/DMS/TMS)
- Gestion des connexions par organisation
- Tests de connexion et runs de sync (squelette)
- Surface HTTP securisee par token interne

## Run local

```bash
pnpm --dir app-connectors dev
```

Variables:

- `PORT` (default `8100`)
- `NODE_ENV` (`development|staging|production`)
- `CONNECTORS_INTERNAL_TOKEN` (obligatoire en staging/prod, min 32 chars)
- `CORS_ORIGINS` (CSV d'origines)
