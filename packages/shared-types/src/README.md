# shared-types/src

Source de verite des types partages Praedixa.

## Structure

- `api/` contient les shapes de requetes et reponses attendues cote front et BFF.
- `domain/` contient les modeles metier reutilises dans plusieurs apps.
- `utils/` contient les helpers de typage ou de manipulation de donnees partages.
- `__tests__/` couvre les invariants de types, transformations et helpers exposes.
- `index.ts` et les sous-exports organisent l'API publique du package.

## Quand ajouter un fichier ici

- Ajouter dans `domain/` si le type represente un concept metier transverse.
- Ajouter dans `api/` si le type sert d'enveloppe HTTP, de payload ou de contrat d'appel.
- Ajouter dans `utils/` seulement si le helper est purement partage et n'introduit pas de dependance applicative.

## Workflow recommande

```bash
pnpm --filter @praedixa/shared-types lint
pnpm --filter @praedixa/shared-types typecheck
pnpm --filter @praedixa/shared-types test
pnpm --filter @praedixa/shared-types build
```

## Points d'integration

- Les apps frontend importent ces types directement.
- `contracts/openapi/public.yaml` doit rester coherent avec les payloads exposes publiquement.
- `app-api-ts` et les tests dans `testing/` sont les premiers endroits a verifier apres un changement de contrat.
