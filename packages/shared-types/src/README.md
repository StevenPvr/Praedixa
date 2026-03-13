# shared-types/src

Source de verite des types partages Praedixa.

## Structure

- `api/` contient les shapes de requetes et reponses attendues cote front et BFF.
- `api/public-contract.ts` reste le point d'entree du manifeste public partage; les sous-modules `api/public-contract/*` gardent ce contrat decoupe par responsabilite pour rester dans les guardrails du socle.
- `api/requests.ts` porte les payloads write publics nommes, reutilises a la fois par la spec OpenAPI et par le registre type partage.
- `api/approval-decision.ts` porte le contrat interne admin pour une decision d'approbation persistante (`granted` / `rejected`) et son retour de synchronisation runtime.
- `domain/` contient les modeles metier reutilises dans plusieurs apps.
- `utils/` contient les helpers de typage ou de manipulation de donnees partages.
- `__tests__/` couvre les invariants de types, transformations et helpers exposes.
- `index.ts` et les sous-exports organisent l'API publique du package.
- Les points d'entree runtime (`index.ts`, `api-client.ts`, `api.ts`, `domain.ts`, `public-contract-node.ts`) doivent garder des imports/exports relatifs suffixes en `.js` pour que `dist/` reste executable dans un builder ESM propre.

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
- Le parseur structurel de la spec publique vit dans `api/public-contract/openapi-node.ts` et reste reserve aux checks Node; il ne doit pas fuiter dans les bundles browser.
- Ce helper Node met en cache le parse de `contracts/openapi/public.yaml` a l'echelle du processus pour que les suites de contrat et les gates coverage restent deterministes sans relire la spec a chaque assertion.
- `app-api-ts` et les tests dans `testing/` sont les premiers endroits a verifier apres un changement de contrat.
- `OperationalDecisionCreateRequest` est le contrat canonique de soumission runtime (`alertId`, `optionId`, `notes?`) ; aucun front ne doit reconstruire un payload legacy derive du workspace.
- `ApprovalDecisionRequest` et `ApprovalDecisionResponse` gardent la decision admin d'approbation et le retour runtime synchronises entre `app-admin` et `app-api-ts`.
