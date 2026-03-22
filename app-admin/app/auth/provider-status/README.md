# Provider Status

## Rôle

Expose un health-check JSON no-store du provider OIDC admin pour permettre à l'écran `/login` de distinguer une panne active d'une erreur stale déjà présente dans l'URL.

## Contrat

- `GET /auth/provider-status`
- `200 { healthy: true }` quand la discovery OIDC de confiance réussit
- `503 { healthy: false, code: "oidc_config_missing" | "oidc_provider_untrusted" }` sinon

## Intégration

Ce handler reste purement opérationnel: il ne crée pas de session et ne remplace pas `/auth/login`; il sert uniquement à réconcilier l'UI login avec l'état réel du provider avant un nouveau retry.
